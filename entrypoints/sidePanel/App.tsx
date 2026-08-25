import { useState } from 'react';
import reactLogo from '@/assets/react.svg';
import wxtLogo from '/wxt.svg';
import './App.css';
import { Description } from '@mui/icons-material';

function App() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState('Open a job, then Get job');
  
  const [desc, setDesc] = useState<Record<string,any>>();
  // async function getJob() {

  //   console.log("[getJob]")
  //   // const [tab] = await browser.tabs.query({
  //   //   active: true,
  //   //   currentWindow: true,
  //   // });
  //   const tabs = await browser.tabs.query({
  //     url: ['*://hiringcafe.com/*', '*://*.hiringcafe.com/*'],
  //   });
  //   const tab = tabs.find((t) => t.active) ?? tabs[0];
  //   if (!tab?.id) {
  //     setStatus('no-------------hiringcafe tab');
  //     return;
  //   }else{
  //     setStatus('tab-------------id:'+tab?.url);
  //   }
  //   const res = await browser.tabs.sendMessage(tab.id, { type: 'GET_JOB' });
  //   if(res.ok)setStatus(res.ok);  }

  async function getJob() {
    const tabs = await browser.tabs.query({
      url: ['*://hiringcafe.com/*', '*://*.hiringcafe.com/*'],
    });
    const tab = tabs.find((t) => t.active) ?? tabs[0];
    if (!tab?.id) {
      setStatus('no hiringcafe tab');
      return;
    }
    const [injected] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const drawer = document.querySelector(
          'div[role="dialog"][aria-modal="true"].chakra-modal__content',
        );
        if(!drawer) return { ok: false, error: 'no drawer' };

        const title = drawer.querySelector('h1')?.textContent?.trim() ?? '';
        const company = (drawer.querySelector('h1 + div span.text-xl.font-semibold')
          ?.textContent ?? '')
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
      },
    });
    const job = injected?.result;
    if (!job?.ok) {
      setStatus(job?.error ?? 'failed');
      return;
    }
    const ingestUrl =
      import.meta.env.WXT_INGEST_URL ?? 'http://127.0.0.1:8980/api/jobs/ingest';
      const res = await fetch(ingestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: 'hiringcafe',
          title: job.title,
          company: { name: job.company },

          details: {
            location: job.location, salary: job.salary,
          },
          
          description: job.description,
          applyLink: job.apply_url,
          scrapefrom: 'hiringcafe',
          collectedAt: new Date().toISOString(),
        }),
      });
    setStatus(res.ok ? `ingested ${job.title}` : `ingest failed ${res.status}`);
    setDesc(injected?.result);
  }
  return (
    <>
      <div>
        <a href="https://wxt.dev" target="_blank">
          <img src={wxtLogo} className="logo" alt="WXT logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>WXT + React</h1>
      <div className="card">
        <button onClick={() =>{ setCount((count) => count + 1)}}>
          count is {count}
        </button>
        
        <button onClick={getJob}>
          status is {status}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        title------------ {desc?.title ?? 'unknown'}<br/>
        company------------ {desc?.company ?? 'unknown'}<br/>
        location------------ {desc?.location ?? 'unknown'}<br/>
        salary------------ {desc?.salary ?? 'unknown'}<br/>
        applly_url------------ {desc?.apply_url ?? 'unknown'}<br/>
        descriptoin------------ {desc?.description ?? 'unknown'};<br/>
      </p>
    </>
  );
}

export default App;
