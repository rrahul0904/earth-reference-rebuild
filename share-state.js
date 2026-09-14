/* Productization: shareable state URLs, browser navigation restoration,
   persisted display preferences, and a built-in Share control. */
(() => {
  const VALID_EXPERIENCES = new Set(['planet','civilization','orbit','moon','earthquakes','oceans','solar']);
  const VALID_MODES = new Set(['natural','dark','blue']);
  const DEFAULT_VIEWS = { orbit:'orbit-all', moon:'moon-overview', earthquakes:'quake-all', oceans:'ocean-global', solar:'solar-all' };
  const PREF_KEY = 'earth.preferences.v1';
  let applyingUrl = false;
  let interactionTransition = false;
  let lastSerialized = '';

  function activeView() {
    return document.querySelector('#experiencePills [data-exp-control].active')?.dataset.expControl || '';
  }

  function currentParams() {
    const p = new URLSearchParams();
    const exp = VALID_EXPERIENCES.has(state.experience) ? state.experience : 'planet';
    p.set('exp', exp);
    if (VALID_MODES.has(state.mode)) p.set('mode', state.mode);
    if (exp === 'planet' || exp === 'civilization') p.set('age', Number(state.ageMa || 0).toFixed(6).replace(/0+$/,'').replace(/\.$/,''));
    const view = activeView();
    if (view && view !== DEFAULT_VIEWS[exp]) p.set('view', view);
    return p;
  }

  function writeUrl(kind = 'replace') {
    if (applyingUrl) return;
    const serialized = currentParams().toString();
    const actual = location.hash.replace(/^#/, '');
    if (serialized === lastSerialized && actual === serialized) return;
    lastSerialized = serialized;
    const next = `${location.pathname}${location.search}#${serialized}`;
    history[kind === 'push' ? 'pushState' : 'replaceState']({ earthState: serialized }, '', next);
  }

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); }
    catch { return {}; }
  }

  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify({ mode: state.mode })); }
    catch {}
  }

  function clickSelector(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    el.click();
    return true;
  }

  async function applyUrl({ initial = false } = {}) {
    if (applyingUrl) return;
    applyingUrl = true;
    try {
      const p = new URLSearchParams(location.hash.replace(/^#/,''));
      const prefs = readPrefs();
      const exp = VALID_EXPERIENCES.has(p.get('exp')) ? p.get('exp') : 'planet';
      const explicitMode = VALID_MODES.has(p.get('mode')) ? p.get('mode') : null;
      const mode = explicitMode || (((exp === 'planet' || exp === 'civilization') && VALID_MODES.has(prefs.mode)) ? prefs.mode : null);
      const age = Number(p.get('age'));
      const view = p.get('view');

      if (state.experience !== exp) clickSelector(`[data-experience-nav="${CSS.escape(exp)}"]`);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      if (mode && state.mode !== mode) setMode(mode);
      if ((exp === 'planet' || exp === 'civilization') && Number.isFinite(age)) setAge(clamp(age,0,MAX_AGE_MA));

      const controlValue = view || DEFAULT_VIEWS[exp];
      if (controlValue) {
        const candidate = document.querySelector(`[data-exp-control="${CSS.escape(controlValue)}"]`);
        if (candidate && !candidate.classList.contains('active')) candidate.click();
      }

      savePrefs();
      lastSerialized = currentParams().toString();
      if (initial || !location.hash) {
        const next = `${location.pathname}${location.search}#${lastSerialized}`;
        history.replaceState({ earthState: lastSerialized }, '', next);
      }
    } finally {
      applyingUrl = false;
    }
  }

  function installShareButton() {
    if (document.getElementById('shareStateButton')) return;
    const actions = document.querySelector('.top-actions');
    if (!actions) return;
    const button = document.createElement('button');
    button.id = 'shareStateButton';
    button.type = 'button';
    button.className = 'sources-link';
    button.textContent = 'Share';
    button.setAttribute('aria-label','Copy a link to this exact Earth view');
    actions.insertBefore(button, actions.firstChild);
    button.addEventListener('click', async () => {
      writeUrl('replace');
      const url = location.href;
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          copied = true;
        }
      } catch {}
      if (!copied) {
        const field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly','');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        try { copied = document.execCommand('copy'); } catch {}
        field.remove();
      }
      els.srStatus.textContent = copied ? 'Link copied to clipboard.' : `Share link: ${url}`;
      button.textContent = copied ? 'Copied' : 'Share';
      setTimeout(() => { button.textContent = 'Share'; }, 1600);
    });
  }

  const baseSetMode = setMode;
  setMode = function productizedSetMode(mode) {
    baseSetMode(mode);
    savePrefs();
    if (!interactionTransition) queueMicrotask(() => writeUrl('replace'));
  };

  const baseSetAge = setAge;
  setAge = function productizedSetAge(age, options = {}) {
    baseSetAge(age, options);
    if (!interactionTransition && (state.experience === 'planet' || state.experience === 'civilization')) queueMicrotask(() => writeUrl('replace'));
  };

  document.addEventListener('click', event => {
    if (applyingUrl) return;
    if (event.target.closest('[data-experience-nav], [data-exp-control]')) interactionTransition = true;
  }, true);

  document.addEventListener('click', event => {
    if (applyingUrl) return;
    const nav = event.target.closest('[data-experience-nav]');
    const control = event.target.closest('[data-exp-control]');
    if (nav || control) {
      setTimeout(() => {
        interactionTransition = false;
        writeUrl('push');
      }, 0);
    }
  });

  window.addEventListener('popstate', () => applyUrl());
  window.addEventListener('hashchange', () => applyUrl());

  installShareButton();
  applyUrl({ initial: true }).then(() => {
    document.documentElement.dataset.shareStateReady = 'true';
    els.app.dataset.shareStateReady = 'true';
    if (!location.hash) writeUrl('replace');
  });
})();
