const TAB_STATE = new Map();
const DEFAULT_SETTINGS = {
  suspensionTime: 10,
  whitelist: ["gmail.com", "notion.so"],
  adblockEnabled: true
};

// Initialize settings
chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.sync.get("settings");
  if (!settings) {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
  }
  
  chrome.alarms.create('tabCleaner', { periodInMinutes: 1 });
  chrome.alarms.create('memoryMonitor', { periodInMinutes: 0.5 });
});

// Tab activity tracking
chrome.tabs.onActivated.addListener(({ tabId }) => updateTabState(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "complete") updateTabState(tabId);
});

function updateTabState(tabId) {
  TAB_STATE.set(tabId, {
    lastActive: Date.now(),
    isDiscarded: false
  });
}

// Tab suspension logic
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'tabCleaner') {
    const { settings } = await chrome.storage.sync.get("settings");
    const tabs = await chrome.tabs.query({});
    
    tabs.forEach(tab => {
      if (!tab.active && shouldSuspendTab(tab, settings)) {
        chrome.tabs.discard(tab.id).catch(console.error);
        TAB_STATE.set(tab.id, { lastActive: Date.now(), isDiscarded: true });
      }
    });
  }
});

function shouldSuspendTab(tab, settings) {
  const state = TAB_STATE.get(tab.id);
  if (!state || state.isDiscarded) return false;
  
  // Skip special tabs and whitelisted domains
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) return false;
  
  const isWhitelisted = settings.whitelist.some(domain => 
    tab.url && tab.url.includes(domain));
  
  // Skip tabs with active media or form input
  const hasActiveMedia = tab.audible || tab.mutedInfo?.muted;
  const hasFormData = tab.discarded === false; // Chrome maintains form data
  
  const inactiveTime = (Date.now() - state.lastActive) / 60000;
  
  return !isWhitelisted && 
         !hasActiveMedia && 
         !hasFormData &&
         inactiveTime >= settings.suspensionTime;
}

// Memory monitoring
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'memoryMonitor') {
    try {
      const memInfo = await chrome.system.memory.getInfo();
      const percent = Math.round(memInfo.availableCapacity / memInfo.capacity * 100);
      
      chrome.action.setBadgeText({ text: `${percent}%` });
      chrome.action.setBadgeBackgroundColor({ 
        color: percent > 50 ? '#0F9D58' : percent > 25 ? '#F4B400' : '#DB4437'
      });
    } catch (error) {
      console.error("Memory monitoring failed:", error);
    }
  }
});

// Blocked request counter
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
  chrome.storage.local.get(["blockCount"], (result) => {
    const count = (result.blockCount || 0) + 1;
    chrome.storage.local.set({ blockCount: count });
  });
});