// static/tools.js — Single-tool page runner

document.addEventListener('DOMContentLoaded', () => {
  const titleEl = document.getElementById('tool-title');
  const descEl = document.getElementById('tool-desc');
  const labelEl = document.getElementById('tool-input-label');
  const hintEl = document.getElementById('tool-hint');
  const argEl = document.getElementById('tool-arg');
  const runBtn = document.getElementById('tool-run');
  const outEl = document.getElementById('tool-output');
  const errEl = document.getElementById('tool-error');
  const copyBtn = document.getElementById('tool-copy');

  const api = (window.__Ouwibo || {});
  const authHeaders = typeof api.authHeaders === 'function'
    ? api.authHeaders
    : () => ({ 'Content-Type': 'application/json' });

  const params = new URLSearchParams(window.location.search || '');
  const tool = (params.get('tool') || '').trim();

  const TOOL_META = {
    wallet: {
      title: 'Wallet',
      desc: 'Paste a wallet address or ENS name. Returns multi-chain balances + explorer links + suggested ACP specialists.',
      label: 'Wallet Scan',
      placeholder: '0x… or vitalik.eth',
      hint: 'Example: wallet[0xabc…] — now with Virtual Protocol marketplace integration',
      normalize: (v) => v.trim(),
    },
    crypto: {
      title: 'Crypto Market',
      desc: 'Quick crypto prices, trending, and top market cap list (CoinGecko).',
      label: 'Query',
      placeholder: 'btc usd | top 10 usd | trending',
      hint: 'Example: crypto[btc usd] or crypto[top 10 usd]',
      normalize: (v) => v.trim(),
    },
    ens: {
      title: 'ENS',
      desc: 'Resolve ENS name or address.',
      label: 'ENS / Address',
      placeholder: 'vitalik.eth or 0x…',
      hint: 'Example: ens[vitalik.eth]',
      normalize: (v) => v.trim(),
    },
    search: {
      title: 'Web Search',
      desc: 'DuckDuckGo web search returning titles, snippets, and URLs.',
      label: 'Search Query',
      placeholder: 'your query…',
      hint: 'Example: search[latest AI news]',
      normalize: (v) => v.trim(),
    },
    google_search: {
      title: 'Google Search',
      desc: 'Search using Google (fallback ready).',
      label: 'Search Query',
      placeholder: 'your query…',
      hint: 'Example: google_search[best coffee in Jakarta]',
      normalize: (v) => v.trim(),
    },
    news: {
      title: 'News',
      desc: 'Fetch the latest news articles via DuckDuckGo News.',
      label: 'Topic',
      placeholder: 'topic…',
      hint: 'Example: news[SpaceX launch]',
      normalize: (v) => v.trim(),
    },
    read_url: {
      title: 'Read URL',
      desc: 'Fetch and extract readable text content from a public URL.',
      label: 'URL',
      placeholder: 'https://…',
      hint: 'Example: read_url[https://example.com]',
      normalize: (v) => v.trim(),
    },
    wikipedia: {
      title: 'Wikipedia',
      desc: 'Look up a topic on Wikipedia and return a summary.',
      label: 'Topic',
      placeholder: 'topic…',
      hint: 'Example: wikipedia[Artificial Intelligence]',
      normalize: (v) => v.trim(),
    },
    social_search: {
      title: 'Social Search',
      desc: 'Search across X/Twitter, Instagram, TikTok, LinkedIn, Reddit, and YouTube.',
      label: 'Query',
      placeholder: 'keywords…',
      hint: 'Example: social_search[coffee shop content ideas]',
      normalize: (v) => v.trim(),
    },
    dex: {
      title: 'DEX (Swap & Bridge)',
      desc: 'Cross-chain swaps and bridging powered by LI.FI.',
      label: 'DEX',
      isWidget: true,
    },
  };

  const meta = TOOL_META[tool] || {
    title: tool ? tool : 'Tool',
    desc: 'Run a tool by providing its argument (without the bracket wrapper).',
    label: 'Argument',
    placeholder: 'argument…',
    hint: tool ? `${tool}[…]` : '',
    normalize: (v) => v.trim(),
  };

  document.title = `Ouwibo Agent — ${meta.title}`;
  if (titleEl) titleEl.textContent = meta.title;
  if (descEl) descEl.textContent = meta.desc;
  if (labelEl) labelEl.textContent = meta.label;
  if (argEl) argEl.placeholder = meta.placeholder || '';
  if (hintEl) hintEl.textContent = meta.hint || '';

  // Sidebar active state
  document.querySelectorAll('a.nav-item[data-tool]').forEach(a => {
    a.classList.toggle('nav-item--active', a.dataset.tool === tool);
  });

  // ── LI.FI Widget Integration ──────────────────────────────────────────────
  if (tool === 'dex') {
    // Hide standard tool runner UI
    const toolPanel = document.querySelector('.tool-panel');
    const toolOutputWrap = document.querySelector('.tool-output-wrap');
    const dexContainer = document.getElementById('lifi-dex-container');
    
    if (toolPanel) toolPanel.classList.add('hidden');
    if (toolOutputWrap) toolOutputWrap.classList.add('hidden');
    if (dexContainer) dexContainer.classList.remove('hidden');

    initDexWidget();
  }

  function initDexWidget() {
    const lib = window.LiFiWidgetLib;
    if (!lib || !lib.renderLiFiWidget) {
      console.error('LiFiWidgetLib not found. Bundle might not be loaded yet.');
      if (!window._lifi_retry) {
        window._lifi_retry = 0;
      }
      if (window._lifi_retry < 5) {
        window._lifi_retry++;
        setTimeout(initDexWidget, 1000);
        return;
      }
      setError('Failed to load LI.FI Widget library. Please refresh the page.');
      return;
    }

    try {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      
      const config = {
        integrator: 'OuwiboAgent',
        integrator: 'Ouwibo Agent',
        fee: 0.005,
        appearance: isDark ? 'dark' : 'light',
        theme: {
          palette: {
            primary: { main: '#f43f5e' },
            secondary: { main: '#10b981' },
          },
          shape: {
            borderRadius: 16,
            borderRadiusSecondary: 12,
          },
          typography: {
            fontFamily: "'Inter', sans-serif",
          },
          container: {
            border: '1px solid var(--border)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            background: 'transparent', // Ensure transparency
          }
        }
      };
      
      lib.renderLiFiWidget('lifi-widget-root', config);
    } catch (err) {
      console.error('Failed to init LiFiWidget:', err);
      setError('LI.FI Widget initialization failed.');
    }
  }

  function setError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.style.display = msg ? 'block' : 'none';
  }

  function setOutput(text) {
    if (!outEl) return;
    if (!text) {
      outEl.innerHTML = '';
      return;
    }
    // Render markdown and sanitize
    const rawHtml = marked.parse(text);
    outEl.innerHTML = DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['target', 'class', 'style'],
      ALLOWED_TAGS: ['a', 'div', 'span', 'i', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre', 'br', 'hr', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td']
    });
  }

  function showLandingPage() {
    if (titleEl) titleEl.textContent = 'Tools';
    if (descEl) descEl.textContent = 'Select a tool to run individual tasks or explore blockchain data.';
    
    // Hide tool runner UI
    const toolPanel = document.querySelector('.tool-panel');
    const toolOutputWrap = document.querySelector('.tool-output-wrap');
    if (toolPanel) toolPanel.classList.add('hidden');
    if (toolOutputWrap) toolOutputWrap.classList.add('hidden');

    // Create a grid
    let grid = document.getElementById('tools-grid');
    if (!grid) {
      grid = document.createElement('div');
      grid.id = 'tools-grid';
      grid.className = 'tools-grid';
      const area = document.querySelector('.tools-content-area');
      if (area) area.appendChild(grid);
    }
    
    grid.innerHTML = '';
    Object.keys(TOOL_META).forEach(key => {
      const m = TOOL_META[key];
      const card = document.createElement('a');
      card.href = `/tools.html?tool=${key}`;
      card.className = 'tool-card';
      card.innerHTML = `
        <div class="tool-card__icon">
          <svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0l-3.7 3.7Z"/><path d="m3.3 15.7 3.7-3.7a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4l-3.7 3.7a1 1 0 0 1-1.4 0l-1.6-1.6a1 1 0 0 1 0-1.4Z"/></svg>
        </div>
        <div class="tool-card__body">
          <div class="tool-card__title">${m.title}</div>
          <div class="tool-card__desc">${m.desc}</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  async function run() {
    setError('');
    if (!tool) {
      showLandingPage();
      return;
    }
    
    // ... existing run logic ...

    const raw = argEl ? String(argEl.value || '') : '';
    const arg = meta.normalize ? meta.normalize(raw) : raw.trim();
    if (!arg) {
      setError('Please enter an input.');
      return;
    }

    if (runBtn) {
      runBtn.disabled = true;
      runBtn.textContent = 'Running…';
    }

    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ tool, arg }),
      });
      if (res.status === 401 && api.showAuthModal) {
        api.clearStoredToken && api.clearStoredToken();
        api.setAuthBadge && api.setAuthBadge(false);
        api.showAuthModal('Access required. Please enter your access token.');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data && data.detail) ? String(data.detail) : `HTTP ${res.status}`);
        return;
      }
      setOutput(String(data.output || ''));
    } catch (e) {
      setError('Network error while running tool.');
    } finally {
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = 'Run';
      }
    }
  }

  if (runBtn) runBtn.addEventListener('click', run);
  if (argEl) {
    argEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') run();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = (outEl && outEl.textContent) ? outEl.textContent : '';
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch (_) {}
    });
  }

  // Initial Check
  if (!tool) {
    showLandingPage();
  }
});

