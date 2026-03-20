// static/skills.js — Skills browser

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('skills-list');
  const titleEl = document.getElementById('skill-title');
  const descEl = document.getElementById('skill-desc');
  const contentEl = document.getElementById('skill-content');
  const useBtn = document.getElementById('use-skill-btn');

  if (!listEl || !titleEl || !contentEl) return;

  const api = (window.__Ouwibo || {});
  const authHeaders = typeof api.authHeaders === 'function'
    ? api.authHeaders
    : () => ({ 'Content-Type': 'application/json' });

  function showEmpty(msg) {
    listEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'skills-empty';
    div.textContent = msg;
    listEl.appendChild(div);
  }

  function setDetail(skill) {
    titleEl.textContent = skill.title || skill.id || 'Skill';
    if (descEl) descEl.textContent = skill.description || '';
    contentEl.textContent = skill.content || '';
    if (useBtn) {
      useBtn.style.display = skill.id ? '' : 'none';
      useBtn.onclick = () => {
        localStorage.setItem('ouwibo_skill_id', skill.id);
        window.location.href = '/';
      };
    }
  }

  async function loadSkill(id) {
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(id)}`, { headers: authHeaders() });
      if (res.status === 401 && api.showAuthModal) {
        api.clearStoredToken && api.clearStoredToken();
        api.setAuthBadge && api.setAuthBadge(false);
        api.showAuthModal('Access required. Please enter your access token.');
        return;
      }
      if (!res.ok) {
        setDetail({ title: 'Error', description: '', content: `Failed to load skill: HTTP ${res.status}` });
        return;
      }
      const s = await res.json();
      setDetail(s);
    } catch (e) {
      setDetail({ title: 'Error', description: '', content: 'Network error while loading skill.' });
    }
  }

  async function loadList() {
    showEmpty('Loading skills...');
    try {
      const res = await fetch('/api/skills', { headers: authHeaders() });
      if (res.status === 401 && api.showAuthModal) {
        api.clearStoredToken && api.clearStoredToken();
        api.setAuthBadge && api.setAuthBadge(false);
        api.showAuthModal('Access required. Please enter your access token.');
        return;
      }
      if (!res.ok) {
        showEmpty(`Failed to load skills (HTTP ${res.status}).`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const skills = Array.isArray(data.skills) ? data.skills : [];
      if (!skills.length) {
        showEmpty('No skills found. Create skills/<id>/SKILL.md on the server.');
        setDetail({ title: 'No skills', description: '', content: '' });
        return;
      }

      listEl.innerHTML = '';
      for (const s of skills) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'skills-item';
        btn.innerHTML = `<div class="skills-item__title"></div><div class="skills-item__desc"></div>`;
        btn.querySelector('.skills-item__title').textContent = s.title || s.id;
        btn.querySelector('.skills-item__desc').textContent = s.description || '';
        btn.addEventListener('click', () => {
          listEl.querySelectorAll('.skills-item').forEach(x => x.classList.remove('skills-item--active'));
          btn.classList.add('skills-item--active');
          loadSkill(s.id);
        });
        listEl.appendChild(btn);
      }

      // Auto-select current stored skill if present.
      const stored = (localStorage.getItem('ouwibo_skill_id') || '').trim();
      const first = skills[0].id;
      const toSelect = skills.some(x => x.id === stored) ? stored : first;
      const firstBtn = [...listEl.querySelectorAll('.skills-item')].find(b => {
        const t = b.querySelector('.skills-item__title')?.textContent || '';
        return t === (skills.find(x => x.id === toSelect)?.title || toSelect);
      });
      if (firstBtn) firstBtn.click();
      else loadSkill(toSelect);
    } catch (e) {
      showEmpty('Network error while loading skills.');
    }
  }

  loadList();
});

