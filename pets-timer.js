(() => {
  if (location.pathname !== '/pets') return;

  const TIMER_STORAGE_KEY = 'idlemmo_helper_pets_timer';
  const PANEL_ID = 'idlemmo-helper-pets-timer';

  function parseDuration(input) {
    const str = input.trim().toLowerCase();
    if (!str) return null;

    const colonMatch = str.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (colonMatch) {
      const h = parseInt(colonMatch[1], 10);
      const m = parseInt(colonMatch[2], 10);
      const s = colonMatch[3] ? parseInt(colonMatch[3], 10) : 0;
      return ((h * 60 + m) * 60 + s) * 1000;
    }

    const unitRegex = /(\d+)\s*(h|min|m|s)/g;
    let match;
    let totalMs = 0;
    let found = false;

    while ((match = unitRegex.exec(str)) !== null) {
      found = true;
      const value = parseInt(match[1], 10);
      const unit = match[2];

      if (unit === 'h') totalMs += value * 3600000;
      else if (unit === 'min' || unit === 'm') totalMs += value * 60000;
      else if (unit === 's') totalMs += value * 1000;
    }

    return found ? totalMs : null;
  }

  function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function buildPanel() {
    const wrap = document.createElement('div');
    wrap.id = PANEL_ID;
    wrap.style.margin = '0 0 16px';
    wrap.style.padding = '12px';
    wrap.style.background = '#111827';
    wrap.style.border = '1px solid #374151';
    wrap.style.borderRadius = '10px';
    wrap.style.color = '#e5e7eb';
    wrap.style.fontSize = '13px';

    wrap.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:8px;">⏱️ Minuteur</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="ihpt-input" type="text" placeholder="ex: 2h32m" style="flex:1;background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:4px 8px;" />
        <button id="ihpt-start" type="button" style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;">Démarrer</button>
        <button id="ihpt-cancel" type="button" style="background:#374151;color:#e5e7eb;border:none;border-radius:6px;padding:4px 10px;font-weight:600;cursor:pointer;display:none;">Annuler</button>
      </div>
      <div id="ihpt-countdown" style="margin-top:8px;font-size:20px;font-weight:700;text-align:center;display:none;"></div>
      <div id="ihpt-error" style="margin-top:6px;color:#f87171;font-size:12px;display:none;"></div>
    `;

    return wrap;
  }

  let tickIntervalId = null;
  let currentEndAt = null;
  let activePanel = null;

  function tick() {
    if (!activePanel || !currentEndAt) return;

    const countdown = activePanel.querySelector('#ihpt-countdown');
    const remaining = currentEndAt - Date.now();

    if (remaining <= 0) {
      renderState(activePanel, null);
      return;
    }

    countdown.textContent = formatRemaining(remaining);
  }

  function renderState(panel, timer) {
    const input = panel.querySelector('#ihpt-input');
    const startBtn = panel.querySelector('#ihpt-start');
    const cancelBtn = panel.querySelector('#ihpt-cancel');
    const countdown = panel.querySelector('#ihpt-countdown');

    if (timer && timer.endAt > Date.now()) {
      currentEndAt = timer.endAt;
      input.disabled = true;
      startBtn.style.display = 'none';
      cancelBtn.style.display = '';
      countdown.style.display = '';
      tick();

      if (!tickIntervalId) {
        tickIntervalId = setInterval(tick, 1000);
      }
    } else {
      currentEndAt = null;
      input.disabled = false;
      input.value = '';
      startBtn.style.display = '';
      cancelBtn.style.display = 'none';
      countdown.style.display = 'none';

      if (tickIntervalId) {
        clearInterval(tickIntervalId);
        tickIntervalId = null;
      }
    }
  }

  function findContainer() {
    return document.querySelector('#game-container');
  }

  let enabled = true;

  function removePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
    activePanel = null;
  }

  function init() {
    if (!enabled) return;
    if (document.getElementById(PANEL_ID)) return;

    const container = findContainer();
    if (!container) return;

    const panel = buildPanel();
    container.before(panel);
    activePanel = panel;

    const input = panel.querySelector('#ihpt-input');
    const startBtn = panel.querySelector('#ihpt-start');
    const cancelBtn = panel.querySelector('#ihpt-cancel');
    const errorEl = panel.querySelector('#ihpt-error');

    startBtn.addEventListener('click', () => {
      const ms = parseDuration(input.value);

      if (!ms || ms <= 0) {
        errorEl.textContent = 'Format invalide. Exemple : 2h32m';
        errorEl.style.display = '';
        return;
      }

      errorEl.style.display = 'none';

      chrome.runtime.sendMessage(
        { type: 'idlemmo-helper-start-pets-timer', durationMs: ms, label: 'Pets' },
        (response) => {
          if (response && response.endAt) {
            renderState(panel, { endAt: response.endAt });
          }
        }
      );
    });

    cancelBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'idlemmo-helper-cancel-pets-timer' }, () => {
        renderState(panel, null);
      });
    });

    chrome.storage.local.get(TIMER_STORAGE_KEY, (data) => {
      renderState(panel, data[TIMER_STORAGE_KEY] || null);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[TIMER_STORAGE_KEY] || !activePanel) return;
      renderState(activePanel, changes[TIMER_STORAGE_KEY].newValue || null);
    });
  }

  function applyFeatureState(features) {
    enabled = !!features.petsTimer;
    if (enabled) {
      init();
    } else {
      removePanel();
    }
  }

  function start() {
    init();
    const observer = new MutationObserver(() => init());
    observer.observe(document.body, { childList: true, subtree: true });

    window.IdleMMOHelperSettings.loadFeatureSettings(applyFeatureState);
    window.IdleMMOHelperSettings.onFeatureSettingsChanged(applyFeatureState);
  }

  if (document.body) {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
