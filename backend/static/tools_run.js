// static/tools_run.js — Run tools from the Tools page (no chat needed)

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('tool-run-overlay');
  const titleEl = document.getElementById('tool-run-title');
  const descEl = document.getElementById('tool-run-desc');
  const inputEl = document.getElementById('tool-run-input');
  const outEl = document.getElementById('tool-run-output');
  const errEl = document.getElementById('tool-run-error');
  const runBtn = document.getElementById('tool-run-submit');
  const closeBtn = document.getElementById('tool-run-close');
  const copyBtn = document.getElementById('tool-run-copy');

  if (!overlay || !inputEl || !outEl || !runBtn) return;

  const api = (window.__Ouwibo || {});
  const authHeaders = typeof api.authHeaders === 'function'
    ? api.authHeaders
    : (extra = {}) => ({ 'Content-Type': 'application/json', ...extra });

  const TOOL_WHITELIST = new Set([
    'search',
    'google_search',
    'phind',
    'find_script',
    'calculate',
    'weather',
    'wikipedia',
    'news',
    'currency',
    'datetime',
    'read_url',
    'translate',
    'dictionary',
    'stocks',
    'crypto',
    'ens',
    'wallet',
    'social_search',
  ]);

  let _activeTool = '';

  function openModal(tool, arg, title, desc) {
    _activeTool = tool;
    if (titleEl) titleEl.textContent = title || `Run: ${tool}`;
    if (descEl) descEl.textContent = desc || '';
    inputEl.value = arg || '';
    outEl.textContent = '';
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }
    overlay.classList.remove('tool-run-overlay--hidden');
    setTimeout(() => inputEl.focus(), 80);
  }

  function closeModal() {
    overlay.classList.add('tool-run-overlay--hidden');
    _activeTool = '';
  }

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !overlay.classList.contains('tool-run-overlay--hidden')) closeModal();
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const text = outEl.textContent || '';
      if (!text) return;
      try { await navigator.clipboard.writeText(text); } catch (_) {}
    });
  }

  async function runTool() {
    const tool = _activeTool;
    const arg = (inputEl.value || '').trim();
    if (!tool) return;

    runBtn.disabled = true;
    outEl.textContent = 'Running...';
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

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
        outEl.textContent = '';
        return;
      }

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const d = await res.json(); detail = d.detail || detail; } catch (_) {}
        if (errEl) { errEl.textContent = detail; errEl.style.display = ''; }
        outEl.textContent = '';
        return;
      }

      const data = await res.json();
      outEl.textContent = (data && typeof data.output === 'string') ? data.output : 'No output.';
    } catch (e) {
      if (errEl) { errEl.textContent = 'Network error.'; errEl.style.display = ''; }
      outEl.textContent = '';
    } finally {
      runBtn.disabled = false;
    }
  }

  runBtn.addEventListener('click', runTool);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      runTool();
    }
  });

  // Inject a Run button next to each command tag.
  document.querySelectorAll('#tools-grid .tool-card').forEach(card => {
    const tag = card.querySelector('.tag');
    if (!tag) return;
    const txt = (tag.textContent || '').trim();
    const m = txt.match(/^([a-zA-Z_]+)\[(.*)\]$/);
    if (!m) return;
    const tool = m[1].toLowerCase();
    const arg = (m[2] || '').trim();
    if (!TOOL_WHITELIST.has(tool)) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tool-run-btn';
    btn.textContent = 'Run';
    btn.addEventListener('click', () => {
      const title = (card.querySelector('h3')?.textContent || '').trim() || tool;
      const desc = (card.querySelector('p')?.textContent || '').trim();
      openModal(tool, arg, title, desc);
    });

    const wrap = document.createElement('div');
    wrap.className = 'tool-command-row';
    tag.parentNode.insertBefore(wrap, tag);
    wrap.appendChild(tag);
    wrap.appendChild(btn);
  });
});

