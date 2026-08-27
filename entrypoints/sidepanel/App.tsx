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
  Snackbar,
} from '@mui/material';

import theme from './theme'
import { ModeToggle } from './ModeToggle';
import readDrawer, { type JobResult} from './readDrawer';

type PostingResult = {
  ok: boolean;
  status: number;
  url: string;
  body: string;
};

const INGEST_URL =
  (import.meta.env.WXT_INGEST_URL as string | undefined)?.replace(/^['"]|['"]$/g, '') ??
  'http://127.0.0.1:8980/api/jobs/ingest';


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
      const extracted = injected?.result as JobResult | undefined;
      if (injected?.error) {
        setStatus(String(injected.error.message ?? injected.error));
        return;
      }
      if (!extracted?.ok) {
        setStatus(extracted?.error ?? 'failed');
        return;
      }
      setJob(extracted);

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
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          // justifyContent: 'center', // Centers vertically
          alignItems: 'center',     // Centers horizontally
          minHeight: '100vh',       // Spans the full height of the sidebar
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Stack spacing={2} sx={{ p:2, width: 360 }}>
          <Stack direction={'row'}>
            <Typography variant="h6" sx={{flexGrow: 1}}>HiringCafe collector</Typography>
            <ModeToggle />
          </Stack>
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
          {/* {posting && (
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
          )} */}
          {/* {job?.ok && (
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
          )} */}
        </Stack>
      </Box>
    </ThemeProvider>
  );
}
