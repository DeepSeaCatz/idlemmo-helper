(() => {
  if (location.pathname !== '/combat/battle') return;

  const STORAGE_KEY = 'idlemmoHelperBattleCalcState';
  const PANEL_ID = 'idlemmo-helper-battle-calc';

  const HITS_DIVISORS = { 2: 3, 3: 4.53, 4: 6.18 };

  const BONUS_DEFS = [
    { key: 'Ascension5', label: 'Ascension 5%', value: 5 },
    { key: 'Ascension7', label: 'Ascension 7%', value: 7 },
    { key: 'Ascension10', label: 'Ascension 10%', value: 10 },
    { key: 'Ascension12', label: 'Ascension 12%', value: 12 },
    { key: 'ShrineT1', label: 'Shrine T1', value: 5 },
    { key: 'ShrineT2', label: 'Shrine T2', value: 10 },
    { key: 'ShrineT3', label: 'Shrine T3', value: 15 },
    { key: 'ClassBattle', label: 'Class battle', value: 5 },
  ];

  const CLASSIC_POTIONS = [
    { value: 10, label: 'Battle Potion (30m)' },
    { value: 17, label: 'Strike Essence (1h)' },
    { value: 21, label: 'Dragonblood Tonic (1h30m)' },
    { value: 90, label: 'Potion of The Gods (1h)' },
    { value: 100, label: 'Cake (3h)' },
  ];

  const DUNGEON_POTIONS = [
    { value: 7, label: 'Dungeon Potion (30m)' },
    { value: 12, label: "Dungeon Master's Tonic (50m)" },
    { value: 20, label: 'Wraithbane (1h40m)' },
    { value: 50, label: "Sun's Light (1h)" },
  ];

  const DEFAULT_STATE = {
    scale: 100,
    hits: 2,
    bonuses: { Ascension5: false, Ascension7: false, Ascension10: false, Ascension12: false, ShrineT1: false, ShrineT2: false, ShrineT3: false, ClassBattle: true },
    poolEnabled: false,
    poolLevel: '',
    classicPotion: null,
    dungeonPotion: null,
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(raw), bonuses: { ...DEFAULT_STATE.bonuses, ...(JSON.parse(raw).bonuses || {}) } };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }

  function scaleToXpBase(scale) {
    return 53 + Math.floor((scale - 100) / 2);
  }

  function getPoolBonus(level) {
    if (level === 100) return 15;
    if (level >= 98) return 14;
    if (level >= 96) return 13;
    if (level >= 94) return 12;
    if (level >= 91) return 11;
    if (level >= 89) return 10;
    if (level >= 87) return 9;
    if (level >= 86) return 8;
    if (level >= 85) return 7;
    if (level >= 80) return 6;
    if (level >= 75) return 5;
    if (level >= 67) return 4;
    if (level >= 10) return 3;
    if (level >= 5) return 2;
    if (level >= 1) return 1;
    return 0;
  }

  function arrondiMike(x) {
    let base = Math.floor(x * 1000) / 1000;
    const quatrieme = Math.floor(x * 10000) % 10;
    if (quatrieme >= 6) base += 0.001;
    return Number(base.toFixed(3));
  }

  function compute(state) {
    const xpBase = scaleToXpBase(state.scale);

    let totalBonuses = 0;
    BONUS_DEFS.forEach(({ key, value }) => {
      if (state.bonuses[key]) totalBonuses += value;
    });

    if (state.poolEnabled) {
      const level = parseInt(state.poolLevel, 10);
      if (!Number.isNaN(level) && level >= 1 && level <= 100) {
        totalBonuses += getPoolBonus(level);
      }
    }

    if (state.classicPotion != null) totalBonuses += state.classicPotion;
    if (state.dungeonPotion != null) totalBonuses += state.dungeonPotion;

    const bonusMultiplier = 1 + totalBonuses / 100;
    const xpTotal = xpBase * bonusMultiplier;
    const divisor = HITS_DIVISORS[state.hits] ?? HITS_DIVISORS[2];
    const xpPerSec = arrondiMike(xpTotal / divisor);
    const xpPerMob = Math.floor(xpTotal * 0.05);

    return { totalBonuses, xpPerSec, xpPerMob };
  }

  function buildPanel(state) {
    const wrap = document.createElement('div');
    wrap.id = PANEL_ID;
    wrap.style.width = '100%';
    wrap.style.boxSizing = 'border-box';
    wrap.style.marginTop = '12px';
    wrap.style.fontFamily = 'inherit';
    wrap.style.fontSize = '13px';
    wrap.style.color = '#e5e7eb';
    wrap.style.background = '#111827';
    wrap.style.border = '1px solid #374151';
    wrap.style.borderRadius = '10px';
    wrap.style.padding = '12px';
    wrap.style.textAlign = 'left';

    const title = document.createElement('div');
    title.style.fontWeight = '700';
    title.style.fontSize = '14px';
    title.textContent = '⚔️ Calcul Guild XP Assaut';

    const panel = document.createElement('div');
    panel.style.marginTop = '8px';
    panel.style.width = '100%';
    panel.style.boxSizing = 'border-box';

    panel.innerHTML = `
      <div style="margin-bottom:10px;">
        <label style="display:flex;align-items:center;justify-content:space-between;font-weight:600;margin-bottom:4px;">
          <span>📏 Scale</span>
          <span id="ihbc-scale-display">${state.scale}</span>
        </label>
        <input type="range" id="ihbc-scale" min="100" max="150" step="1" value="${state.scale}" style="width:100%;" />
      </div>

      <div style="margin-bottom:10px;">
        <label style="font-weight:600;display:block;margin-bottom:4px;">⚔️ Nb Hits</label>
        <select id="ihbc-hits" style="width:100%;background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:4px;">
          <option value="2">2 hits</option>
          <option value="3">3 hits</option>
          <option value="4">4 hits</option>
        </select>
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-weight:600;margin-bottom:4px;">📦 Bonus</div>
        ${BONUS_DEFS.map(({ key, label }) => `
          <label style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <input type="checkbox" data-bonus="${key}" />
            <span>${label}</span>
          </label>
        `).join('')}
        <label style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
          <input type="checkbox" id="ihbc-pool" />
          <span>Pool</span>
        </label>
        <div id="ihbc-pool-wrapper" style="padding-left:24px;margin-top:2px;display:none;">
          <label style="display:block;font-size:12px;color:#d1d5db;margin-bottom:2px;">Niveau de Guild Mastery</label>
          <input type="number" id="ihbc-pool-level" min="0" max="100" style="width:70px;background:#1f2937;color:#e5e7eb;border:1px solid #374151;border-radius:6px;padding:2px 4px;" />
          <div id="ihbc-pool-value" style="font-size:12px;color:#60a5fa;margin-top:2px;"></div>
        </div>
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-weight:600;margin-bottom:4px;">🧪 Potion</div>
        ${CLASSIC_POTIONS.map(({ value, label }) => `
          <label style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <input type="radio" name="ihbc-classic-potion" value="${value}" />
            <span>${label}</span>
          </label>
        `).join('')}
      </div>

      <div style="margin-bottom:10px;">
        <div style="font-weight:600;margin-bottom:4px;">🏰 Potions Donjon</div>
        ${DUNGEON_POTIONS.map(({ value, label }) => `
          <label style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <input type="radio" name="ihbc-dungeon-potion" value="${value}" />
            <span>${label}</span>
          </label>
        `).join('')}
      </div>

      <div id="ihbc-result" style="text-align:center;font-weight:700;color:#4ade80;border-top:1px solid #374151;padding-top:8px;"></div>
    `;

    wrap.appendChild(title);
    wrap.appendChild(panel);

    function applyState() {
      panel.querySelector('#ihbc-scale').value = String(state.scale);
      panel.querySelector('#ihbc-scale-display').textContent = String(state.scale);
      panel.querySelector('#ihbc-hits').value = String(state.hits);

      BONUS_DEFS.forEach(({ key }) => {
        const input = panel.querySelector(`[data-bonus="${key}"]`);
        if (input) input.checked = !!state.bonuses[key];
      });

      const poolCheckbox = panel.querySelector('#ihbc-pool');
      const poolWrapper = panel.querySelector('#ihbc-pool-wrapper');
      poolCheckbox.checked = state.poolEnabled;
      poolWrapper.style.display = state.poolEnabled ? 'block' : 'none';
      panel.querySelector('#ihbc-pool-level').value = state.poolLevel ?? '';

      panel.querySelectorAll('input[name="ihbc-classic-potion"]').forEach((r) => {
        r.checked = state.classicPotion != null && Number(r.value) === state.classicPotion;
      });
      panel.querySelectorAll('input[name="ihbc-dungeon-potion"]').forEach((r) => {
        r.checked = state.dungeonPotion != null && Number(r.value) === state.dungeonPotion;
      });

      updatePoolValueDisplay();
      updateResult();
    }

    function updatePoolValueDisplay() {
      const valueEl = panel.querySelector('#ihbc-pool-value');
      if (!state.poolEnabled) {
        valueEl.textContent = '';
        return;
      }
      const level = parseInt(state.poolLevel, 10);
      if (Number.isNaN(level) || level < 1 || level > 100) {
        valueEl.textContent = 'Veuillez saisir un niveau de Guild Mastery valide';
        valueEl.style.color = '#f87171';
        return;
      }
      valueEl.style.color = '#60a5fa';
      valueEl.textContent = `Battle XP : +${getPoolBonus(level)}%`;
    }

    function updateResult() {
      const { totalBonuses, xpPerSec, xpPerMob } = compute(state);
      const resultEl = panel.querySelector('#ihbc-result');
      resultEl.innerHTML = `
        ${xpPerSec} xp / sec*<br>
        ${xpPerMob} xp / mob
        <div style="font-size:12px;font-weight:400;color:#e5e7eb;margin-top:4px;">${totalBonuses}% xp bonus (Battle + Combat)</div>
        <i style="font-size:11px;font-weight:400;color:#9ca3af;">*Calcul effectué sur la base de ${state.hits} hits par mob</i>
      `;
    }

    panel.querySelector('#ihbc-scale').addEventListener('input', (e) => {
      state.scale = parseInt(e.target.value, 10);
      panel.querySelector('#ihbc-scale-display').textContent = String(state.scale);
      updateResult();
      saveState(state);
    });

    panel.querySelector('#ihbc-hits').addEventListener('change', (e) => {
      state.hits = parseInt(e.target.value, 10);
      updateResult();
      saveState(state);
    });

    BONUS_DEFS.forEach(({ key }) => {
      panel.querySelector(`[data-bonus="${key}"]`).addEventListener('change', (e) => {
        state.bonuses[key] = e.target.checked;
        updateResult();
        saveState(state);
      });
    });

    panel.querySelector('#ihbc-pool').addEventListener('change', (e) => {
      state.poolEnabled = e.target.checked;
      panel.querySelector('#ihbc-pool-wrapper').style.display = state.poolEnabled ? 'block' : 'none';
      updatePoolValueDisplay();
      updateResult();
      saveState(state);
    });

    panel.querySelector('#ihbc-pool-level').addEventListener('input', (e) => {
      state.poolLevel = e.target.value;
      updatePoolValueDisplay();
      updateResult();
      saveState(state);
    });

    panel.querySelectorAll('input[name="ihbc-classic-potion"]').forEach((radio) => {
      radio.addEventListener('click', (e) => {
        const value = Number(e.target.value);
        if (state.classicPotion === value) {
          state.classicPotion = null;
          e.target.checked = false;
        } else {
          state.classicPotion = value;
        }
        updateResult();
        saveState(state);
      });
    });

    panel.querySelectorAll('input[name="ihbc-dungeon-potion"]').forEach((radio) => {
      radio.addEventListener('click', (e) => {
        const value = Number(e.target.value);
        if (state.dungeonPotion === value) {
          state.dungeonPotion = null;
          e.target.checked = false;
        } else {
          state.dungeonPotion = value;
        }
        updateResult();
        saveState(state);
      });
    });

    applyState();

    return wrap;
  }

  function findContainer() {
    return Array.from(document.querySelectorAll('div')).find((div) =>
      div.classList.contains('col-span-8') &&
      div.classList.contains('md:col-span-5') &&
      div.classList.contains('md:block')
    );
  }

  let enabled = true;

  function init() {
    if (!enabled) return;
    if (document.getElementById(PANEL_ID)) return;
    const container = findContainer();
    if (!container) return;
    const state = loadState();
    container.appendChild(buildPanel(state));
  }

  function removePanel() {
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();
  }

  function applyFeatureState(features) {
    enabled = !!features.battleCalculator;
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
