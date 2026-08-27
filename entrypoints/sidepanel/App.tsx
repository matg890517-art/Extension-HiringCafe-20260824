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
  List , ListItem , ListItemIcon , ListItemText
} from '@mui/material';

import { CheckCircle, RadioButtonUnchecked  } from '@mui/icons-material';

import theme from './theme'
import { ModeToggle } from './ModeToggle';
import { addAlert, AlertHost } from './addAlert'
import readDrawer, { type JobResult} from './readDrawer';

import { server_status,  server_status_color } from './content'
import { getTab } from './getTab';
import { postJob } from './postJob';
import { JobFields } from './JobField';
import { clickTab } from './clickTab';


const SERVER_URL =
  (import.meta.env.WXT_SERVER_URL as string | undefined)?.replace(/^['"]|['"]$/g, '') ??
  'http://127.0.0.1:8980';
const INGEST_TAG = (import.meta.env.WXT_INGEST_TAG as string | undefined)?.replace(/^['"]|['"]$/g, '') ??
  '/api/jobs/ingest';
const HEALTH_TAG = (import.meta.env.HEALTH_TAG as string | undefined)?.replace(/^['"]|['"]$/g, '') ??
  '/api/healthz';

export default function App() {
  const [status, setStatus] = useState('Open a job on HiringCafe, then Get job');
  const [job, setJob] = useState<JobResult | null>(null);
  const [busy, setBusy] = useState(false);

  const [serverUrl, setServerUrl] = useState(SERVER_URL);
  const [serverStatus, setServerStatus] = useState(0);
  useEffect( () => {
    const getHealth = async () => {
      try {
        setServerStatus(1) //connecting
        const res = await fetch(serverUrl + HEALTH_TAG, {
          method: 'GET',
        });
        if (!res.ok) {
          setServerStatus(-1) //disconnect
        }
        setServerStatus(2) //connected
      } catch (error) {
        setServerStatus(0)//disconnect
        console.error('Health check error:', error);
      }
    };
    if (serverUrl) {
      void getHealth();
    }
  }, [serverUrl]);

  async function getJob() {
    setBusy(true);
    try {
      const tab = await getTab();
      const tabUrl = tab?.url ?? "";
      if (tabUrl.indexOf("https://hiringcafe.com") == -1) {
        const message= 'This page is not Hiringcafe page.'
        setStatus(message);
        addAlert({ message, security: 'error' });
        return "This page is not Hiringcafe page";
      }
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: clickTab,
        args: ['Company Info'],
      });
      await new Promise((r) => setTimeout(r, 450));
      const [injected] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: readDrawer,
      });
      const extracted = injected?.result as JobResult | undefined;
      if (injected?.error) {
        const message = String(injected.error.message ?? injected.error);
        setStatus(message);
        addAlert({ message, security: 'error' });
        return;
      }
      if (!extracted?.ok) {
        const message = extracted?.error ?? 'failed';
        setStatus(message);
        addAlert({ message, security: 'error' });
        return;
      }
      setJob(extracted);
      const res = await postJob(serverUrl + INGEST_TAG, extracted);
      const result = await res.json();
      console.log(result);
      let message = '';
      switch(result.summary.total){
          case result.summary.created: 
            message = 'Post and created';
            addAlert({ message: message, security: 'success' });
          break;
          case result.summary.duplicate: 
            message = 'Already it is in backend. more:' +result.results[0].reason;
            addAlert({ message: message, security: 'warning' });
          break;
          case result.summary.blocked: 
            message = 'Job blocked';
            addAlert({ message: message, security: 'error' });
          break;
          case result.summary.errors: 
            message = 'Job is not good.';
            addAlert({ message: message, security: 'error' });
          break;
          default:
            message = 'Unknown case';
            addAlert({ message: message, security: 'error' });
      }
      setStatus(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setStatus(message);
      addAlert({ message, security: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AlertHost />
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
            label="Server URL"
            size="small"
            fullWidth
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            disabled={busy}
            helperText={server_status(serverStatus)}
            slotProps={{ formHelperText: { sx: { color: server_status_color(serverStatus) } } }}
          />
          <Typography variant="body2" color="text.secondary">
            {status}
          </Typography>
          {/* {job?.logo ? (
                <Box
                  component="img"
                  src={job.logo}
                  alt={job.company || ''}
                  sx={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 1 }}
                />
              ) : null} */}
          {/* {posting && (
            <>
              <Divider />
              <Typography variant="subtitle2">Posting result</Typography>
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
          <Divider />
            <JobFields job={job} />
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
interface JobFieldProps {
  fill: string;
  text: string;
  desc: string;
}

function JobField({ fill,  text, desc }: JobFieldProps) {
  return (
    <ListItem disablePadding>
      <ListItemIcon>
        {fill==='exist'&&
          <CheckCircle color="success" />
        }
        {fill==='zero'&&
          <RadioButtonUnchecked color="disabled" />
        }
      </ListItemIcon>

      <ListItemText primary={text} secondary={desc} />
    </ListItem>
  );
}