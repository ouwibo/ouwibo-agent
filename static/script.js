// static/script.js
// =============================================================================
// Ouwibo Agent — Chat Interface
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {

    // -------------------------------------------------------------------------
    // i18n helper (safe — falls back to key if i18n.js not loaded)
    // -------------------------------------------------------------------------
    function t(key, vars) {
        if (window.i18n) return window.i18n.t(key, vars);
        return key;
    }

    // Build language switcher in sidebar
    if (window.i18n) {
        window.i18n.buildSwitcher('lang-switcher');
    }

    // Re-apply translations whenever language changes
    document.addEventListener('i18n:change', () => {
        if (window.i18n) window.i18n.applyAll();
        // Update textarea placeholder live
        userInput.placeholder = t('chat.placeholder');
        // Update footer disclaimer
        const disclaimer = document.getElementById('footer-disclaimer');
        if (disclaimer) disclaimer.textContent = t('chat.footer');
    });

    // -------------------------------------------------------------------------
    // DOM refs
    // -------------------------------------------------------------------------
    const chatForm     = document.getElementById('chat-form');
    const userInput    = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendBtn      = document.getElementById('send-btn');
    const sendIcon     = document.getElementById('send-icon');
    const errorBar     = document.getElementById('error-bar');
    const errorText    = document.getElementById('error-text');
    const newChatBtn   = document.getElementById('new-chat-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const refreshBtn   = document.getElementById('refresh-btn');
    const statusDot    = document.getElementById('status-dot');

    // -------------------------------------------------------------------------
    // Session — persisten via localStorage
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Marked.js configuration
    // -------------------------------------------------------------------------
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,   // \n → <br>
            gfm: true,      // GitHub Flavored Markdown
        });
    }

    function renderMarkdown(text) {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
            // Fallback: plain text dengan line break
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML.replace(/\n/g, '<br>');
        }
        const rawHtml = marked.parse(text);
        return DOMPurify.sanitize(rawHtml, {
            ALLOWED_TAGS: [
                'p','br','b','strong','i','em','u','s','del',
                'h1','h2','h3','h4','h5','h6',
                'ul','ol','li',
                'a','blockquote','code','pre',
                'table','thead','tbody','tr','th','td',
                'hr','img','span','div',
            ],
            ALLOWED_ATTR: ['href','src','alt','title','class','target','rel'],
            FORCE_BODY: true,
        });
    }

    // -------------------------------------------------------------------------
    // Error bar
    // -------------------------------------------------------------------------
    function showError(msg) {
        errorText.textContent = msg || t('chat.err.invalid');
        errorBar.classList.remove('hidden');
        errorBar.classList.add('flex');
        clearTimeout(showError._timer);
        showError._timer = setTimeout(hideError, 8000);
    }

    function hideError() {
        errorBar.classList.add('hidden');
        errorBar.classList.remove('flex');
    }

    // -------------------------------------------------------------------------
    // Loading state
    // -------------------------------------------------------------------------
    let isLoading = false;

    function setLoading(state) {
        isLoading = state;
        sendBtn.disabled   = state;
        userInput.disabled = state;

        if (state) {
            sendIcon.className = 'fa-solid fa-spinner fa-spin text-xs';
            if (statusDot) statusDot.classList.replace('bg-emerald-500', 'bg-yellow-400');
        } else {
            sendIcon.className = 'fa-solid fa-arrow-up text-xs';
            if (statusDot) statusDot.classList.replace('bg-yellow-400', 'bg-emerald-500');
        }
    }

    // -------------------------------------------------------------------------
    // Loading bubble (typing indicator)
    // -------------------------------------------------------------------------
    let loadingBubble = null;

    function showLoadingBubble() {
        loadingBubble = document.createElement('div');
        loadingBubble.id = 'loading-bubble';
        loadingBubble.className = 'max-w-3xl mx-auto w-full flex gap-6';
        loadingBubble.setAttribute('aria-label', 'Agent sedang memproses...');
        loadingBubble.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800
                        flex items-center justify-center text-zinc-500 shrink-0"
                 aria-hidden="true">
                <i class="fa-solid fa-star text-[10px]"></i>
            </div>
            <div class="flex-1 space-y-2 pt-1">
                <div class="bg-zinc-900/50 px-5 py-4 rounded-xl inline-flex items-center gap-1.5">
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
        if (loadingBubble) {
            loadingBubble.remove();
            loadingBubble = null;
        }
    }

    // -------------------------------------------------------------------------
    // Scroll helper
    // -------------------------------------------------------------------------
    function scrollToBottom(smooth = true) {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: smooth ? 'smooth' : 'instant',
        });
    }

    // -------------------------------------------------------------------------
    // Copy helper
    // -------------------------------------------------------------------------
    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            const icon = btn.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fa-solid fa-check text-emerald-400 text-[10px]';
            setTimeout(() => { icon.className = originalClass; }, 2000);
        }).catch(() => {
            showError(t('chat.err.clipboard'));
        });
    }

    // -------------------------------------------------------------------------
    // Append message
    // -------------------------------------------------------------------------
    function appendMessage(role, text, options = {}) {
        const { animate = true } = options;
        const isAssistant = role === 'assistant';
        const lang = window.i18n ? window.i18n.getLang() : 'id';
        const time = new Date().toLocaleTimeString(lang, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });

        const wrapper = document.createElement('div');
        wrapper.setAttribute('role', 'article');
        wrapper.setAttribute('aria-label', isAssistant ? 'Pesan dari Ouwibo Agent' : 'Pesan dari Anda');

        if (animate) {
            wrapper.style.opacity = '0';
            wrapper.style.transform = 'translateY(8px)';
            wrapper.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
        }

        if (isAssistant) {
            wrapper.className = 'max-w-3xl mx-auto w-full flex gap-6';

            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 shrink-0 mt-0.5';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.innerHTML = '<i class="fa-solid fa-star text-[10px]"></i>';

            // Content
            const content = document.createElement('div');
            content.className = 'flex-1 space-y-2 min-w-0';

            // Bubble
            const bubble = document.createElement('div');
            bubble.className = 'bg-zinc-900/50 p-4 rounded-xl text-[14px] text-zinc-300 chat-prose';
            bubble.innerHTML = renderMarkdown(text);
            // Open links in new tab safely
            bubble.querySelectorAll('a').forEach(a => {
                a.setAttribute('target', '_blank');
                a.setAttribute('rel', 'noopener noreferrer');
            });

            // Meta row
            const meta = document.createElement('div');
            meta.className = 'flex items-center gap-2 text-[10px] text-zinc-600 font-medium flex-wrap';
            meta.setAttribute('aria-hidden', 'true');
            meta.innerHTML = `
                <span>Ouwibo Agent</span>
                <span class="text-zinc-700">·</span>
                <span>${t('chat.assistant')}</span>
                <span class="text-zinc-700">·</span>
                <span>${time}</span>
                <span class="ml-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">AUTO</span>
            `;

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'ml-auto flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded hover:bg-zinc-900';
            copyBtn.setAttribute('aria-label', t('chat.copy'));
            copyBtn.innerHTML = '<i class="fa-regular fa-copy text-[10px]" aria-hidden="true"></i>';
            copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));
            meta.appendChild(copyBtn);

            content.appendChild(bubble);
            content.appendChild(meta);
            wrapper.appendChild(avatar);
            wrapper.appendChild(content);

        } else {
            // User message
            wrapper.className = 'max-w-3xl mx-auto w-full flex gap-6 justify-end';

            const inner = document.createElement('div');
            inner.className = 'flex flex-col items-end gap-2 max-w-[80%]';

            // Bubble — textContent prevents XSS
            const bubble = document.createElement('div');
            bubble.className = 'bg-zinc-800/60 px-4 py-2.5 rounded-xl text-[14px] text-zinc-200 whitespace-pre-wrap break-words';
            bubble.textContent = text;

            // Meta row
            const meta = document.createElement('div');
            meta.className = 'flex items-center gap-2 text-[10px] text-zinc-600';
            meta.setAttribute('aria-hidden', 'true');

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'flex items-center gap-1 hover:text-zinc-300 transition-colors px-1 py-0.5 rounded hover:bg-zinc-900';
            copyBtn.setAttribute('aria-label', t('chat.copy'));
            copyBtn.innerHTML = '<i class="fa-regular fa-copy text-[10px]" aria-hidden="true"></i>';
            copyBtn.addEventListener('click', () => copyToClipboard(text, copyBtn));

            const youSpan = document.createElement('span');
            youSpan.textContent = t('chat.you');

            const timeSpan = document.createElement('span');
            timeSpan.textContent = time;

            meta.appendChild(youSpan);
            meta.appendChild(timeSpan);
            meta.appendChild(copyBtn);

            // Avatar
            const avatar = document.createElement('div');
            avatar.className = 'w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.25)] mt-0.5 self-end';
            avatar.setAttribute('aria-hidden', 'true');
            avatar.innerHTML = '<i class="fa-solid fa-user text-[10px]"></i>';

            inner.appendChild(bubble);
            inner.appendChild(meta);
            wrapper.appendChild(inner);
            wrapper.appendChild(avatar);
        }

        chatMessages.appendChild(wrapper);
        scrollToBottom();

        // Fade-in animation
        if (animate) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    wrapper.style.opacity = '1';
                    wrapper.style.transform = 'translateY(0)';
                });
            });
        }

        return wrapper;
    }

    // -------------------------------------------------------------------------
    // Append system / info message
    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // System message
    // -------------------------------------------------------------------------
    function appendSystemMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'max-w-3xl mx-auto w-full flex justify-center';
        wrapper.setAttribute('aria-live', 'polite');
        wrapper.innerHTML = `
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/60
                        border border-zinc-800/50 text-[11px] text-zinc-500">
                <i class="fa-solid fa-circle-info text-[9px]" aria-hidden="true"></i>
                <span>${text}</span>
            </div>
        `;
        chatMessages.appendChild(wrapper);
        scrollToBottom();
    }

    // -------------------------------------------------------------------------
    // Clear chat UI
    // -------------------------------------------------------------------------
    function clearChatUI() {
        // Keep only the first welcome message
        const children = [...chatMessages.children];
        children.slice(1).forEach(el => el.remove());
    }

    // -------------------------------------------------------------------------
    // New Chat
    // -------------------------------------------------------------------------
    function startNewChat() {
        sessionId = resetSession();
        clearChatUI();
        appendSystemMessage(t('chat.new_session'));
        userInput.focus();
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', startNewChat);
    }

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', startNewChat);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => window.location.reload());
    }

    // -------------------------------------------------------------------------
    // Textarea — auto resize + Enter key handling
    // -------------------------------------------------------------------------
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 240) + 'px';
        hideError();
    });

    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!isLoading) {
                chatForm.requestSubmit();
            }
        }
    });

    // -------------------------------------------------------------------------
    // Submit
    // -------------------------------------------------------------------------
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const text = userInput.value.trim();
        if (!text) return;

        hideError();

        // Reset textarea
        userInput.value = '';
        userInput.style.height = 'auto';

        // Render user message
        appendMessage('user', text);

        // Start loading state
        setLoading(true);
        showLoadingBubble();

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, session_id: sessionId }),
            });

            removeLoadingBubble();

            if (!response.ok) {
                let detail = `HTTP ${response.status}`;
                try {
                    const errData = await response.json();
                    detail = errData.detail || detail;
                } catch (_) { /* ignore */ }
                showError(t('chat.err.server', { detail }));
                return;
            }

            const data = await response.json();

            if (!data || typeof data.response !== 'string') {
                showError(t('chat.err.invalid'));
                return;
            }

            appendMessage('assistant', data.response);

        } catch (err) {
            removeLoadingBubble();
            console.error('[Ouwibo] Fetch error:', err);

            if (err instanceof TypeError && err.message.includes('fetch')) {
                showError(t('chat.err.connect'));
            } else {
                showError(t('chat.err.server', { detail: err.message }));
            }

        } finally {
            setLoading(false);
            userInput.focus();
        }
    });

    // -------------------------------------------------------------------------
    // Keyboard shortcut — Cmd+K focuses input OR opens search
    // -------------------------------------------------------------------------
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            userInput.focus();
        }
        if (e.key === 'Escape' && document.activeElement === userInput) {
            userInput.blur();
        }
    });

    // -------------------------------------------------------------------------
    // Header search bar → navigate to search page
    // -------------------------------------------------------------------------
    const headerSearch = document.getElementById('header-search');
    if (headerSearch) {
        headerSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && headerSearch.value.trim()) {
                window.location.href = '/search.html?q=' + encodeURIComponent(headerSearch.value.trim());
            }
        });
    }

    // -------------------------------------------------------------------------
    // Init
    // -------------------------------------------------------------------------
    userInput.focus();
    scrollToBottom(false);
});
