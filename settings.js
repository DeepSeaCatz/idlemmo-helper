(() => {
  const SETTINGS_KEY = 'idlemmo_helper_settings';

  const FEATURES = [
    {
      id: 'netMarketTax',
      label: 'Prix net après taxe',
      description: 'Affiche le prix net après taxe sur le marché et dans les annonces.',
    },
    {
      id: 'vendorCheck',
      label: 'Vendor Check',
      description: "Compare le prix vendeur au prix net du marché dans l'inventaire.",
    },
    {
      id: 'navIconColors',
      label: 'Icônes de navigation colorées',
      description: 'Colore les icônes du menu de navigation.',
    },
    {
      id: 'characterSwitchButtons',
      label: 'Boutons de changement de personnage',
      description: 'Affiche des boutons rapides pour changer de personnage.',
    },
    {
      id: 'skillListReverse',
      label: 'Liste des compétences inversée',
      description: 'Inverse l\'ordre de la liste des compétences.',
    },
    {
      id: 'topBarWidgets',
      label: 'Bandeau Assaut / World Boss / Pool',
      description: "Affiche le statut de l'Assaut, du World Boss et de l'Energizing Pool en haut de l'écran.",
    },
    {
      id: 'battleCalculator',
      label: 'Calculateur Battle XP',
      description: "Affiche un calculateur d'XP sur la page de combat.",
    },
  ];

  function getDefaultFeatures() {
    const defaults = {};
    FEATURES.forEach(({ id }) => { defaults[id] = true; });
    return defaults;
  }

  function loadFeatureSettings(callback) {
    chrome.storage.local.get(SETTINGS_KEY, (data) => {
      const stored = (data[SETTINGS_KEY] && data[SETTINGS_KEY].features) || {};
      callback({ ...getDefaultFeatures(), ...stored });
    });
  }

  function onFeatureSettingsChanged(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[SETTINGS_KEY]) return;
      const stored = (changes[SETTINGS_KEY].newValue && changes[SETTINGS_KEY].newValue.features) || {};
      callback({ ...getDefaultFeatures(), ...stored });
    });
  }

  window.IdleMMOHelperSettings = {
    SETTINGS_KEY,
    FEATURES,
    getDefaultFeatures,
    loadFeatureSettings,
    onFeatureSettingsChanged,
  };
})();
