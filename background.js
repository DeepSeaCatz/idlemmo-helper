const API_URL = 'https://france-idlemmo.fr/api/v1/items/prices';
const ASSAULT_URL = 'https://france-idlemmo.fr/api/v1/assault/status';
const WORLD_BOSS_URL = 'https://france-idlemmo.fr/api/v1/world-boss/status';
const ENERGIZING_POOL_URL = 'https://france-idlemmo.fr/api/v1/energizing-pool/status';
const CACHE_KEY = 'idlemmo_helper_prices';
const CACHE_TTL_MS = 30 * 60 * 1000;

async function getPrices() {
  const cached = await chrome.storage.local.get(CACHE_KEY);
  const entry = cached[CACHE_KEY];

  if (entry && (Date.now() - entry.fetchedAt) < CACHE_TTL_MS) {
    return entry.data;
  }

  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    await chrome.storage.local.set({ [CACHE_KEY]: { data, fetchedAt: Date.now() } });
    return data;
  } catch (e) {
    return entry ? entry.data : null;
  }
}

async function fetchStatus(url) {
  try {
    const response = await fetch(url);
    return await response.json();
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'idlemmo-helper-get-prices') {
    getPrices().then(sendResponse);
    return true;
  }

  if (message && message.type === 'idlemmo-helper-get-assault-status') {
    fetchStatus(ASSAULT_URL).then(sendResponse);
    return true;
  }

  if (message && message.type === 'idlemmo-helper-get-worldboss-status') {
    fetchStatus(WORLD_BOSS_URL).then(sendResponse);
    return true;
  }

  if (message && message.type === 'idlemmo-helper-get-energizing-pool-status') {
    fetchStatus(ENERGIZING_POOL_URL).then(sendResponse);
    return true;
  }
});
