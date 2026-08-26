import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CssBaseline,
  Divider,
  Paper,
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
  location?: string;
  salary?: string;
  apply_url?: string;
  description?: string;
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
  const drawer = document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  );
  if (!drawer) return { ok: false, error: 'no drawer' };

  const descTab = [...drawer.querySelectorAll('button')].find((b) =>
    /job description/i.test(b.textContent ?? ''),
  );
  if (descTab && !drawer.querySelector('article.prose')?.textContent?.trim()) {
    descTab.click();
  }

  const title = drawer.querySelector('h1')?.textContent?.trim() ?? '';
  const company = (drawer.querySelector('h1 + div span.text-xl.font-semibold')?.textContent ?? '')
    .replace(/^@\s*/, '')
    .trim();
  const location =
    [...drawer.querySelectorAll('div.flex.space-x-2 span')]
      .map((el) => el.textContent?.trim())
      .find((t) => t && /United States|, /.test(t)) ?? '';
  const salary =
    [...drawer.querySelectorAll('span, div')]
      .map((el) => el.textContent?.trim())
      .find((t) => t && /^\$/.test(t)) ?? '';
  const href = drawer.querySelector('a[href^="/job/"]')?.getAttribute('href');
  const apply_url = href ? new URL(href, 'https://hiringcafe.com').href : '';
  const description = drawer.querySelector('article.prose')?.textContent?.trim() ?? '';

  return { ok: true, title, company, location, salary, apply_url, description };
}

function closeAndHide(title: string) {
  const drawer = document.querySelector(
    'div[role="dialog"][aria-modal="true"].chakra-modal__content',
  ) as HTMLElement | null;

  const hideBtn = [...(drawer?.querySelectorAll('button') ?? [])].find((b) => {
    const t = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`;
    return /\bhide\b/i.test(t);
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
          /\bhide\b/i.test(`${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`),
        )
      : [...document.querySelectorAll('button')].find((b) => {
          const label = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`;
          if (!/\bhide\b/i.test(label)) return false;
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
      const extracted = injected?.result as JobResult | undefined;
      if (!extracted?.ok) {
        setStatus(extracted?.error ?? 'failed');
        return;
      }
      setJob(extracted);

      const res = await fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: 'hiringcafe',
          title: extracted.title,
          company: { name: extracted.company },
          details: {
            location: extracted.location,
            salary: extracted.salary,
          },
          description: extracted.description,
          applyLink: extracted.apply_url,
          scrapefrom: 'hiringcafe',
          collectedAt: new Date().toISOString(),
        }),
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
        url: INGEST_URL,
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
        url: INGEST_URL,
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
              <Typography variant="subtitle2">{job.title}</Typography>
              <Typography variant="body2">{job.company}</Typography>
              <Typography variant="body2">{job.location}</Typography>
              <Typography variant="body2">{job.salary}</Typography>
              <Typography variant="caption" sx={{ wordBreak: 'break-all' }}>
                {job.apply_url}
              </Typography>
            </>
          )}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
