// static/tool.js — Single-tool page runner

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

  async function run() {
    setError('');
    if (!tool) {
      setError('Missing tool. Open this page as /tool.html?tool=wallet (or other tool name).');
      return;
    }

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
});

