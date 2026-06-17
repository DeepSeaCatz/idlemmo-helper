(() => {
  const ITEM_BUTTON_SELECTOR = 'button[x-on\\:click="selected_item = inventory_item;"]';

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

  const observer = new MutationObserver(() => tagInventoryButtons());
  observer.observe(document.body, { childList: true, subtree: true });

  tagInventoryButtons();
})();
