(() => {
  const ITEM_BUTTON_SELECTOR = 'button[x-on\\:click="selected_item = inventory_item;"]';
  const CHARACTER_DROPDOWN_TOGGLE_SELECTOR = '[x-on\\:click*="characterDropdown"], [\\@click*="characterDropdown"]';
  const CHARACTER_SWITCH_FORM_SELECTOR = '[x-show="characterDropdown"] form[action*="/character/switch/"]';

  function tagInventoryButtons() {
    if (!window.Alpine) return;

    let tagged = false;

    document.querySelectorAll(ITEM_BUTTON_SELECTOR).forEach((button) => {
      if (button.dataset.idlemmoItemName) return;

      const data = window.Alpine.$data(button);
      const item = data && data.inventory_item;

      if (item && item.name) {
        button.dataset.idlemmoItemName = item.name;
        tagged = true;
      }
    });

    if (tagged) {
      window.dispatchEvent(new CustomEvent('idlemmo-helper-tagged'));
    }
  }

  let characterDropdownTriggered = false;
  let weOpenedCharacterDropdown = false;

  function ensureCharacterListLoaded() {
    if (!window.Alpine) return;

    const toggle = document.querySelector(CHARACTER_DROPDOWN_TOGGLE_SELECTOR);
    if (!toggle) return;

    let data;
    try {
      data = window.Alpine.$data(toggle);
    } catch {
      return;
    }

    if (!data || !('characterDropdown' in data)) return;

    const forms = document.querySelectorAll(CHARACTER_SWITCH_FORM_SELECTOR);

    if (forms.length) {
      if (weOpenedCharacterDropdown) {
        weOpenedCharacterDropdown = false;
        data.characterDropdown = false;
      }
      return;
    }

    if (!characterDropdownTriggered) {
      characterDropdownTriggered = true;
      weOpenedCharacterDropdown = true;
      data.characterDropdown = true;
    }
  }

  const observer = new MutationObserver(() => {
    tagInventoryButtons();
    ensureCharacterListLoaded();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  tagInventoryButtons();
  ensureCharacterListLoaded();
})();
