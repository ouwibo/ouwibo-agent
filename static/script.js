// static/script.js — Ouwibo Agent

document.addEventListener('DOMContentLoaded', () => {

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const chatForm      = document.getElementById('chat-form');
    const userInput     = document.getElementById('user-input');
    const chatMessages  = document.getElementById('chat-messages');
    const sendBtn       = document.getElementById('send-btn');
    const sendIcon      = document.getElementById('send-icon');
    const errorBar      = document.getElementById('error-bar');
    const errorText     = document.getElementById('error-text');
    const newChatBtn    = document.getElementById('new-chat-btn');
    const newChatMini   = document.getElementById('new-chat-mini');
    const clearChatBtn  = document.getElementById('clear-chat-btn');
    const refreshBtn    = document.getElementById('refresh-btn');
    const statusDot     = document.getElementById('status-dot');
    const sidebar       = document.getElementById('sidebar');
    const sidebarMini   = document.getElementById('sidebar-mini');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarExpand = document.getElementById('sidebar-expand');
    const expandBtn     = document.getElementById('expand-btn');

    // ── Session ───────────────────────────────────────────────────────────────
    function generateSessionId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return 'session-' + crypto.randomUUID();
        }
        return 'session-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function getSessionId() {
        let id = localStorage.getItem('ouwibo_session_id');
        if (!id) {
            id = generateSessionId();
            localStorage.setItem('ouwibo_session_id', id);
        }
        return id;
    }

    function resetSession() {
        const id = generateSessionId();
        localStorage.setItem('ouwibo_session_id', id);
        return id;
    }

    let sessionId = getSessionId();

    // ── Marked.js ─────────────────────────────────────────────────────────────
    if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });
    }

    function renderMarkdown(text) {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML.replace(/\n/g, '<br>');
        }
        const rawHtml = marked.parse(text);
        return DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: [
                'p','br','b','strong','i','em','u','s','del',
                'h1','h2','h3','h4','h5','h6',
                'ul','ol','li','a','blockquote','code','pre',
                'table','thead','tbody','tr','th','td',
                'hr','span','div',
            ],
            ALLOWED_ATTR: ['href','src','alt','title','class','target','rel'],
            FORCE_BODY: true,
        });
    }

    // ── Error bar ─────────────────────────────────────────────────────────────
    function showError(msg) {
        errorText.textContent = msg || 'Something went wrong.';
        errorBar.classList.remove('hidden');
        errorBar.classList.add('flex');
        clearTimeout(showError._t);
        showError._t = setTimeout(hideError, 8000);
    }

    function hideError() {
        errorBar.classList.add('hidden');
        errorBar.classList.remove('flex');
    }

    // ── Loading state ─────────────────────────────────────────────────────────
    let isLoading = false;

    function setLoading(state) {
        isLoading = state;
        sendBtn.disabled   = state;
        userInput.disabled = state;
        sendIcon.className = state
            ? 'fa-solid fa-spinner fa-spin text-xs'
            : 'fa-solid fa-arrow-up text-xs';
        if (statusDot) {
            if (state) {
                statusDot.classList.replace('bg-emerald-500', 'bg-yellow-400');
            } else {
                statusDot.classList.replace('bg-yellow-400', 'bg-emerald-500');
            }
        }
    }

    // ── Loading bubble ────────────────────────────────────────────────────────
    let loadingBubble = null;

    function showLoadingBubble() {
        loadingBubble = document.createElement('div');
        loadingBubble.className = 'max-w-2xl mx-auto w-full flex gap-4';
        loadingBubble.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800
                        flex items-center justify-center shrink-0 mt-0.5">
                <i class="fa-solid fa-robot text-accent text-[11px]"></i>
            </div>
            <div class="flex-1 pt-1">
                <div class="bg-zinc-900/60 border border-zinc-800/40 px-5 py-4
                            rounded-2xl rounded-tl-sm inline-flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0ms]"></span>
                    <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:150ms]"></span>
                    <span class="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:300ms]"></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(loadingBubble);
        scrollToBottom();
    }

    function removeLoadingBubble() {
        if (loadingBubble) { loadingBubble.remove(); loadingBubble = null; }
    }

    // ── Scroll ────────────────────────────────────────────────────────────────
    function scrollToBottom(smooth = true) {
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
    }

    // ── Copy ──────────────────────────────────────────────────────────────────
    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            const icon = btn.querySelector('i');
            const orig = icon.className;
            icon.className = 'fa-solid fa-check text-emerald-400 text-[10px]';
            setTimeout(() => { icon.className = orig; }, 2000);
        }).catch(() => showError('Failed to copy to clipboard.'));
    }

    // ── Append message ────────────────────────────────────────────────────────
    function appendMessage(role, text) {
        const isAssistant = role === 'assistant';
        const time = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: false,
        });

        const wrapper = document.createElement('div');
        wrapper.setAttribute('role', 'article');
        wrapper.style.opacity   = '0';
        wrapper.style.transform = 'translateY(6px)';
        wrapper.style.transition = 'opacity 0.2s ease, transform 0.2s ease';

        if (isAssistant) {
            wrapper.className = 'max-w-2xl mx-auto w-full flex gap-4';

            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.innerHTML = '<i class="fa-solid fa-robot text-accent text-[11px]"></i>';

            // Content
            const content = document.createElement('div');
            content.className = 'flex-1 min-w-0 space-y-1.5';

            // Bubble
            const bubble = document.createElement('div');
            bubble.className = 'bg-zinc-900/60 border border-zinc-800/40 px-4 py-3.5 rounded-2xl rounded-tl-sm text-[14px] text-zinc-300 chat-prose';
            bubble.innerHTML = renderMarkdown(text);
            bubble.querySelectorAll('a').forEach(a => {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            });

            // Meta
            const meta = document.createElement('div');
            meta.className = 'flex items-center gap-2 px-1 text-[11px] text-zinc-600';
            meta.setAttribute('aria-hidden', 'true');

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'ml-auto flex items-center gap-1 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded-md hover:bg-zinc-800';
            copyBtn.setAttribute('aria-label', 'Copy message');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy text-[10px]"></i>';
            copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));

            meta.innerHTML = `
                <span>Assistant</span>
                <span class="text-zinc-700">·</span>
                <span>${time}</span>
                <span class="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md text-[10px]">AUTO</span>
            `;
            meta.appendChild(copyBtn);

            content.appendChild(bubble);
            content.appendChild(meta);
            wrapper.appendChild(avatar);
            wrapper.appendChild(content);

        } else {
            wrapper.className = 'max-w-2xl mx-auto w-full flex gap-3 justify-end';

            const inner = document.createElement('div');
            inner.className = 'flex flex-col items-end gap-1.5 max-w-[80%]';

            // Bubble — textContent prevents XSS
            const bubble = document.createElement('div');
            bubble.className = 'bg-zinc-800/70 border border-zinc-700/40 px-4 py-2.5 rounded-2xl rounded-tr-sm text-[14px] text-zinc-100 whitespace-pre-wrap break-words';
            bubble.textContent = text;

            // Meta
            const meta = document.createElement('div');
            meta.className = 'flex items-center gap-2 px-1 text-[11px] text-zinc-600';
            meta.setAttribute('aria-hidden', 'true');

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'flex items-center gap-1 hover:text-zinc-300 transition-colors px-1 py-0.5 rounded-md hover:bg-zinc-800';
            copyBtn.setAttribute('aria-label', 'Copy message');
            copyBtn.innerHTML = '<i class="fa-regular fa-copy text-[10px]"></i>';
            copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));

            meta.appendChild(document.createTextNode('You'));
            const dot = document.createElement('span'); dot.textContent = '·'; meta.appendChild(dot);
            const ts  = document.createElement('span'); ts.textContent = time; meta.appendChild(ts);
            meta.appendChild(copyBtn);

            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.25)] mt-0.5 self-end';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.innerHTML = '<i class="fa-solid fa-user text-[10px]"></i>';

            inner.appendChild(bubble);
            inner.appendChild(meta);
            wrapper.appendChild(inner);
            wrapper.appendChild(avatar);
        }

        chatMessages.appendChild(wrapper);
        scrollToBottom();

        requestAnimationFrame(() => requestAnimationFrame(() => {
            wrapper.style.opacity   = '1';
            wrapper.style.transform = 'translateY(0)';
        }));

        return wrapper;
    }

    // ── System message ────────────────────────────────────────────────────────
    function appendSystemMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'max-w-2xl mx-auto w-full flex justify-center';
        const inner = document.createElement('div');
        inner.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60 border border-zinc-800/50 text-[11px] text-zinc-500';
        inner.innerHTML = `<i class="fa-solid fa-circle-info text-[9px]"></i>`;
        const txt = document.createElement('span');
        txt.textContent = text;
        inner.appendChild(txt);
        wrapper.appendChild(inner);
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    }

    // ── Clear chat ────────────────────────────────────────────────────────────
    function clearChatUI() {
        const children = [...chatMessages.children];
        children.slice(1).forEach(el => el.remove());
    }

    function startNewChat() {
        sessionId = resetSession();
        clearChatUI();
        appendSystemMessage('New session started.');
        userInput.focus();
    }

    if (newChatBtn)   newChatBtn.addEventListener('click', startNewChat);
    if (newChatMini)  newChatMini.addEventListener('click', startNewChat);
    if (clearChatBtn) clearChatBtn.addEventListener('click', startNewChat);
    if (refreshBtn)   refreshBtn.addEventListener('click', () => window.location.reload());

    // ── Sidebar toggle ────────────────────────────────────────────────────────
    let sidebarOpen = true;

    function toggleSidebar() {
        sidebarOpen = !sidebarOpen;
        if (sidebarOpen) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('flex');
            if (sidebarMini) {
                sidebarMini.classList.add('hidden');
                sidebarMini.classList.remove('flex');
            }
        } else {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex');
            if (sidebarMini) {
                sidebarMini.classList.remove('hidden');
                sidebarMini.classList.add('flex');
            }
        }
    }

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (sidebarExpand) sidebarExpand.addEventListener('click', toggleSidebar);

    // ── Expand / fullscreen ───────────────────────────────────────────────────
    let isExpanded = false;

    if (expandBtn) {
        expandBtn.addEventListener('click', () => {
            isExpanded = !isExpanded;
            const icon = expandBtn.querySelector('i');
            if (isExpanded) {
                if (sidebar)     { sidebar.classList.add('hidden');     sidebar.classList.remove('flex'); }
                if (sidebarMini) { sidebarMini.classList.add('hidden'); sidebarMini.classList.remove('flex'); }
                sidebarOpen = false;
                icon.className = 'fa-solid fa-compress text-[11px]';
                expandBtn.setAttribute('title', 'Exit fullscreen');
            } else {
                sidebar.classList.remove('hidden');
                sidebar.classList.add('flex');
                if (sidebarMini) sidebarMini.classList.add('hidden');
                sidebarOpen = true;
                icon.className = 'fa-solid fa-expand text-[11px]';
                expandBtn.setAttribute('title', 'Fullscreen');
            }
        });
    }

    // ── Language switcher ─────────────────────────────────────────────────────
    if (window.i18n) {
        window.i18n.buildSwitcher('lang-switcher');
    }

    // ── Textarea auto-resize ──────────────────────────────────────────────────
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 240) + 'px';
        hideError();
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading) chatForm.requestSubmit();
        }
    });

    // ── Submit ────────────────────────────────────────────────────────────────
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const text = userInput.value.trim();
        if (!text) return;

        hideError();
        userInput.value = '';
        userInput.style.height = 'auto';

        appendMessage('user', text);
        setLoading(true);
        showLoadingBubble();

        try {
            const res = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, session_id: sessionId }),
            });

            removeLoadingBubble();

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
            removeLoadingBubble();
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

    // ── Keyboard shortcuts ────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl+K → focus input
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            userInput.focus();
            userInput.select();
        }
        // Escape → blur
        if (e.key === 'Escape' && document.activeElement === userInput) {
            userInput.blur();
        }
    });

    // ── Init ──────────────────────────────────────────────────────────────────
    userInput.focus();
    scrollToBottom(false);
});
