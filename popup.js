(() => {
  const { SETTINGS_KEY, FEATURES, loadFeatureSettings } = window.IdleMMOHelperSettings;

  const container = document.getElementById('features');

  function render(features) {
    container.innerHTML = '';

    FEATURES.forEach(({ id, label, description }) => {
      const wrap = document.createElement('div');
      wrap.className = 'feature';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `feature-${id}`;
      checkbox.checked = features[id] !== false;

      const textWrap = document.createElement('div');
      const labelEl = document.createElement('label');
      labelEl.htmlFor = checkbox.id;
      labelEl.textContent = label;

      const desc = document.createElement('p');
      desc.textContent = description;

      textWrap.appendChild(labelEl);
      textWrap.appendChild(desc);

      checkbox.addEventListener('change', () => {
        features[id] = checkbox.checked;
        chrome.storage.local.set({ [SETTINGS_KEY]: { features } });
      });

      wrap.appendChild(checkbox);
      wrap.appendChild(textWrap);
      container.appendChild(wrap);
    });
  }

  loadFeatureSettings(render);
})();
