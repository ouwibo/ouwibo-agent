// static/script.js — Ouwibo Agent

document.addEventListener('DOMContentLoaded', () => {

  // ── Theme Switcher ─────────────────────────────────────────────────────────
  const html = document.documentElement;
  const THEME_KEY = 'ouwibo_theme';

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    document.querySelectorAll('.topbar-theme-mode__btn').forEach(btn => {
      btn.classList.toggle('topbar-theme-mode__btn--active', btn.dataset.themeVal === theme);
    });
  }

  const savedTheme = localStorage.getItem(THEME_KEY) || 'system';
  applyTheme(savedTheme);

  document.querySelectorAll('.topbar-theme-mode__btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeVal));
  });

  // ── Nav section toggle (collapsible) ──────────────────────────────────────
  document.querySelectorAll('.nav-section__label').forEach(btn => {
    btn.addEventListener('click', () => {
      const section = btn.closest('.nav-section');
      const isCollapsed = section.classList.toggle('nav-section--collapsed');
      btn.setAttribute('aria-expanded', String(!isCollapsed));
    });
  });

  // ── Sidebar collapse / expand ──────────────────────────────────────────────
  const shell       = document.getElementById('shell');
  const sidebar     = document.getElementById('sidebar');
  const backdrop    = document.getElementById('nav-backdrop');
  const collapseBtn = document.getElementById('nav-collapse-btn');
  const mobileBtn   = document.getElementById('nav-toggle-mobile');
  const SIDEBAR_KEY = 'ouwibo_sidebar';

  function isMobile() { return window.innerWidth < 769; }

  function openSidebar() {
    if (isMobile()) {
      sidebar.style.transform = 'translateX(0)';
      backdrop.style.display = 'block';
      document.body.style.overflow = 'hidden';
    } else {
      shell.classList.remove('shell--nav-collapsed');
    }
    localStorage.setItem(SIDEBAR_KEY, 'open');
  }

  function closeSidebar() {
    if (isMobile()) {
      sidebar.style.transform = 'translateX(-100%)';
      backdrop.style.display = 'none';
      document.body.style.overflow = '';
    } else {
      shell.classList.add('shell--nav-collapsed');
    }
    localStorage.setItem(SIDEBAR_KEY, 'closed');
  }

  function toggleSidebar() {
    if (isMobile()) {
      const isOpen = sidebar.style.transform === 'translateX(0px)';
      isOpen ? closeSidebar() : openSidebar();
    } else {
      const isCollapsed = shell.classList.contains('shell--nav-collapsed');
      isCollapsed ? openSidebar() : closeSidebar();
    }
  }

  // Init sidebar state
  if (isMobile()) {
    sidebar.style.transform = 'translateX(-100%)';
    sidebar.style.transition = 'transform 0.3s ease';
  } else {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved === 'closed') shell.classList.add('shell--nav-collapsed');
  }

  if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);
  if (mobileBtn)   mobileBtn.addEventListener('click', toggleSidebar);
  if (backdrop)    backdrop.addEventListener('click', closeSidebar);

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      sidebar.style.transform = '';
      backdrop.style.display = 'none';
      document.body.style.overflow = '';
    } else {
      shell.classList.remove('shell--nav-collapsed');
    }
  });

  // ── Expand / fullscreen ────────────────────────────────────────────────────
  const expandBtn = document.getElementById('expand-btn');
  let isExpanded = false;

  if (expandBtn) {
    expandBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      const icon = expandBtn.querySelector('svg');
      if (isExpanded) {
        shell.classList.add('shell--nav-collapsed');
        if (icon) icon.innerHTML = '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="3" y2="21"/><line x1="21" y1="3" x2="14" y2="10"/>';
        expandBtn.title = 'Exit fullscreen';
      } else {
        shell.classList.remove('shell--nav-collapsed');
        if (icon) icon.innerHTML = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>';
        expandBtn.title = 'Fullscreen';
      }
    });
  }

  // ── Session management ─────────────────────────────────────────────────────
  function generateSessionId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return 'session-' + crypto.randomUUID();
    }
    return 'session-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getSessionId() {
    let id = localStorage.getItem('ouwibo_session_id');
    if (!id) { id = generateSessionId(); localStorage.setItem('ouwibo_session_id', id); }
    return id;
  }

  function resetSession() {
    const id = generateSessionId();
    localStorage.setItem('ouwibo_session_id', id);
    return id;
  }

  let sessionId = getSessionId();

  // ── Markdown renderer ──────────────────────────────────────────────────────
  if (typeof marked !== 'undefined') {
    marked.setOptions({ breaks: true, gfm: true });
  }

  function renderMarkdown(text) {
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
      const d = document.createElement('div');
      d.textContent = text;
      return d.innerHTML.replace(/\n/g, '<br>');
    }
    return DOMPurify.sanitize(marked.parse(text), {
      ALLOWED_TAGS: ['p','br','b','strong','i','em','u','s','del','h1','h2','h3','h4','h5','h6',
        'ul','ol','li','a','blockquote','code','pre','table','thead','tbody','tr','th','td','hr','span','div'],
      ALLOWED_ATTR: ['href','src','alt','title','class','target','rel'],
      FORCE_BODY: true,
    });
  }

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const chatForm     = document.getElementById('chat-form');
  const userInput    = document.getElementById('user-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendBtn      = document.getElementById('send-btn');
  const sendIcon     = document.getElementById('send-icon');
  const errorBar     = document.getElementById('error-bar');
  const errorText    = document.getElementById('error-text');
  const statusDot    = document.getElementById('status-dot');

  if (!chatForm || !userInput || !chatMessages) return;

  // ── Error bar ──────────────────────────────────────────────────────────────
  function showError(msg) {
    if (!errorBar || !errorText) return;
    errorText.textContent = msg || 'Something went wrong.';
    errorBar.classList.add('chat-error--visible');
    clearTimeout(showError._t);
    showError._t = setTimeout(hideError, 9000);
  }

  function hideError() {
    if (errorBar) errorBar.classList.remove('chat-error--visible');
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  let isLoading = false;

  function setLoading(state) {
    isLoading = state;
    if (sendBtn) sendBtn.disabled = state;
    if (userInput) userInput.disabled = state;

    if (sendIcon) {
      if (state) {
        sendIcon.innerHTML = '<circle cx="12" cy="12" r="10" opacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round" fill="none" stroke="currentColor" stroke-width="2"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></path>';
        sendIcon.setAttribute('fill', 'none');
      } else {
        sendIcon.innerHTML = '<path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>';
        sendIcon.setAttribute('fill', 'currentColor');
      }
    }
    if (statusDot) {
      statusDot.className = state
        ? 'sidebar-version__status'
        : 'sidebar-version__status sidebar-connection-status--online';
    }
  }

  // ── Typing indicator ───────────────────────────────────────────────────────
  let typingEl = null;

  function showTyping() {
    typingEl = document.createElement('div');
    typingEl.className = 'message message--agent';
    typingEl.innerHTML = `
      <div class="message__avatar message__avatar--agent" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width:14px;height:14px"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm0 14a8 8 0 0 1-6.4-3.2C5.6 14.8 9.6 14 12 14s6.4.8 6.4 2.8A8 8 0 0 1 12 20z"/></svg>
      </div>
      <div class="message__body">
        <div class="message__bubble">
          <div class="typing-dots">
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
            <span class="typing-dot"></span>
          </div>
        </div>
      </div>`;
    chatMessages.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTyping() {
    if (typingEl) { typingEl.remove(); typingEl = null; }
  }

  // ── Scroll ─────────────────────────────────────────────────────────────────
  function scrollToBottom(smooth = true) {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  }

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  function copyText(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
      btn.style.color = '#22c55e';
      setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
    }).catch(() => showError('Failed to copy to clipboard.'));
  }

  // ── Append message ─────────────────────────────────────────────────────────
  function appendMessage(role, text) {
    const isAgent = role === 'assistant';
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    const wrapper = document.createElement('div');
    wrapper.className = `message message--${isAgent ? 'agent' : 'user'} fade-in`;
    wrapper.setAttribute('role', 'article');
    wrapper.style.opacity = '0';
    wrapper.style.transform = 'translateY(5px)';
    wrapper.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

    if (isAgent) {
      const bubble = document.createElement('div');
      bubble.className = 'message__bubble chat-prose';
      bubble.innerHTML = renderMarkdown(text);
      bubble.querySelectorAll('a').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'message__copy-btn';
      copyBtn.setAttribute('aria-label', 'Copy message');
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      copyBtn.addEventListener('click', () => copyText(text, copyBtn));

      const meta = document.createElement('div');
      meta.className = 'message__meta';
      meta.setAttribute('aria-hidden', 'true');
      meta.innerHTML = `<span>Assistant</span><span>·</span><span>${time}</span><span class="model-badge" style="padding:1px 7px;font-size:10px;"><span class="model-badge__dot"></span>AUTO</span>`;
      meta.appendChild(copyBtn);

      wrapper.innerHTML = `<div class="message__avatar message__avatar--agent" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width:14px;height:14px"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 4a3 3 0 1 1-3 3 3 3 0 0 1 3-3zm0 14a8 8 0 0 1-6.4-3.2C5.6 14.8 9.6 14 12 14s6.4.8 6.4 2.8A8 8 0 0 1 12 20z"/></svg>
      </div>`;
      const body = document.createElement('div');
      body.className = 'message__body';
      body.appendChild(bubble);
      body.appendChild(meta);
      wrapper.appendChild(body);

    } else {
      const bubble = document.createElement('div');
      bubble.className = 'message__bubble';
      bubble.textContent = text; // safe — no innerHTML for user input

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'message__copy-btn';
      copyBtn.setAttribute('aria-label', 'Copy message');
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      copyBtn.addEventListener('click', () => copyText(text, copyBtn));

      const meta = document.createElement('div');
      meta.className = 'message__meta';
      meta.setAttribute('aria-hidden', 'true');
      meta.innerHTML = `<span>You</span><span>·</span><span>${time}</span>`;
      meta.appendChild(copyBtn);

      const body = document.createElement('div');
      body.className = 'message__body';
      body.appendChild(bubble);
      body.appendChild(meta);

      wrapper.innerHTML = '';
      wrapper.appendChild(body);
      wrapper.innerHTML += `<div class="message__avatar message__avatar--user" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" style="width:12px;height:12px"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>`;
      // re-insert body since innerHTML reset it
      wrapper.insertBefore(body, wrapper.firstChild);
    }

    chatMessages.appendChild(wrapper);
    scrollToBottom();

    requestAnimationFrame(() => requestAnimationFrame(() => {
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'translateY(0)';
    }));

    return wrapper;
  }

  // ── System message ─────────────────────────────────────────────────────────
  function appendSystem(text) {
    const el = document.createElement('div');
    el.className = 'system-message';
    const inner = document.createElement('div');
    inner.className = 'system-message__inner';
    inner.innerHTML = '<svg viewBox="0 0 24 24" style="width:11px;height:11px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
    const txt = document.createElement('span');
    txt.textContent = text;
    inner.appendChild(txt);
    el.appendChild(inner);
    chatMessages.appendChild(el);
    scrollToBottom();
  }

  // ── New chat ───────────────────────────────────────────────────────────────
  function startNewChat() {
    sessionId = resetSession();
    // Clear messages but keep welcome
    const children = [...chatMessages.children];
    children.slice(1).forEach(el => el.remove());
    appendSystem('New session started.');
    userInput.focus();
  }

  ['new-chat-btn', 'new-chat-header-btn', 'clear-chat-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', startNewChat);
  });

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => location.reload());

  // ── Textarea auto-resize ───────────────────────────────────────────────────
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 220) + 'px';
    if (sendBtn) sendBtn.disabled = !userInput.value.trim() || isLoading;
    hideError();
  });

  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && userInput.value.trim()) chatForm.requestSubmit();
    }
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  chatForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (isLoading) return;
    const text = userInput.value.trim();
    if (!text) return;

    hideError();
    userInput.value = '';
    userInput.style.height = 'auto';
    if (sendBtn) sendBtn.disabled = true;

    appendMessage('user', text);
    setLoading(true);
    showTyping();

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      hideTyping();

      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const d = await res.json(); detail = d.detail || detail; } catch (_) {}
        showError(`Failed to get response: ${detail}`);
        return;
      }

      const data = await res.json();
      if (!data || typeof data.response !== 'string') {
        showError('Invalid response from server.');
        return;
      }
      appendMessage('assistant', data.response);

    } catch (err) {
      hideTyping();
      console.error('[Ouwibo]', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        showError('Cannot connect to server. Make sure the server is running.');
      } else {
        showError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      userInput.focus();
    }
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    // Cmd/Ctrl+K → focus input
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (userInput) { userInput.focus(); userInput.select(); }
    }
    // Escape → close sidebar on mobile
    if (e.key === 'Escape') {
      if (isMobile()) closeSidebar();
      else if (document.activeElement === userInput) userInput.blur();
    }
  });

  // ── Language switcher ──────────────────────────────────────────────────────
  if (window.i18n) window.i18n.buildSwitcher('lang-switcher');

  // ── Init ───────────────────────────────────────────────────────────────────
  if (userInput) userInput.focus();
  scrollToBottom(false);

});
