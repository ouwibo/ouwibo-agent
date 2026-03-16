// static/search.js — Ouwibo Search Logic
(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const viewHome       = document.getElementById('view-home');
  const viewResults    = document.getElementById('view-results');
  const formHome       = document.getElementById('form-home');
  const formResults    = document.getElementById('form-results');
  const inputHome      = document.getElementById('input-home');
  const inputResults   = document.getElementById('input-results');
  const clearHome      = document.getElementById('clear-home');
  const clearResults   = document.getElementById('clear-results');
  const luckyBtn       = document.getElementById('lucky-btn');
  const retryBtn       = document.getElementById('retry-btn');
  const loadMoreBtn    = document.getElementById('load-more-btn');
  const loadMoreArea   = document.getElementById('load-more-area');
  const resultsList    = document.getElementById('results-list');
  const resultsStats   = document.getElementById('results-stats');
  const resultsLoading = document.getElementById('results-loading');
  const resultsError   = document.getElementById('results-error');
  const resultsErrorTx = document.getElementById('results-error-text');
  const resultsEmpty   = document.getElementById('results-empty');
  const resultsEmptyTx = document.getElementById('results-empty-text');
  const filterTabs     = document.querySelectorAll('.filter-tab');
  const langHint       = document.getElementById('lang-hint');

  // ── State ───────────────────────────────────────────────────────────────────
  let currentQuery   = '';
  let currentCount   = 0;
  let maxResults     = 10;
  let isLoading      = false;
  let lastResults    = [];
  let currentFilter  = 'all';

  // ── i18n helper (safe fallback if i18n.js not loaded yet) ──────────────────
  function t(key, vars) {
    if (window.i18n) return window.i18n.t(key, vars);
    return key;
  }

  // ── View switching ──────────────────────────────────────────────────────────
  function showHome() {
    viewHome.classList.remove('hidden');
    viewHome.classList.add('flex');
    viewResults.classList.add('hidden');
    viewResults.classList.remove('flex');
    inputHome.focus();
  }

  function showResults() {
    viewHome.classList.add('hidden');
    viewHome.classList.remove('flex');
    viewResults.classList.remove('hidden');
    viewResults.classList.add('flex');
  }

  // ── URL state ───────────────────────────────────────────────────────────────
  function getQueryFromURL() {
    return new URLSearchParams(window.location.search).get('q') || '';
  }

  function pushURL(query) {
    const url = query
      ? '/search.html?q=' + encodeURIComponent(query)
      : '/search.html';
    history.pushState({ query: query }, '', url);
  }

  // ── Input clear buttons ─────────────────────────────────────────────────────
  function syncClearBtn(input, clearBtn) {
    clearBtn.classList.toggle('hidden', !input.value);
  }

  if (clearHome) {
    inputHome.addEventListener('input', function () { syncClearBtn(inputHome, clearHome); });
    clearHome.addEventListener('click', function () {
      inputHome.value = '';
      syncClearBtn(inputHome, clearHome);
      inputHome.focus();
    });
  }

  if (clearResults) {
    inputResults.addEventListener('input', function () { syncClearBtn(inputResults, clearResults); });
    clearResults.addEventListener('click', function () {
      inputResults.value = '';
      syncClearBtn(inputResults, clearResults);
      inputResults.focus();
    });
  }

  // ── Filter tabs ─────────────────────────────────────────────────────────────
  filterTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      filterTabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      currentFilter = tab.getAttribute('data-filter') || 'all';
      // Re-run the current query with the new filter, similar to Google tabs.
      if (currentQuery && !isLoading) doSearch(currentQuery, { maxResults: 10 });
    });
  });

  // ── Render helpers ──────────────────────────────────────────────────────────
  function sanitize(str) {
    if (window.DOMPurify) return DOMPurify.sanitize(str);
    // Fallback: basic entity encode
    const el = document.createElement('div');
    el.textContent = str;
    return el.innerHTML;
  }

  function highlightQuery(text, query) {
    if (!query || !text) return sanitize(text);
    const safe = sanitize(text);
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(' + escapedQ + ')', 'gi');
    return safe.replace(re, '<mark class="bg-transparent text-zinc-100 font-medium">$1</mark>');
  }

  function faviconUrl(domain) {
    if (!domain) return '';
    return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=32';
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function buildResultCard(item, query) {
    const card = document.createElement('article');
    card.className = 'result-card py-5 border-b border-zinc-800/40 last:border-0';
    card.setAttribute('role', 'listitem');

    const domain   = sanitize(item.domain || '');
    const path     = sanitize(truncate(item.path || '', 55));
    const title    = item.title || item.url || '';
    const snippet  = item.snippet || '';
    const url      = item.url || '#';

    // Breadcrumb row
    const breadRow = document.createElement('div');
    breadRow.className = 'flex items-center gap-1.5 mb-1';

    if (domain) {
      const favicon = document.createElement('img');
      favicon.src    = faviconUrl(domain);
      favicon.alt    = '';
      favicon.width  = 16;
      favicon.height = 16;
      favicon.className = 'w-4 h-4 rounded-sm shrink-0';
      favicon.onerror   = function () { this.style.display = 'none'; };
      breadRow.appendChild(favicon);
    }

    const domainSpan = document.createElement('span');
    domainSpan.className = 'text-[12px] text-zinc-400 truncate';
    domainSpan.textContent = domain;
    breadRow.appendChild(domainSpan);

    if (path) {
      const sep = document.createElement('span');
      sep.className   = 'text-zinc-600 text-[11px]';
      sep.textContent = '›';
      breadRow.appendChild(sep);

      const pathSpan = document.createElement('span');
      pathSpan.className = 'text-[11px] text-zinc-600 truncate max-w-[200px]';
      pathSpan.textContent = path;
      breadRow.appendChild(pathSpan);
    }

    // Title link
    const titleLink = document.createElement('a');
    titleLink.href      = url;
    titleLink.target    = '_blank';
    titleLink.rel       = 'noopener noreferrer';
    titleLink.className = 'block text-[17px] font-medium leading-snug mt-0.5 ' +
      'text-[#4285F4] hover:underline group-hover:underline cursor-pointer line-clamp-2';
    titleLink.innerHTML = highlightQuery(title, query);

    // Snippet
    const snippetEl = document.createElement('p');
    snippetEl.className = 'mt-1.5 text-[13px] text-zinc-400 leading-relaxed line-clamp-3';
    snippetEl.innerHTML = highlightQuery(truncate(snippet, 280), query);

    card.appendChild(breadRow);
    card.appendChild(titleLink);
    card.appendChild(snippetEl);

    // Animate in
    card.style.opacity   = '0';
    card.style.transform = 'translateY(6px)';
    card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.style.opacity   = '1';
        card.style.transform = 'translateY(0)';
      });
    });

    return card;
  }

  // ── State UI ────────────────────────────────────────────────────────────────
  function setLoading(state) {
    isLoading = state;
    resultsLoading.classList.toggle('hidden', !state);
    resultsError.classList.add('hidden');
    resultsEmpty.classList.add('hidden');
    if (state) {
      resultsList.innerHTML    = '';
      resultsStats.textContent = '';
      loadMoreArea.classList.add('hidden');
    }
  }

  function showError(msg) {
    resultsLoading.classList.add('hidden');
    resultsError.classList.remove('hidden');
    resultsEmpty.classList.add('hidden');
    resultsErrorTx.textContent = msg || t('search.error');
    loadMoreArea.classList.add('hidden');
  }

  function showEmpty(query) {
    resultsLoading.classList.add('hidden');
    resultsError.classList.add('hidden');
    resultsEmpty.classList.remove('hidden');
    resultsEmptyTx.textContent = t('search.no_results', { query: query });
    loadMoreArea.classList.add('hidden');
  }

  // ── Core search ─────────────────────────────────────────────────────────────
  function doSearch(query, opts) {
    opts = opts || {};
    var append    = opts.append    || false;
    var lucky     = opts.lucky     || false;
    var newMax    = opts.maxResults || maxResults;

    if (!query || isLoading) return;

    currentQuery = query;
    maxResults   = newMax;

    // Sync both inputs
    inputHome.value    = query;
    inputResults.value = query;
    syncClearBtn(inputHome, clearHome);
    syncClearBtn(inputResults, clearResults);

    pushURL(query);
    showResults();

    if (!append) {
      setLoading(true);
      lastResults = [];
      resultsList.innerHTML = '';
    }

    var url = '/search?q=' + encodeURIComponent(query) +
      '&type=' + encodeURIComponent(currentFilter || 'all') +
      '&provider=' + encodeURIComponent('auto') +
      '&max_results=' + newMax;

    fetch(url)
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(data.detail || ('HTTP ' + res.status));
          });
        }
        return res.json();
      })
      .then(function (data) {
        isLoading = false;
        resultsLoading.classList.add('hidden');

        var results = data.results || [];
        var elapsed = data.time !== undefined ? data.time : '?';
        var count   = data.count !== undefined ? data.count : results.length;

        currentCount = count;

        if (lucky && results.length > 0) {
          window.open(results[0].url, '_blank', 'noopener,noreferrer');
          return;
        }

        if (results.length === 0 && !append) {
          showEmpty(query);
          return;
        }

        resultsError.classList.add('hidden');
        resultsEmpty.classList.add('hidden');

        // Stats
        resultsStats.textContent = t('search.results', {
          count  : count.toLocaleString(),
          time   : elapsed,
        });

        // Render cards
        var newItems = append ? results.slice(lastResults.length) : results;
        lastResults  = results;

        newItems.forEach(function (item) {
          resultsList.appendChild(buildResultCard(item, query));
        });

        // Load more button
        if (results.length >= newMax && results.length > 0) {
          loadMoreArea.classList.remove('hidden');
          loadMoreArea.classList.add('flex');
        } else {
          loadMoreArea.classList.add('hidden');
          loadMoreArea.classList.remove('flex');
        }
      })
      .catch(function (err) {
        isLoading = false;
        console.error('[Ouwibo Search] Error:', err);
        showError(err.message || t('search.error'));
      });
  }

  // ── Form submit handlers ────────────────────────────────────────────────────
  if (formHome) {
    formHome.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = inputHome ? inputHome.value.trim() : '';
      if (q) doSearch(q, { maxResults: 10 });
    });
  }

  if (formResults) {
    formResults.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = inputResults ? inputResults.value.trim() : '';
      if (q) doSearch(q, { maxResults: 10 });
    });
  }

  // ── Lucky button ────────────────────────────────────────────────────────────
  if (luckyBtn) luckyBtn.addEventListener('click', function () {
    var q = inputHome.value.trim() || inputResults.value.trim();
    if (!q) { inputHome.focus(); return; }
    doSearch(q, { lucky: true, maxResults: 5 });
  });

  // ── Load more ───────────────────────────────────────────────────────────────
  if (loadMoreBtn) loadMoreBtn.addEventListener('click', function () {
    if (!currentQuery || isLoading) return;
    var newMax = maxResults + 10;
    doSearch(currentQuery, { append: true, maxResults: newMax });
  });

  // ── Retry ───────────────────────────────────────────────────────────────────
  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      if (currentQuery) doSearch(currentQuery, { maxResults: maxResults });
    });
  }

  // ── Browser back/forward ────────────────────────────────────────────────────
  window.addEventListener('popstate', function (e) {
    var q = getQueryFromURL();
    if (q) {
      doSearch(q, { maxResults: 10 });
    } else {
      showHome();
    }
  });

  // ── Keyboard shortcut: Escape ───────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (document.activeElement === inputHome || document.activeElement === inputResults) {
        document.activeElement.blur();
      }
    }
    // Cmd/Ctrl+K → focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      var target = viewResults.classList.contains('hidden') ? inputHome : inputResults;
      target.focus();
      target.select();
    }
  });

  // ── i18n: re-apply translations on language change ──────────────────────────
  document.addEventListener('i18n:change', function () {
    if (window.i18n) window.i18n.applyAll();
    // Update stats text if visible
    if (currentQuery && currentCount > 0) {
      resultsStats.textContent = t('search.results', {
        count: currentCount.toLocaleString(),
        time: '?',
      });
    }
    // Update lang hint
    if (langHint && window.i18n) {
      var lang = window.i18n.getLang();
      var langs = window.i18n.getLanguages();
      if (langs[lang]) langHint.textContent = langs[lang].flag + ' ' + langs[lang].name;
    }
  });

  // ── Init ────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Build language switcher
    if (window.i18n) {
      window.i18n.buildSwitcher('lang-switcher');
      var lang  = window.i18n.getLang();
      var langs = window.i18n.getLanguages();
      if (langHint && langs[lang]) {
        langHint.textContent = langs[lang].flag + ' ' + langs[lang].name;
      }
    }

    // Check URL for query
    var q = getQueryFromURL();
    if (q) {
      doSearch(q, { maxResults: 10 });
    } else {
      showHome();
      inputHome.focus();
    }
  });

}());
