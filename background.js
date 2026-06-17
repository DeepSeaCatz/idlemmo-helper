const API_URL = 'https://france-idlemmo.fr/api/v1/items/prices';
const ASSAULT_URL = 'https://france-idlemmo.fr/api/v1/assault/status';
const WORLD_BOSS_URL = 'https://france-idlemmo.fr/api/v1/world-boss/status';
const ENERGIZING_POOL_URL = 'https://france-idlemmo.fr/api/v1/energizing-pool/status';
const CACHE_KEY = 'idlemmo_helper_prices';
const CACHE_TTL_MS = 30 * 60 * 1000;
const TIMER_ALARM_NAME = 'idlemmo-helper-pets-timer';
const TIMER_STORAGE_KEY = 'idlemmo_helper_pets_timer';

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

async function startPetsTimer(durationMs, label) {
  const endAt = Date.now() + durationMs;
  await chrome.storage.local.set({ [TIMER_STORAGE_KEY]: { endAt, label } });

  try {
    await chrome.alarms.create(TIMER_ALARM_NAME, { when: endAt });
    const created = await chrome.alarms.get(TIMER_ALARM_NAME);
    console.log('idlemmo-helper alarm created', created);
  } catch (e) {
    console.error('idlemmo-helper alarm creation error', e);
    return { error: e.message };
  }

  return { endAt };
}

async function cancelPetsTimer() {
  await chrome.alarms.clear(TIMER_ALARM_NAME);
  await chrome.storage.local.remove(TIMER_STORAGE_KEY);
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('idlemmo-helper alarm fired', alarm);
  if (alarm.name !== TIMER_ALARM_NAME) return;

  const stored = await chrome.storage.local.get(TIMER_STORAGE_KEY);
  const timer = stored[TIMER_STORAGE_KEY];
  await chrome.storage.local.remove(TIMER_STORAGE_KEY);

  chrome.notifications.create(
    `${TIMER_ALARM_NAME}-${Date.now()}`,
    {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'IdleMMO Helper',
      message: timer && timer.label ? `Minuteur terminé : ${timer.label}` : 'Minuteur terminé !',
    },
    (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('idlemmo-helper notification error', chrome.runtime.lastError);
      } else {
        console.log('idlemmo-helper notification created', notificationId);
      }
    }
  );
});

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

  if (message && message.type === 'idlemmo-helper-start-pets-timer') {
    startPetsTimer(message.durationMs, message.label).then(sendResponse);
    return true;
  }

  if (message && message.type === 'idlemmo-helper-cancel-pets-timer') {
    cancelPetsTimer().then(sendResponse);
    return true;
  }
});
