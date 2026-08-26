import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CssBaseline,
  Divider,
  Paper,
  TextField,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from '@mui/material';

const theme = createTheme({
  palette: { mode: 'light' },
});

type JobResult = {
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

type PostingResult = {
  ok: boolean;
  status: number;
  url: string;
  body: string;
};

const INGEST_URL =
  (import.meta.env.WXT_INGEST_URL as string | undefined)?.replace(/^['"]|['"]$/g, '') ??
  'http://127.0.0.1:8980/api/jobs/ingest';

function readDrawer(): JobResult {
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

function clickJobDescriptionTab() {
  const drawer = document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  if (!drawer) return false;
  const descTab = [...drawer.querySelectorAll('button')].find((b) => {
    const t = (b.textContent ?? '').trim();
    return /job description/i.test(t) && !/\bapply\b/i.test(t);
  });
  descTab?.click();
  return Boolean(descTab);
}

function closeAndHide(title: string) {
  const drawer = document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  ) as HTMLElement | null;

  const panel = drawer?.querySelector('[data-testid="job-actions-panel"]') ?? drawer;

  const hideBtn = [...(panel?.querySelectorAll('button') ?? [])].find((b) => {
    const t = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`;
    return /\bhide\b/i.test(t) && !/\bapplied\b/i.test(t);
  });
  hideBtn?.click();

  const closeBtn =
    (document.querySelector('[data-testid="drawer-header-close"]') as HTMLElement | null) ??
    ([...(drawer?.querySelectorAll('button') ?? [])].find((b) =>
      /close/i.test(b.getAttribute('aria-label') ?? ''),
    ) as HTMLElement | undefined) ??
    null;
  closeBtn?.click();

  if (title) {
    const card = [...document.querySelectorAll('button, a, div')].find((el) => {
      const text = el.textContent ?? '';
      return text.includes(title) && /\bhide\b/i.test(text);
    });
    const hideOnCard = card
      ? [...card.querySelectorAll('button')].find((b) =>
          /\bhide\b/i.test(`${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`) &&
          !/\bapplied\b/i.test(`${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`),
        )
      : [...document.querySelectorAll('button')].find((b) => {
          const label = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`;
          if (!/\bhide\b/i.test(label) || /\bapplied\b/i.test(label)) return false;
          const host = b.closest('[class]') as HTMLElement | null;

          return !!host && (host.textContent ?? '').includes(title);
        });
    hideOnCard?.click();
  }

  return { closed: true };
}

export default function App() {
  const [status, setStatus] = useState('Open a job on HiringCafe, then Get job');
  const [job, setJob] = useState<JobResult | null>(null);
  const [posting, setPosting] = useState<PostingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [ingestUrl, setIngestUrl] = useState(INGEST_URL);

  useEffect(() => {
    browser.storage.local.get('ingestUrl').then((stored) => {
      const value = stored.ingestUrl;
      if (typeof value === 'string' && value.trim()) setIngestUrl(value.trim());
    });
  }, []);

  useEffect(() => {
    if (ingestUrl) browser.storage.local.set({ ingestUrl });
  }, [ingestUrl]);

  async function getJob() {
    setBusy(true);
    setPosting(null);
    try {
      const tabs = await browser.tabs.query({
        url: ['*://hiringcafe.com/*', '*://*.hiringcafe.com/*'],
      });
      const tab = tabs.find((t) => t.active) ?? tabs[0];
      if (!tab?.id) {
        setStatus('no hiringcafe tab');
        return;
      }

      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: readDrawer,
      });
      let extracted = injected?.result as JobResult | undefined;
      if (injected?.error) {
        setStatus(String(injected.error.message ?? injected.error));
        return;
      }
      if (!extracted?.ok) {
        setStatus(extracted?.error ?? 'failed');
        return;
      }
      setJob(extracted);

      if (!extracted.description) {
        setStatus('opening Job Description tab');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: clickJobDescriptionTab,
        });
        await new Promise((r) => setTimeout(r, 450));
        const [again] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: readDrawer,
        });
        if (again?.result?.ok) {
          extracted = again.result as JobResult;
          setJob(extracted);
        }
      }
      if (extracted && !extracted.description) {
        await new Promise((r) => setTimeout(r, 450));
        const [third] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: readDrawer,
        });
        if (third?.result?.ok) {
          extracted = third.result as JobResult;
          setJob(extracted);
        }
      }

      const payload: Record<string, unknown> = {
        createdBy: 'hiringcafe',
        title: extracted.title,
        company: {
          name: extracted.company,
          logo: extracted.logo,
          tags: extracted.companyTags ?? [],
        },
        description: extracted.description,
        applyLink: extracted.apply_url,
        companyLink: extracted.companyLink ?? '',
        postedAgo: extracted.postedAgo,
        tags: extracted.tags ?? [],
        skills: extracted.skills ?? [],
        details: {
          location: extracted.location,
          employmentType: extracted.employmentType ?? '',
          workplaceType: extracted.workplaceType,
          salary: extracted.salary,
        },
        applicants: {
          count: extracted.applicantsCount,
          text: extracted.applicantsText,
        },
        id: extracted.id,
        scrapeFrom: 'hiringcafe',
      };

      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      let body = raw;
      try {
        body = JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        /* keep raw text */
      }
      setPosting({
        ok: res.ok,
        status: res.status,
        url: ingestUrl,
        body: body || "(empty body)",
      });
      if (!res.ok) {
        setStatus(`ingest failed ${res.status}`);
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: closeAndHide,
        args: [extracted.title ?? ''],
      });

      setStatus(`ingested ${extracted.title}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPosting({
        ok: false,
        status: 0,
        url: ingestUrl,
        body: message,
      });
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2, width: 360 }}>
        <Stack spacing={2}>
          <Typography variant="h6">HiringCafe collector</Typography>
          <Button variant="contained" onClick={getJob} disabled={busy} fullWidth>
            {busy ? 'Working…' : 'Get job'}
          </Button>
          <TextField
            label="Ingest URL"
            size="small"
            fullWidth
            value={ingestUrl}
            onChange={(e) => setIngestUrl(e.target.value)}
            disabled={busy}
          />
          <Typography variant="body2" color="text.secondary">
            {status}
          </Typography>
          {posting && (
            <>
              <Divider />
              <Typography variant="subtitle2">Posting result</Typography>
              <Alert severity={posting.ok ? "success" : "error"}>
                {posting.ok ? "Posted" : "Post failed"} · HTTP {posting.status}
              </Alert>
              <Typography variant="caption" sx={{ wordBreak: "break-all" }}>
                {posting.url}
              </Typography>
              <Paper variant="outlined" sx={{ p: 1, maxHeight: 220, overflow: "auto" }}>
                <Typography
                  component="pre"
                  variant="caption"
                  sx={{ m: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {posting.body}
                </Typography>
              </Paper>
            </>
          )}
          {job?.ok && (
            <>
              <Divider />
              {job.logo ? (
                <Box
                  component="img"
                  src={job.logo}
                  alt={job.company || ''}
                  sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1 }}
                />
              ) : null}
              <Typography variant="subtitle2">{job.title}</Typography>
              <Typography variant="body2">{job.company}</Typography>
              <Typography variant="body2">{job.location}</Typography>
              <Typography variant="body2">{job.salary}</Typography>
              <Typography variant="body2">{job.employmentType}</Typography>
              <Typography variant="body2">{job.workplaceType}</Typography>
              <Typography variant="body2">{job.postedAgo}</Typography>
              <Typography variant="body2">{(job.tags ?? []).join(', ')}</Typography>
              <Typography variant="body2">{(job.companyTags ?? []).join(', ')}</Typography>
              <Typography variant="body2">{(job.skills ?? []).join(', ')}</Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                {job.apply_url}
              </Typography>
              {(!job.apply_url || !job.description) && (
                <Alert severity="warning">
                  Missing {!job.apply_url ? "applyLink" : ""}{!job.apply_url && !job.description ? " and " : ""}{!job.description ? "description" : ""}. Posted anyway.
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
