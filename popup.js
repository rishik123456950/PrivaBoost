document.addEventListener('DOMContentLoaded', initPopup);

async function initPopup() {
  // Load settings
  const { settings } = await chrome.storage.sync.get("settings");
  const savedSettings = settings || DEFAULT_SETTINGS;
  
  document.getElementById('suspensionTime').value = savedSettings.suspensionTime;
  document.getElementById('whitelist').value = savedSettings.whitelist.join(', ');
  document.getElementById('adblockToggle').checked = savedSettings.adblockEnabled;
  
  // Update stats
  updateTabStats();
  updateMemoryInfo();
  updateBlockCounter();
  
  // Setup event listeners
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  document.getElementById('adblockToggle').addEventListener('change', toggleAdBlock);
  document.getElementById('helpLink').addEventListener('click', showHelp);
  
  // Set up auto-updates
  setInterval(updateTabStats, 3000);
  setInterval(updateMemoryInfo, 5000);
  setInterval(updateBlockCounter, 2000);
}

const DEFAULT_SETTINGS = {
  suspensionTime: 10,
  whitelist: ["gmail.com", "notion.so"],
  adblockEnabled: true
};

async function updateTabStats() {
  try {
    const tabs = await chrome.tabs.query({});
    const activeTabs = tabs.filter(t => !t.discarded).length;
    
    document.getElementById('activeTabs').textContent = activeTabs;
    document.getElementById('savedRAM').textContent = 
      `${(tabs.length - activeTabs) * 100}MB`;
  } catch (error) {
    console.error("Tab stats error:", error);
  }
}

async function updateMemoryInfo() {
  try {
    const memInfo = await chrome.system.memory.getInfo();
    const percent = Math.round(memInfo.availableCapacity / memInfo.capacity * 100);
    
    document.getElementById('memoryText').textContent = 
      `${percent}% available (${Math.round(memInfo.availableCapacity/1e6)}MB)`;
    document.getElementById('memoryBar').style.width = `${percent}%`;
    document.getElementById('memoryBadge').textContent = `${percent}%`;
  } catch (error) {
    console.error("Memory update error:", error);
    document.getElementById('memoryText').textContent = "Memory data unavailable";
  }
}

async function updateBlockCounter() {
  try {
    const { blockCount = 0 } = await chrome.storage.local.get("blockCount");
    document.getElementById('blockCount').textContent = blockCount.toLocaleString();
    
    // Visual progress (0-1000 blocks = 0-100%)
    const progress = Math.min(100, blockCount / 10);
    document.getElementById('blockProgress').style.width = `${progress}%`;
  } catch (error) {
    console.error("Block counter error:", error);
  }
}

async function saveSettings() {
  try {
    const saveBtn = document.getElementById('saveSettings');
    const newSettings = {
      suspensionTime: parseInt(document.getElementById('suspensionTime').value) || 10,
      whitelist: document.getElementById('whitelist').value
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      adblockEnabled: document.getElementById('adblockToggle').checked
    };
    
    await chrome.storage.sync.set({ settings: newSettings });
    
    // Update ad blocking status
    toggleAdBlock({ target: { checked: newSettings.adblockEnabled } });
    
    // Visual feedback
    saveBtn.textContent = "✓ Saved!";
    saveBtn.disabled = true;
    setTimeout(() => {
      saveBtn.textContent = "Save Settings";
      saveBtn.disabled = false;
    }, 2000);
  } catch (error) {
    console.error("Save settings error:", error);
    alert("Failed to save settings. See console for details.");
  }
}

async function resetSettings() {
  if (!confirm("Reset all settings to defaults?")) return;
  
  try {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    document.getElementById('suspensionTime').value = DEFAULT_SETTINGS.suspensionTime;
    document.getElementById('whitelist').value = DEFAULT_SETTINGS.whitelist.join(', ');
    document.getElementById('adblockToggle').checked = DEFAULT_SETTINGS.adblockEnabled;
    
    // Update ad blocking status
    toggleAdBlock({ target: { checked: DEFAULT_SETTINGS.adblockEnabled } });
  } catch (error) {
    console.error("Reset settings error:", error);
  }
}

function toggleAdBlock(e) {
  try {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: e.target.checked ? ['ad_tracker_rules'] : [],
      disableRulesetIds: e.target.checked ? [] : ['ad_tracker_rules']
    });
  } catch (error) {
    console.error("Adblock toggle error:", error);
  }
}

function showHelp(e) {
  e.preventDefault();
  chrome.tabs.create({ url: "https://github.com/yourusername/privacyboost/wiki" });
}