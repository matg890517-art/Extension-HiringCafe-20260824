export type JobResult = {
  ok: boolean;
  error?: string;
  title?: string;
  company?: string;
  logo?: string;
  companyLink?: string;
  location?: string;
  salary?: string;
  employmentType?: string;
  workplaceType?: string;
  postedAgo?: string;
  tags?: string[];
  skills?: string[];
  companyTags?: string[];
  applicantsCount?: number;
  applicantsText?: string;
  apply_url?: string;
  description?: string;
  id?: string;
};

export default function readDrawer(): JobResult {
  const dialog = document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  let drawer: Element | null = dialog;
  if (!drawer) {
    const onJobPage = window.location.pathname.startsWith('/job/');
    const hasProse = Boolean(document.querySelector('article.prose'));
    if (onJobPage || hasProse) drawer = document.body;
  }
  if (!drawer) return { ok: false, error: 'no drawer' };
  if (!drawer.querySelector('h1') && !drawer.querySelector('article.prose')) {
    return { ok: false, error: 'no drawer' };
  }

  const absUrl = (raw: string, base?: string): string => {
    if (!raw) return '';
    try {
      return new URL(raw, base || window.location.origin).href;
    } catch {
      return raw;
    }
  };

  const norm = (el: Element | null | undefined): string =>
    (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

  const title = drawer.querySelector('h1')?.textContent?.trim() ?? '';
  let companyNameEl: Element | null = drawer.querySelector(
    'h1 + div span.text-xl.font-semibold',
  );
  if (!companyNameEl) {
    const sib = drawer.querySelector('h1')?.nextElementSibling;
    if (sib) {
      const inner =
        sib.querySelector('span.text-xl.font-semibold, span.text-xl, span.font-semibold') ??
        sib;
      const t = norm(inner);
      if (t && t.length < 80 && !/^posted\s+/i.test(t)) companyNameEl = inner;
    }
  }
  const company = (companyNameEl?.textContent ?? '').replace(/^@\s*/, '').trim();

  const headerRoot =
    drawer.querySelector('[data-testid="drawer-header-bar"]') ??
    drawer.querySelector('h1')?.parentElement ??
    drawer;

  let logo = '';
  const considerImg = (img: Element) => {
    if (logo) return;
    if (!(img instanceof HTMLImageElement)) return;
    const srcsetFirst = (img.getAttribute('srcset') || img.srcset || '')
      .split(',')[0]
      ?.trim()
      .split(/\s+/)[0] ?? '';
    const attrSrc = img.getAttribute('src') || img.src || '';
    const raw = img.currentSrc || attrSrc || srcsetFirst;
    if (!raw) return;
    if (/^data:image\/svg/i.test(raw)) return;
    if (raw.startsWith('data:') && raw.length < 400) return;
    const w =
      Number(img.getAttribute('width')) || img.width || img.naturalWidth || 0;
    const h =
      Number(img.getAttribute('height')) || img.height || img.naturalHeight || 0;
    if ((w > 0 && w < 20) || (h > 0 && h < 20)) return;
    const meta = `${img.className} ${img.alt ?? ''} ${raw}`;
    const isGoogleFavicon = /s2\.googleusercontent\.com\/s2\/favicons/i.test(meta);
    const isLogoish = /logo|company/i.test(`${img.className} ${img.alt ?? ''}`);
    if (
      !isGoogleFavicon &&
      !isLogoish &&
      /\b(icon|sprite|emoji)\b/i.test(meta) &&
      !/logo/i.test(meta)
    ) {
      return;
    }
    logo = absUrl(raw);
    if (!logo || logo === window.location.href) logo = absUrl(srcsetFirst);
  };
  const logoNear =
    drawer.querySelector('h1')?.parentElement?.parentElement ??
    companyNameEl?.parentElement ??
    headerRoot;
  for (const img of logoNear.querySelectorAll('img')) considerImg(img);
  if (!logo) {
    for (const img of headerRoot.querySelectorAll('img')) considerImg(img);
  }
  if (!logo) {
    for (const img of drawer.querySelectorAll('img')) considerImg(img);
  }

  let companyLink = '';
  let orgFallback = '';
  const considerCompanyAnchor = (a: Element) => {
    const href = a.getAttribute('href')?.trim() ?? '';
    if (!href || href === '#' || /^(javascript:|mailto:)/i.test(href)) return;
    const text = norm(a);
    if (/\bapply\b/i.test(text) || /\bapply\b/i.test(href)) return;
    const resolved = absUrl(href, 'https://hiringcafe.com');
    if (/\/job\//i.test(resolved) || /\/ai-search/i.test(resolved)) return;
    if (/\/org\//i.test(href) || /hiringcafe\.com\/org\//i.test(resolved)) {
      if (!orgFallback) orgFallback = absUrl(href, 'https://hiringcafe.com');
      return;
    }
    if (/^https?:\/\//i.test(resolved) && !/hiringcafe\.com/i.test(resolved)) {
      if (!companyLink) companyLink = resolved;
    }
  };
  const companyLinkNear =
    companyNameEl?.parentElement ??
    drawer.querySelector('h1')?.parentElement ??
    drawer;
  for (const a of companyLinkNear.querySelectorAll('a[href]')) considerCompanyAnchor(a);
  if (!companyLink) {
    for (const a of drawer.querySelectorAll('a[href]')) considerCompanyAnchor(a);
  }
  if (!companyLink) companyLink = orgFallback;

  let postedRaw =
    drawer.querySelector('span.text-xs.text-cyan-700')?.textContent?.trim() ?? '';
  if (!postedRaw) {
    for (const el of drawer.querySelectorAll('span, div')) {
      const t = norm(el);
      if (/^Posted /i.test(t) && t.length < 48) {
        postedRaw = t;
        break;
      }
    }
  }
  const postedAgo = postedRaw.replace(/^posted\s+/i, '').trim();

  const headerArea = drawer.querySelector('h1')?.parentElement ?? drawer;
  let location = '';
  const considerLocation = (t: string) => {
    if (!t || t.length > 80) return false;
    if (/^(Onsite|Remote|Hybrid|Field)$/i.test(t)) return false;
    if (/^Posted\s+/i.test(t) || /view all|open roles|\.[a-z]{2,}\b/i.test(t)) return false;
    if (title && t.includes(title)) return false;
    if (/United States|, |\bRemote\b|\bHybrid\b/.test(t) || /,\s*[A-Z]{2}\b/.test(t)) {
      location = t;
      return true;
    }
    return false;
  };
  for (const el of headerArea.querySelectorAll('span, div')) {
    if (el.closest('article.prose')) continue;
    if (el.querySelector('h1')) continue;
    if (considerLocation(norm(el))) break;
  }
  if (!location) {
    location =
      [...drawer.querySelectorAll('div.flex.space-x-2 span')]
        .map((el) => el.textContent?.trim() ?? '')
        .find(
          (t) =>
            Boolean(t) &&
            /United States|, |\bRemote\b|\bHybrid\b/.test(t) &&
            !/^(Onsite|Remote|Hybrid|Field)$/i.test(t),
        ) ?? '';
  }
  if (!location) {
    for (const row of drawer.querySelectorAll('div.flex.space-x-2')) {
      if (!row.querySelector('svg')) continue;
      const t =
        [...row.querySelectorAll('span')]
          .map((el) => el.textContent?.trim() ?? '')
          .find(Boolean) ?? norm(row);
      if (t && t.length < 120 && !/^(Onsite|Remote|Hybrid|Field)$/i.test(t)) {
        location = t;
        break;
      }
    }
  }

  const pickSalary = (root: ParentNode): string => {
    for (const el of root.querySelectorAll('span, div, p, button')) {
      if (el.closest('article.prose')) continue;
      if (el.querySelector('span, div, p')) continue;
      const t = norm(el);
      if (
        t &&
        /^\$/.test(t) &&
        t.length < 48 &&
        !/remote|hybrid|onsite|full\s*time|part\s*time/i.test(t)
      ) {
        return t;
      }
    }
    return '';
  };
  const salary = pickSalary(headerArea) || pickSalary(drawer);

  const WP_RE = /^(onsite|on-site|remote|hybrid|field)$/i;
  const EMP_RE = /^(full[-\s]?time|part[-\s]?time|contract|intern(?:ship)?s?|temporary)$/i;
  const normalizeWorkplace = (raw: string): string => {
    if (/on-?site|in-?office/i.test(raw)) return 'Onsite';
    if (/hybrid/i.test(raw)) return 'Hybrid';
    if (/remote/i.test(raw)) return 'Remote';
    if (/field/i.test(raw)) return 'Field';
    return raw.trim();
  };
  const normalizeEmployment = (raw: string): string => {
    if (/full[-\s]?time/i.test(raw)) return 'Full Time';
    if (/part[-\s]?time/i.test(raw)) return 'Part Time';
    if (/\binternships?\b/i.test(raw)) return 'Internship';
    if (/\binterns?\b/i.test(raw)) return 'Intern';
    if (/contract/i.test(raw)) return 'Contract';
    if (/temporary/i.test(raw)) return 'Temporary';
    return raw.trim();
  };

  let workplaceType = '';
  let employmentType = '';
  const scanWorkEmp = (root: ParentNode) => {
    for (const el of root.querySelectorAll('span, div, p, button, li')) {
      if (el.closest('article.prose')) continue;
      const t = norm(el);
      if (!t || t.length > 24) continue;
      if (t === location) continue;
      if (!workplaceType && WP_RE.test(t)) workplaceType = normalizeWorkplace(t);
      if (!employmentType && EMP_RE.test(t)) employmentType = normalizeEmployment(t);
    }
  };
  const pillsRow = headerArea.parentElement ?? headerArea;
  scanWorkEmp(headerArea);
  if (!workplaceType || !employmentType) scanWorkEmp(pillsRow);
  if (!workplaceType || !employmentType) scanWorkEmp(drawer);

  const idFromJobUrl = (url: string): string => {
    try {
      const path = new URL(url, 'https://hiringcafe.com').pathname;
      const segs = path.split('/').filter(Boolean);
      const last = segs[segs.length - 1] ?? '';
      const token = last.split('-').pop() ?? '';
      if (/^[a-z0-9]{8,}$/i.test(token)) return token;
      return last;
    } catch {
      return '';
    }
  };

  const fullViewEl =
    [...drawer.querySelectorAll('a[href^="/job/"]')].find((a) =>
      /full view/i.test(a.textContent ?? ''),
    ) ??
    drawer.querySelector('[data-testid="drawer-view-job"] a[href^="/job/"]');
  let apply_url = '';
  const applyHref = fullViewEl?.getAttribute('href')?.trim() ?? '';
  if (applyHref) {
    apply_url = absUrl(applyHref, 'https://hiringcafe.com');
  } else if (
    /(?:^|\.)hiringcafe\.com$/i.test(window.location.hostname) &&
    window.location.pathname.startsWith('/job/')
  ) {
    apply_url = window.location.href;
  } else {
    const anyJob = drawer.querySelector('a[href^="/job/"]');
    const href = anyJob?.getAttribute('href')?.trim() ?? '';
    if (href) apply_url = absUrl(href, 'https://hiringcafe.com');
  }
  const id = apply_url
    ? idFromJobUrl(apply_url)
    : idFromJobUrl(window.location.href);

  const description = drawer.querySelector('article.prose')?.textContent?.trim() ?? '';

  const skills: string[] = [];
  const pushSkill = (raw: string) => {
    let t = raw.replace(/\s+/g, ' ').trim();
    t = t.replace(/^and\s+/i, '').replace(/\s+skills$/i, '').trim();
    if (t) t = t.charAt(0).toUpperCase() + t.slice(1);
    if (!t || t.length > 80) return;
    if (/technical tools|mentioned|^skills?$|^requirements?$/i.test(t)) return;
    if (WP_RE.test(t) || EMP_RE.test(t) || /^\$/.test(t)) return;
    if (t === location || t === company) return;
    if (!skills.includes(t)) skills.push(t);
  };
  const collectChipList = (scope: ParentNode, headingText?: string) => {
    const listItems = scope.querySelectorAll('li');
    if (listItems.length) {
      for (const li of listItems) {
        const raw = norm(li);
        if (!raw || raw.length > 80) continue;
        if (
          /bachelor|degree|\byears\b|experience|preferred|similar work/i.test(raw) &&
          raw.length > 28
        ) {
          continue;
        }
        raw.split(/\s*,\s*(?:and\s+)?/i).forEach(pushSkill);
      }
    }
    const chipLike = [...scope.querySelectorAll('span, a, button, div')].filter(
      (node) => headingText == null || norm(node) !== headingText,
    );
    let added = 0;
    for (const chip of chipLike) {
      const ct = norm(chip);
      if (!ct || ct.length > 48) continue;
      if (headingText && ct === headingText) continue;
      const href = chip.getAttribute('href') ?? chip.closest('a')?.getAttribute('href') ?? '';
      if (/industries|searchState|companyKeywords/i.test(href)) continue;
      const cls = chip.getAttribute('class') ?? '';
      const chipy = /rounded|pill|chip|badge|tag/i.test(cls);
      if (!chipy && ct.length > 32) continue;
      if (chipy || ct.length <= 32) {
        pushSkill(ct);
        added += 1;
      }
    }
    return added;
  };
  for (const el of drawer.querySelectorAll('p, div, h2, h3, h4, span, strong, dt')) {
    const t = norm(el);
    if (!/technical tools/i.test(t) || t.length > 60) continue;
    const sibling = el.nextElementSibling;
    const scope = sibling ?? el.parentElement;
    if (!scope) continue;
    collectChipList(scope, t);
    if (!skills.length && sibling) {
      const blob = norm(sibling).replace(t, '').trim();
      blob.split(/[,•|]/).forEach(pushSkill);
    }
    if (skills.length) break;
  }
  for (const el of drawer.querySelectorAll('p, div, h2, h3, h4, span, strong, dt')) {
    const t = norm(el);
    if (!/^(requirements|skills|tools mentioned)$/i.test(t)) continue;
    const sibling = el.nextElementSibling;
    const scope = sibling ?? el.parentElement;
    if (!scope) continue;
    collectChipList(scope, t);
  }
  if (!skills.length) {
    for (const el of drawer.querySelectorAll(
      '[class*="chip"], [class*="skill"], [data-testid*="skill"]',
    )) {
      const t = norm(el);
      if (t && t.length < 40) pushSkill(t);
    }
  }

  const companyTags: string[] = [];
  const pushCompanyTag = (raw: string) => {
    const t = raw.replace(/\s+/g, ' ').trim();
    if (!t || t.length > 60) return;
    if (t === company || t.replace(/^@\s*/, '') === company) return;
    if (/view all|website|jobs|apply|full view|posted|journal/i.test(t)) return;
    if (/^(workplace|salary|location)$/i.test(t)) return;
    if (WP_RE.test(t) || EMP_RE.test(t) || /^\$/.test(t)) return;
    if (t === location || t === salary) return;
    if (!companyTags.includes(t)) companyTags.push(t);
  };
  const companyBlock = companyNameEl?.parentElement ?? drawer.querySelector('h1 + div');
  if (companyBlock) {
    for (const el of companyBlock.querySelectorAll('span, a, button, div')) {
      const t = norm(el);
      if (!t || t.length > 40) continue;
      const cls = el.getAttribute('class') ?? '';
      if (!/rounded|pill|chip|badge|tag/i.test(cls)) continue;
      if (t.split(' ').length > 4) continue;
      pushCompanyTag(t);
    }
  }
  for (const a of drawer.querySelectorAll('a[href]')) {
    const href = a.getAttribute('href') ?? '';
    if (!/industries|searchState/i.test(href)) continue;
    if (
      /workplace|salary|location|commitment/i.test(href) &&
      !/industries|companyKeywords/i.test(href)
    ) {
      continue;
    }
    pushCompanyTag(norm(a));
  }

  const tags: string[] = [];
  const pushTag = (t: string) => {
    if (t && !tags.includes(t)) tags.push(t);
  };
  pushTag(workplaceType);
  pushTag(employmentType);

  let applicantsCount: number | undefined;
  let applicantsText: string | undefined;
  for (const el of drawer.querySelectorAll('span, div, p, small, a, li')) {
    const t = norm(el);
    if (!t || t.length > 40) continue;
    if (/see how many viewed or applied/i.test(t)) continue;
    const m = t.match(/^(\d+)\s+applicants?$/i);
    if (m) {
      applicantsCount = Number(m[1]);
      applicantsText = t;
      break;
    }
  }

  return {
    ok: true,
    title,
    company,
    logo,
    companyLink,
    location,
    salary,
    employmentType,
    workplaceType,
    postedAgo,
    tags,
    companyTags,
    skills,
    applicantsCount,
    applicantsText,
    apply_url,
    description,
    id,
  };
}