(() => {
  const NET_AFTER_TAX_FACTOR = 0.88;
  const ROW_MARKER_CLASS = 'idlemmo-helper-net-market-row';
  const VALUE_CLASS = 'idlemmo-helper-net-market-value';
  const LISTING_ROW_MARKER_CLASS = 'idlemmo-helper-net-listing-row';
  const LISTING_VALUE_CLASS = 'idlemmo-helper-net-listing-value';
  const VENDOR_CHECK_BADGE_CLASS = 'idlemmo-helper-vendor-check-badge';
  const VENDOR_TOGGLE_ID = 'idlemmo-helper-vendor-toggle';
  const GOLD_COIN_URL = 'https://cdn.idle-mmo.com/cdn-cgi/image/width=20,height=20,format=auto/global/gold_coin.png';

  let pricesByName = null;
  let pricesRequested = false;
  let vendorCheckEnabled = false;

  let features = window.IdleMMOHelperSettings.getDefaultFeatures();

  window.IdleMMOHelperSettings.loadFeatureSettings((loaded) => {
    features = loaded;
    scheduleScan();
  });

  window.IdleMMOHelperSettings.onFeatureSettingsChanged((loaded) => {
    features = loaded;
    scheduleScan();
  });

  function formatNumber(num) {
    return Math.floor(num).toLocaleString('en-US');
  }

  function getMinimumPrice(priceRangeRow) {
    const textRight = priceRangeRow.querySelector('.text-right');
    if (!textRight) return null;

    const naSpan = textRight.querySelector('.text-gray-500');
    if (naSpan && naSpan.textContent.trim() === 'N/A') return null;

    const valueSpans = textRight.querySelectorAll('span[x-text]');
    if (valueSpans.length < 1) return null;

    const raw = valueSpans[0].textContent.trim().replace(/,/g, '');
    const value = parseFloat(raw);
    return Number.isNaN(value) ? null : value;
  }

  function buildNetMarketRow() {
    const row = document.createElement('div');
    row.className = `flex justify-between items-center ${ROW_MARKER_CLASS}`;

    const label = document.createElement('span');
    label.className = 'font-medium text-gray-200';
    label.textContent = 'Net After Market Tax';

    const textRight = document.createElement('div');
    textRight.className = 'text-right';

    const valueSpan = document.createElement('span');
    valueSpan.className = `font-semibold text-white ${VALUE_CLASS}`;

    const img = document.createElement('img');
    img.src = GOLD_COIN_URL;
    img.className = 'h-4 w-4 inline-block';

    valueSpan.appendChild(img);
    valueSpan.appendChild(document.createTextNode(' '));
    const amount = document.createElement('span');
    valueSpan.appendChild(amount);

    textRight.appendChild(valueSpan);
    row.appendChild(label);
    row.appendChild(textRight);

    return { row, amount, valueSpan };
  }

  function processPriceRangeRow(priceRangeRow) {
    const minimum = getMinimumPrice(priceRangeRow);
    let nextRow = priceRangeRow.nextElementSibling;
    const hasOurRow = nextRow && nextRow.classList.contains(ROW_MARKER_CLASS);

    if (minimum === null) {
      if (hasOurRow) nextRow.remove();
      return;
    }

    const net = NET_AFTER_TAX_FACTOR * minimum;

    const formatted = formatNumber(net);

    if (hasOurRow) {
      const amount = nextRow.querySelector(`.${VALUE_CLASS} span`);
      if (amount && amount.textContent !== formatted) amount.textContent = formatted;
      return;
    }

    const { row, amount } = buildNetMarketRow();
    amount.textContent = formatted;
    priceRangeRow.insertAdjacentElement('afterend', row);
  }

  function getPricePerItemValue(row) {
    const valueWrap = row.querySelector('.mr-4');
    if (!valueWrap) return null;

    const span = valueWrap.querySelector('span[x-text]');
    if (!span) return null;

    const raw = span.textContent.trim().replace(/,/g, '');
    const value = parseFloat(raw);
    return Number.isNaN(value) ? null : value;
  }

  function buildNetAfterTaxListingRow() {
    const row = document.createElement('div');
    row.className = `flex items-center justify-between px-4 ${LISTING_ROW_MARKER_CLASS}`;

    const labelWrap = document.createElement('div');
    const labelInner = document.createElement('div');
    labelInner.className = 'flex items-center px-3 py-3 text-sm font-medium text-gray-300 rounded-md group';
    const label = document.createElement('span');
    label.className = 'truncate font-bold';
    label.textContent = 'Net After Market Tax';
    labelInner.appendChild(label);
    labelWrap.appendChild(labelInner);

    const valueWrap = document.createElement('div');
    valueWrap.className = 'mr-4 font-semibold text-gray-200 text-sm';

    const img = document.createElement('img');
    img.src = GOLD_COIN_URL;
    img.className = 'h-4 w-4 inline-block';

    const amount = document.createElement('span');
    amount.className = LISTING_VALUE_CLASS;

    valueWrap.appendChild(img);
    valueWrap.appendChild(document.createTextNode(' '));
    valueWrap.appendChild(amount);

    row.appendChild(labelWrap);
    row.appendChild(valueWrap);

    return { row, amount };
  }

  function processPricePerItemRow(row) {
    const price = getPricePerItemValue(row);
    const nextRow = row.nextElementSibling;
    const hasOurRow = nextRow && nextRow.classList.contains(LISTING_ROW_MARKER_CLASS);

    if (price === null) {
      if (hasOurRow) nextRow.remove();
      return;
    }

    const net = NET_AFTER_TAX_FACTOR * price;
    const formatted = formatNumber(net);

    if (hasOurRow) {
      const amount = nextRow.querySelector(`.${LISTING_VALUE_CLASS}`);
      if (amount && amount.textContent !== formatted) amount.textContent = formatted;
      return;
    }

    const { row: newRow, amount } = buildNetAfterTaxListingRow();
    amount.textContent = formatted;
    row.insertAdjacentElement('afterend', newRow);
  }

  function requestPrices() {
    if (pricesRequested) return;
    pricesRequested = true;

    chrome.runtime.sendMessage({ type: 'idlemmo-helper-get-prices' }, (data) => {
      if (Array.isArray(data)) {
        pricesByName = new Map(data.map((item) => [item.name, item]));
        scheduleScan();
      } else {
        pricesRequested = false;
      }
    });
  }

  function setVendorCheckEnabled(enabled) {
    vendorCheckEnabled = enabled;
    scheduleScan();
  }

  function updateToggleStyle(button) {
    if (vendorCheckEnabled) {
      button.style.backgroundColor = '#16a34a';
      button.style.color = '#fff';
    } else {
      button.style.backgroundColor = '';
      button.style.color = '';
    }
  }

  function ensureVendorToggle() {
    const existing = document.getElementById(VENDOR_TOGGLE_ID);
    if (existing) {
      updateToggleStyle(existing);
      return;
    }

    const sortButton = document.querySelector('button[x-on\\:click="sort_dropdown=!sort_dropdown"]');
    if (!sortButton || !sortButton.parentElement) return;

    const button = document.createElement('button');
    button.id = VENDOR_TOGGLE_ID;
    button.type = 'button';
    button.className = 'flex max-w-xs items-center rounded-full h-9 bg-gray-800 hover:bg-gray-700/80 text-sm group px-4 ml-2';

    const label = document.createElement('div');
    label.className = 'inline-block font-bold';
    label.textContent = 'Vendor Check';
    button.appendChild(label);

    button.addEventListener('click', () => {
      setVendorCheckEnabled(!vendorCheckEnabled);
      updateToggleStyle(button);
    });

    updateToggleStyle(button);
    sortButton.parentElement.appendChild(button);
  }

  function processInventoryButton(button) {
    const itemName = button.dataset.idlemmoItemName;
    let badge = button.querySelector(`.${VENDOR_CHECK_BADGE_CLASS}`);

    const item = itemName && pricesByName ? pricesByName.get(itemName) : null;
    const vendor = item ? item.vendor_price_with_bartering : null;
    const netMarket = item ? item.net_market_price : null;
    const hasPrices = vendor !== null && vendor !== undefined
      && netMarket !== null && netMarket !== undefined;

    if (!hasPrices) {
      if (badge) badge.remove();
      return;
    }

    const diff = vendor - netMarket;
    const isPositive = diff >= 0;
    const text = isPositive ? 'Vendor' : `-${formatNumber(Math.abs(diff))}`;
    const color = isPositive ? '#4ade80' : '#f87171';

    if (!badge) {
      badge = document.createElement('div');
      badge.className = VENDOR_CHECK_BADGE_CLASS;
      badge.style.position = 'absolute';
      badge.style.bottom = '2px';
      badge.style.left = '4px';
      badge.style.fontSize = '9px';
      badge.style.lineHeight = '1';
      badge.style.fontWeight = 'bold';
      badge.style.textShadow = '0 0 2px #000, 0 0 2px #000';
      badge.style.pointerEvents = 'none';
      button.appendChild(badge);
    }

    if (badge.textContent !== text) badge.textContent = text;
    if (badge.style.color !== color) badge.style.color = color;
  }

  function scan() {
    if (features.navIconColors) {
      applyNavIconColors();
    } else {
      removeNavIconColors();
    }

    if (features.characterSwitchButtons) {
      buildCharacterSwitchButtons();
    } else {
      const panel = document.querySelector(`.${CHARACTER_PANEL_CLASS}`);
      if (panel) panel.remove();
    }

    if (features.skillListReverse) {
      applySkillListReverse();
    } else {
      removeSkillListReverse();
    }

    if (features.netMarketTax) {
      const rows = document.querySelectorAll('div.flex.justify-between.items-center');
      rows.forEach((row) => {
        if (row.classList.contains(ROW_MARKER_CLASS)) return;
        const label = row.querySelector(':scope > span.font-medium.text-gray-200');
        if (label && label.textContent.trim() === 'Price Range') {
          processPriceRangeRow(row);
        }
      });

      const listingRows = document.querySelectorAll('div.flex.items-center.justify-between.px-4');
      listingRows.forEach((row) => {
        if (row.classList.contains(LISTING_ROW_MARKER_CLASS)) return;
        const label = row.querySelector('span.truncate.font-bold');
        if (label && label.textContent.trim() === 'Price Per Item') {
          processPricePerItemRow(row);
        }
      });
    } else {
      document.querySelectorAll(`.${ROW_MARKER_CLASS}`).forEach((row) => row.remove());
      document.querySelectorAll(`.${LISTING_ROW_MARKER_CLASS}`).forEach((row) => row.remove());
    }

    if (location.pathname === '/inventory' && features.vendorCheck) {
      ensureVendorToggle();

      if (vendorCheckEnabled) {
        requestPrices();
        document.querySelectorAll('button[data-idlemmo-item-name]').forEach(processInventoryButton);
      } else {
        document.querySelectorAll(`.${VENDOR_CHECK_BADGE_CLASS}`).forEach((badge) => badge.remove());
      }
    } else {
      const toggle = document.getElementById(VENDOR_TOGGLE_ID);
      if (toggle) toggle.remove();
      document.querySelectorAll(`.${VENDOR_CHECK_BADGE_CLASS}`).forEach((badge) => badge.remove());
    }
  }

  const NAV_ICON_CLASS_PREFIX = 'idlemmo-helper-nav-';
  const NAV_ICON_KNOWN_CLASSES = [
    // Character
    'profile',
    'inventory',
    'map',

    // Skills
    'woodcutting',
    'mining',
    'fishing',
    'alchemy',
    'smelting',
    'cooking',
    'forge',
    'meditation',
    'construction',

    // Play
    'pets',
    'museum',
    'quests',
    'guilds',
    'leagues',

    // Combat
    'battle',
    'dungeon',
    'world-boss',

    // Trade
    'merchants',
    'market',
  ];

  function applyNavIconColors() {
    const links = document.querySelectorAll('[id^="section-"] li a');
    links.forEach((link) => {
      const match = link.href.match(/(?:skills\/view\/|@)?([a-zA-Z-]+)$/);
      const className = match && match[1] ? match[1].toLowerCase() : '';

      NAV_ICON_KNOWN_CLASSES.forEach((cls) => {
        const prefixed = `${NAV_ICON_CLASS_PREFIX}${cls}`;
        if (cls !== className && link.classList.contains(prefixed)) {
          link.classList.remove(prefixed);
        }
      });

      if (className && NAV_ICON_KNOWN_CLASSES.includes(className)) {
        link.classList.add(`${NAV_ICON_CLASS_PREFIX}${className}`);
      }
    });
  }

  function removeNavIconColors() {
    const links = document.querySelectorAll('[id^="section-"] li a');
    links.forEach((link) => {
      NAV_ICON_KNOWN_CLASSES.forEach((cls) => {
        link.classList.remove(`${NAV_ICON_CLASS_PREFIX}${cls}`);
      });
    });
  }

  const CHARACTER_PANEL_CLASS = 'idlemmo-helper-character-panel';
  const CHARACTER_SWITCH_BUTTON_CLASS = 'idlemmo-helper-character-switch-button';

  function toggleCharacterDropdown() {
    const toggle = document.querySelector('[x-on\\:click*="characterDropdown"], [\\@click*="characterDropdown"]');
    if (toggle) toggle.click();
  }

  let characterDropdownTriggered = false;

  function buildCharacterSwitchButtons() {
    const gameContainer = document.querySelector('#game-container');
    if (!gameContainer) return;

    if (document.querySelector(`.${CHARACTER_PANEL_CLASS}`)) return;

    const dropdown = document.querySelector('[x-show="characterDropdown"]');
    if (!dropdown) return;

    const forms = dropdown.querySelectorAll('form[action*="/character/switch/"]');
    if (!forms.length) {
      if (!characterDropdownTriggered) {
        // Character list is lazy-loaded; open the dropdown once to trigger it.
        characterDropdownTriggered = true;
        toggleCharacterDropdown();
      }
      return;
    }

    const panel = document.createElement('div');
    panel.className = `flex flex-wrap justify-end gap-2 mb-4 ${CHARACTER_PANEL_CLASS}`;

    forms.forEach((form) => {
      const nameSpan = form.querySelector('span.font-bold');
      const name = nameSpan ? nameSpan.textContent.trim() : 'Character';

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `Switch to ${name}`;
      button.className = `rounded bg-black/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/40 disabled:opacity-40 disabled:cursor-not-allowed ${CHARACTER_SWITCH_BUTTON_CLASS}`;
      button.disabled = !!form.querySelector('button[type="submit"]')?.disabled;

      button.addEventListener('click', () => {
        if (form.requestSubmit) {
          form.requestSubmit();
        } else {
          form.submit();
        }
      });

      panel.appendChild(button);
    });

    gameContainer.before(panel);
  }

  function applySkillListReverse() {
    const targetNode = document.querySelector('[x-data="skill_list"]');
    if (!targetNode) return;

    const ulList = targetNode.querySelector('ul[role="list"]');
    if (ulList && ulList.style.flexDirection !== 'column-reverse') {
      ulList.style.display = 'flex';
      ulList.style.flexDirection = 'column-reverse';
    }
  }

  function removeSkillListReverse() {
    const targetNode = document.querySelector('[x-data="skill_list"]');
    if (!targetNode) return;

    const ulList = targetNode.querySelector('ul[role="list"]');
    if (ulList && ulList.style.flexDirection === 'column-reverse') {
      ulList.style.display = '';
      ulList.style.flexDirection = '';
    }
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      scan();
    }, 100);
  }

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  window.addEventListener('idlemmo-helper-tagged', scheduleScan);

  scheduleScan();
})();
