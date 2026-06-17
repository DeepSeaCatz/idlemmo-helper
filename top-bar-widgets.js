(() => {
  const ASSAULT_BADGE_ID = 'idlemmo-helper-assault-badge';
  const WORLD_BOSS_BADGE_ID = 'idlemmo-helper-worldboss-badge';
  const POOL_BADGE_ID = 'idlemmo-helper-pool-badge';
  const POLL_INTERVAL_MS = 60 * 1000;
  const TICK_INTERVAL_MS = 1000;

  let assaultStatus = null;
  let worldBossStatus = null;
  let poolStatus = null;

  let assaultBadgeEl = null;
  let assaultTextEl = null;
  let worldBossBadgeEl = null;
  let worldBossTextEl = null;
  let poolBadgeEl = null;
  let poolTextEl = null;

  function findContainer() {
    return Array.from(document.querySelectorAll('div')).find((div) =>
      div.classList.contains('flex') &&
      div.classList.contains('items-center') &&
      div.classList.contains('w-full') &&
      div.classList.contains('flex-wrap') &&
      div.classList.contains('justify-end') &&
      div.classList.contains('gap-2')
    );
  }

  function buildBadge(id, prefix, initialText) {
    const wrap = document.createElement('div');
    wrap.className = 'block';
    wrap.id = id;

    const button = document.createElement('div');
    button.className = 'flex items-center px-4 py-2 text-sm font-bold bg-gray-800 rounded-full whitespace-nowrap';

    if (prefix) {
      const prefixSpan = document.createElement('span');
      prefixSpan.className = 'flex-shrink-0 mr-2';
      prefixSpan.textContent = prefix;
      button.appendChild(prefixSpan);
    }

    const textSpan = document.createElement('span');
    textSpan.textContent = initialText;

    button.appendChild(textSpan);
    wrap.appendChild(button);

    return { wrap, textSpan };
  }

  function syncPoolBadge(container) {
    const active = poolStatus?.status === 'active';
    const exists = poolBadgeEl && poolBadgeEl.isConnected;

    if (active && !exists) {
      const target = container || findContainer();
      if (!target) return;
      const { wrap, textSpan } = buildBadge(POOL_BADGE_ID, 'Pool', 'UP');
      target.prepend(wrap);
      poolBadgeEl = wrap;
      poolTextEl = textSpan;
    } else if (!active && exists) {
      poolBadgeEl.remove();
      poolBadgeEl = null;
      poolTextEl = null;
    }
  }

  function ensureBadges() {
    const assaultOk = assaultBadgeEl && assaultBadgeEl.isConnected;
    const worldBossOk = worldBossBadgeEl && worldBossBadgeEl.isConnected;
    const poolOk = (poolStatus?.status === 'active') === !!(poolBadgeEl && poolBadgeEl.isConnected);
    if (assaultOk && worldBossOk && poolOk) return;

    const container = findContainer();
    if (!container) return;

    if (!worldBossOk) {
      const { wrap, textSpan } = buildBadge(WORLD_BOSS_BADGE_ID, null, '...');
      container.prepend(wrap);
      worldBossBadgeEl = wrap;
      worldBossTextEl = textSpan;
    }

    if (!assaultOk) {
      const { wrap, textSpan } = buildBadge(ASSAULT_BADGE_ID, 'Assaut', '...');
      container.prepend(wrap);
      assaultBadgeEl = wrap;
      assaultTextEl = textSpan;
    }

    syncPoolBadge(container);

    render();
  }

  function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}j ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes}min ${secs}s`;
    return `${secs}s`;
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function render() {
    renderAssault();
    renderWorldBoss();
    renderPool();
  }

  function renderAssault() {
    if (!assaultStatus || !assaultTextEl) return;

    if (assaultStatus.status === 'active') {
      const remaining = (new Date(assaultStatus.endsAt).getTime() - Date.now()) / 1000;
      if (remaining <= 0) {
        setText(assaultTextEl, 'Assaut terminé');
        return;
      }
      setText(assaultTextEl, `Fin: ${formatDuration(remaining)}`);
      return;
    }

    if (assaultStatus.status === 'upcoming') {
      const remaining = (new Date(assaultStatus.startsAt).getTime() - Date.now()) / 1000;
      if (remaining <= 0) {
        setText(assaultTextEl, 'Assaut imminent');
        return;
      }
      setText(assaultTextEl, `Début: ${formatDuration(remaining)}`);
      return;
    }

    setText(assaultTextEl, 'Aucun assaut');
  }

  function renderWorldBoss() {
    if (!worldBossStatus || !worldBossTextEl) return;

    if (worldBossStatus.status === 'in_progress') {
      setText(worldBossTextEl, `${worldBossStatus.name}: en cours`);
      return;
    }

    if (worldBossStatus.status === 'upcoming') {
      const remaining = (new Date(worldBossStatus.startsAt).getTime() - Date.now()) / 1000;
      if (remaining <= 0) {
        setText(worldBossTextEl, `${worldBossStatus.name}: en cours`);
        return;
      }
      setText(worldBossTextEl, `${worldBossStatus.name}: ${formatDuration(remaining)}`);
      return;
    }

    setText(worldBossTextEl, 'Aucun boss');
  }

  function renderPool() {
    if (!poolStatus || !poolTextEl) return;

    if (poolStatus.status === 'active') {
      const remaining = (new Date(poolStatus.endsAt).getTime() - Date.now()) / 1000;
      if (remaining <= 0) {
        setText(poolTextEl, 'UP');
        return;
      }
      setText(poolTextEl, `UP - Fin: ${formatDuration(remaining)}`);
    }
  }

  let pollIntervalId = null;
  let tickIntervalId = null;
  let observer = null;
  let started = false;

  function teardown() {
    if (pollIntervalId) clearInterval(pollIntervalId);
    if (tickIntervalId) clearInterval(tickIntervalId);
    if (observer) observer.disconnect();
    pollIntervalId = null;
    tickIntervalId = null;
    observer = null;
  }

  function removeBadges() {
    [assaultBadgeEl, worldBossBadgeEl, poolBadgeEl].forEach((badge) => {
      if (badge) badge.remove();
    });
    assaultBadgeEl = null;
    assaultTextEl = null;
    worldBossBadgeEl = null;
    worldBossTextEl = null;
    poolBadgeEl = null;
    poolTextEl = null;
  }

  function poll() {
    if (!chrome.runtime?.id) {
      teardown();
      return;
    }

    try {
      chrome.runtime.sendMessage({ type: 'idlemmo-helper-get-assault-status' }, (data) => {
        if (chrome.runtime.lastError || !data) return;
        assaultStatus = {
          status: data.status,
          endsAt: data.ends_at ?? null,
          startsAt: data.starts_at ?? null,
        };
        renderAssault();
      });

      chrome.runtime.sendMessage({ type: 'idlemmo-helper-get-worldboss-status' }, (data) => {
        if (chrome.runtime.lastError || !data) return;
        worldBossStatus = {
          status: data.status,
          name: data.name ?? null,
          startsAt: data.starts_at ?? null,
        };
        renderWorldBoss();
      });

      chrome.runtime.sendMessage({ type: 'idlemmo-helper-get-energizing-pool-status' }, (data) => {
        if (chrome.runtime.lastError || !data) return;
        poolStatus = {
          status: data.status,
          endsAt: data.ends_at ?? null,
        };
        ensureBadges();
        renderPool();
      });
    } catch (e) {
      teardown();
    }
  }

  function start() {
    if (started) return;
    started = true;

    ensureBadges();
    poll();

    observer = new MutationObserver(() => ensureBadges());
    observer.observe(document.body, { childList: true, subtree: true });

    pollIntervalId = setInterval(poll, POLL_INTERVAL_MS);
    tickIntervalId = setInterval(render, TICK_INTERVAL_MS);
  }

  function stop() {
    if (!started) return;
    started = false;
    teardown();
    removeBadges();
  }

  function applyFeatureState(features) {
    if (features.topBarWidgets) {
      start();
    } else {
      stop();
    }
  }

  function init() {
    window.IdleMMOHelperSettings.loadFeatureSettings(applyFeatureState);
    window.IdleMMOHelperSettings.onFeatureSettingsChanged(applyFeatureState);
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
