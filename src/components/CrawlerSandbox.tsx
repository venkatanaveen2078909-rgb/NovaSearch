import React, { useState, useEffect, useRef } from 'react';
import { CrawlerLog } from '../types';
import { 
  Play, Pause, Plus, List, Database, Terminal, CheckCircle, 
  AlertCircle, ShieldCheck, Heart, Trash2, ArrowRight
} from 'lucide-react';

interface CrawlerSandboxProps {
  addCrawlDocumentToIndex: (shardId: number, doc: { url: string; title: string; content: string; rawHtml: string; pageSize: string }) => void;
}

export const CrawlerSandbox: React.FC<CrawlerSandboxProps> = ({ addCrawlDocumentToIndex }) => {
  const [seedUrl, setSeedUrl] = useState('https://github.com/google/distributed-infra');
  const [isCrawling, setIsCrawling] = useState(false);
  const [frontier, setFrontier] = useState<string[]>([
    'https://github.com/google/distributed-infra',
    'https://wikipedia.org/wiki/Distributed_computing',
    'https://arxiv.org/abs/2103.05432',
    'https://reddit.com/r/cpp/comments/lockfree'
  ]);
  const [crawledUrls, setCrawledUrls] = useState<string[]>([]);
  const [discoveredDomains, setDiscoveredDomains] = useState<string[]>(['github.com', 'wikipedia.org', 'arxiv.org', 'reddit.com']);
  const [currentPageSize, setCurrentPageSize] = useState<string>('0');
  
  // Terminal Logs
  const [logs, setLogs] = useState<CrawlerLog[]>([]);

  // Side-by-Side html strip visualizer
  const [rawHtmlSample, setRawHtmlSample] = useState<string>('');
  const [strippedTextSample, setStrippedTextSample] = useState<string>('');
  const [sampleTitle, setSampleTitle] = useState<string>('');
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Stop simulation on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const addSeedToFrontier = () => {
    if (!seedUrl.trim() || frontier.includes(seedUrl)) return;
    setFrontier(prev => [...prev, seedUrl]);
    
    // Extract domain name
    try {
      const parsed = new URL(seedUrl);
      if (!discoveredDomains.includes(parsed.hostname)) {
        setDiscoveredDomains(prev => [...prev, parsed.hostname]);
      }
    } catch {
      const simpleDomain = seedUrl.replace(/https?:\/\//, '').split('/')[0];
      if (!discoveredDomains.includes(simpleDomain)) {
        setDiscoveredDomains(prev => [...prev, simpleDomain]);
      }
    }

    setSeedUrl('');
  };

  const clearFrontier = () => {
    setFrontier([]);
  };

  // Add Log Entry
  const addLog = (url: string, status: CrawlerLog['status'], details: string) => {
    const newLog: CrawlerLog = {
      id: Math.random().toString(),
      timestamp: new Date().toISOString().split('T')[1].substring(0, 8),
      url,
      status,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const runSingleCrawlStep = () => {
    if (frontier.length === 0) {
      setIsCrawling(false);
      addLog('Frontier', 'DISALLOWED', 'Frontier Queue is empty. Crawler paused.');
      return;
    }

    const nextUrl = frontier[0];
    const remainingFrontier = frontier.slice(1);

    // Parse domain host
    let domain = 'unknown';
    try {
      domain = new URL(nextUrl).hostname;
    } catch {
      domain = nextUrl.replace(/https?:\/\//, '').split('/')[0];
    }

    // Step 1: Frontier queue fetch
    addLog(nextUrl, 'QUEUED', 'Popped thread-safe Producer-Consumer URL Frontier queue');

    // Step 2: Robots.txt checker simulation (Robots check takes 350ms)
    setTimeout(() => {
      // Bypassing robots disallow paths
      if (nextUrl.includes('/admin') || nextUrl.includes('/settings') || nextUrl.includes('/secret')) {
        addLog(nextUrl, 'DISALLOWED', `Blocked by ethical crawling parameters found in robots.txt disallow guidelines`);
        setFrontier(remainingFrontier);
        return;
      }

      addLog(nextUrl, 'ROBOTS_CHECK', 'Parsed example.com/robots.txt -> User-Agent: * Allow: /');

      // Step 3: Domain Politeness Throttling check
      setTimeout(() => {
        addLog(nextUrl, 'POLITENESS_DELAY', `Leaky Bucket rate-limiter verified for hostname: ${domain}. delay OK.`);

        // Step 4: HTML downloader and Parser stripping tags
        setTimeout(() => {
          // Calculate random crawled document details
          const sizeKb = (15 + Math.random() * 60).toFixed(1);
          setCurrentPageSize(sizeKb);
          setCrawledUrls(prev => [...prev, nextUrl]);

          const mockTitles = [
            'Dynamic thread-scheduling mechanisms across cores',
            'Distributed lock-free ring layouts on memory blocks',
            'Analytical comparisons of BM25 term frequency weights',
            'Systems programming paradigms inside modern compilers'
          ];
          const chosenTitle = mockTitles[Math.floor(Math.random() * mockTitles.length)] + ` (Ref: ${domain})`;
          
          const rawHtml = `<html>
<head>
  <title>${chosenTitle}</title>
  <style>
    body { font-family: sans-serif; background: #030712; }
    .ad-banner { height: 90px; color: red; }
  </style>
  <script type="text/javascript">
    function runTracking() { console.log("Ad telemetry tracking active..."); }
  </script>
</head>
<body>
  <div class="header">Systems Programming Node API</div>
  <h1>Multi-threaded index processes in Modern C++20</h1>
  <p>To schedule URL download tasks concurrent execution pathways require jthread pools in novasearch crawler subsystems.</p>
  <a href="${nextUrl}/concurrency-models">Read concurrency details</a>
  <div class="ad-banner">Advertise with us now!</div>
</body>
</html>`;

          // Stripped text representation output
          const stripped = `Title: ${chosenTitle}\n` + 
            `Header: Multi-threaded index processes in Modern C++20\n` + 
            `Paragraph: To schedule URL download tasks concurrent execution pathways require jthread pools in novasearch crawler subsystems.\n` + 
            `Link Discovered: ${nextUrl}/concurrency-models\n` +
            `[STRIPPED NOISE LOG]: Removed <script> tracking elements and background .ad-banner containers successfully.`;

          setSampleTitle(chosenTitle);
          setRawHtmlSample(rawHtml);
          setStrippedTextSample(stripped);

          addLog(nextUrl, 'PARSING', `Strip complete. Scraped ${sizeKb} kb HTML. Removed <script> blocks & CSS stylesheets.`);

          // Step 5: Postings allocation and Shard Indexing — POST to REAL backend
          setTimeout(async () => {
            const shardId = (Math.floor(Math.random() * 3) + 1);
            
            // POST to the coordinator which routes to the appropriate shard server
            try {
              const resp = await fetch('/api/crawl', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  shardId,
                  url: nextUrl,
                  title: chosenTitle,
                  content: `To schedule URL download tasks concurrent execution indexing query layouts. ${chosenTitle}`,
                  rawHtml: rawHtml,
                  pageSize: sizeKb
                })
              });
              const data = await resp.json();
              addLog(nextUrl, 'INDEXED', `Indexed to Postgres via Shard 0${shardId} (docId: ${data.docId || 'N/A'})`);
            } catch (e) {
              addLog(nextUrl, 'INDEXED', `Indexed locally to Shard 0${shardId} (backend offline, using fallback)`);
            }

            // Also update React UI state
            addCrawlDocumentToIndex(shardId, {
              url: nextUrl,
              title: chosenTitle,
              content: `To schedule URL download tasks concurrent execution indexing query layouts. ${chosenTitle}`,
              rawHtml: rawHtml,
              pageSize: sizeKb
            });

            // Enqueue discovered hyperlinks to frontier queue (BFS discovery)
            const gatheredLink = `${nextUrl}/concurrency-models`;
            if (!frontier.includes(gatheredLink) && !crawledUrls.includes(gatheredLink)) {
              setFrontier([...remainingFrontier, gatheredLink]);
            } else {
              setFrontier(remainingFrontier);
            }

          }, 450);
        }, 500);
      }, 450);
    }, 400);
  };

  const startCrawlSimulation = () => {
    if (isCrawling) return;
    setIsCrawling(true);
    runSingleCrawlStep(); // Run instantly first
    timerRef.current = setInterval(runSingleCrawlStep, 3500); // Step every 3.5 seconds
  };

  const stopCrawlSimulation = () => {
    setIsCrawling(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="space-y-6" id="crawler-sandbox-component">
      {/* 1. Header controls */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-slate-200 text-sm font-semibold font-mono flex items-center gap-2">
            <List className="w-4 h-4 text-emerald-400" /> MULTI-THREADED ASYNC CRAWLER SPREADER
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            Submit customized seed links. Run crawls on frontiers, parse scripts, extract anchors and add docs to active indexing shards.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2">
          {!isCrawling ? (
            <button
              onClick={startCrawlSimulation}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs py-2 px-5 rounded flex items-center gap-1.5 transition"
              id="crawler-start-btn"
            >
              <Play className="w-4 h-4" /> START CRAWLING REPO
            </button>
          ) : (
            <button
              onClick={stopCrawlSimulation}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs py-2 px-5 rounded flex items-center gap-1.5 transition"
              id="crawler-pause-btn"
            >
              <Pause className="w-4 h-4" /> PAUSE CRAWLER
            </button>
          )}

          <button
            onClick={clearFrontier}
            className="text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-850 px-3.5 py-1 text-xs rounded font-mono"
            id="crawler-clear-frontier-btn"
          >
            Clear Frontier List
          </button>
        </div>
      </div>

      {/* 2. Main Middle Pipeline: Frontier on left, logs on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="crawler-pipeline-grid">
        {/* Frontier stack list (Left 5/12) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col h-[400px]" id="crawler-frontier-sidebar">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-slate-200 text-xs font-semibold font-mono uppercase tracking-wider">
              URL Frontier Queue ({frontier.length})
            </h4>
            <span className="text-[10px] bg-slate-950 text-slate-500 font-mono border border-slate-805 px-2 py-0.5 rounded">
              Producer-Consumer Stack
            </span>
          </div>

          {/* Seed Input Add Form */}
          <div className="flex gap-2 mb-4" id="seed-add-form">
            <input
              type="text"
              placeholder="e.g. https://google.com/infra"
              value={seedUrl}
              onChange={(e) => setSeedUrl(e.target.value)}
              className="flex-1 bg-slate-950 text-slate-100 px-3 py-2 rounded border border-slate-800 focus:border-emerald-500 focus:outline-none font-mono text-xs"
              id="seed-input-field"
            />
            <button
              onClick={addSeedToFrontier}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs py-2 px-3 rounded border border-slate-700 transition flex items-center gap-1"
              id="seed-add-btn"
            >
              <Plus className="w-3.5 h-3.5" /> Enqueue
            </button>
          </div>

          {/* Frontier list map */}
          <div className="flex-1 overflow-y-auto font-mono text-xs divide-y divide-slate-800/40 pr-1">
            {frontier.length === 0 ? (
              <div className="text-slate-600 flex flex-col items-center justify-center h-full gap-2">
                <Trash2 className="w-6 h-6 text-slate-800" />
                <span>Queue Empty. Crawls stopped.</span>
              </div>
            ) : (
              frontier.map((url, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-2 overflow-hidden" id={`frontier-item-${idx}`}>
                  <span className="text-indigo-400 select-all truncate flex-1">{url}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold shrink-0 ${
                    idx === 0 && isCrawling ? 'bg-amber-950 text-amber-400 animate-pulse' : 'bg-slate-950 text-slate-600'
                  }`}>
                    {idx === 0 && isCrawling ? 'CRAWLING...' : 'PENDING'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Active execution logs (Right 7/12) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col h-[400px]" id="crawler-terminal">
          <h4 className="text-slate-200 text-xs font-semibold font-mono uppercase tracking-wider mb-3">
            Crawler Subsystem terminal logs
          </h4>

          <div className="flex-1 bg-slate-950 border border-slate-950 rounded p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-2.5 h-[300px]" id="crawler-log-panel">
            {logs.length === 0 ? (
              <div className="text-slate-700 flex flex-col items-center justify-center h-full gap-2">
                <Terminal className="w-6 h-6 text-slate-800" />
                <span>Logs waiting for crawl initialization...</span>
              </div>
            ) : (
              logs.map((log) => {
                let badgeStyle = 'bg-slate-905 text-slate-500';
                if (log.status === 'INDEXED') badgeStyle = 'bg-emerald-950 text-emerald-400';
                if (log.status === 'ROBOTS_CHECK') badgeStyle = 'bg-indigo-950 text-indigo-400';
                if (log.status === 'POLITENESS_DELAY') badgeStyle = 'bg-amber-955 text-amber-500';
                if (log.status === 'DISALLOWED') badgeStyle = 'bg-red-955 text-red-500';

                return (
                  <div key={log.id} className="flex gap-2 pb-1.5 border-b border-slate-900/30 font-semibold last:border-0 hover:bg-slate-900/10 px-1 rounded h-fit" id={`log-item-${log.id}`}>
                    <span className="text-slate-600">{log.timestamp}</span>
                    <span className={`text-[9px] px-1.5 rounded h-4 flex items-center shrink-0 uppercase ${badgeStyle}`}>
                      {log.status}
                    </span>
                    <span className="text-indigo-400 select-all max-w-[150px] truncate shrink-0">{log.url.split('/')[2]}</span>
                    <span className="text-slate-400 flex-1">{log.details}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 3. HTML Parse display side-by-side (Visual Parser Illustration) */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg" id="visual-html-parser-panel">
        <h3 className="text-slate-200 text-sm font-semibold font-mono mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" /> HTML STRIP & PARSING ENGINE ILLUSTRATOR
        </h3>

        {rawHtmlSample ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4" id="html-strip-comparison-grid">
            {/* Input Messy Raw page */}
            <div className="md:col-span-6 bg-slate-950 border border-slate-850 p-4 rounded-lg flex flex-col h-[280px]" id="raw-html-viewer">
              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase select-none tracking-widest flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Page HTML Input (Messy formatting tags & scripts)
              </span>
              <pre className="flex-1 font-mono text-[11px] text-slate-400 overflow-auto whitespace-pre h-[180px] border border-slate-900/40 p-2.5 rounded bg-slate-950/40">{rawHtmlSample}</pre>
            </div>

            {/* Transition pipeline */}
            <div className="hidden md:flex md:col-span-1 items-center justify-center" id="strip-arrow">
              <ArrowRight className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>

            {/* Output Clean Text block */}
            <div className="md:col-span-5 bg-slate-950 border border-slate-850 p-4 rounded-lg flex flex-col h-[280px]" id="stripped-text-viewer">
              <span className="text-[10px] text-slate-500 font-mono mb-2 uppercase select-none tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Indexed document corpus tokens (HTML tags stripped)
              </span>
              <pre className="flex-1 font-mono text-[11px] text-emerald-400 overflow-auto whitespace-pre h-[180px] border border-slate-900/40 p-2.5 rounded bg-emerald-950/5">{strippedTextSample}</pre>
            </div>
          </div>
        ) : (
          <div className="border border-slate-800 p-12 rounded-lg bg-slate-950/35 text-slate-600 flex flex flex-col items-center justify-center gap-2 hover:border-slate-700 transition" id="parser-waiting-state">
            <Terminal className="w-8 h-8 text-slate-800" />
            <span className="font-mono text-xs text-center">
              Web parsing visualizer sits idle. Start the crawling simulation above.<br />
              Upon downloading a seed page, this visual contrasts the raw HTML input and stripped text token outcomes side-by-side.
            </span>
          </div>
        )}
      </div>

    </div>
  );
};
