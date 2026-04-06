// background.js — service worker

function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// ── On install ────────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'smartNotepadSaveSelection',
    title: 'Save selection to Smart Notepad',
    contexts: ['selection']
  });
  chrome.sidePanel.setOptions({ enabled: true, path: 'popup.html' });
});

// ── Action click → open side panel ───────────────────────────────────────────
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ── Context menu: save selection ──────────────────────────────────────────────
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'smartNotepadSaveSelection') return;
  const selectedText = info.selectionText || '';
  if (!selectedText.trim()) return;

  let tabGroupColor = null;
  try {
    if (tab.groupId && tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
      const group = await chrome.tabGroups.get(tab.groupId);
      tabGroupColor = group.color || null;
    }
  } catch (_) {}

  const now = new Date();
  const note = {
    id: Date.now(),
    text: '*' + selectedText + '*\n\n#clip',
    tags: '📎 Clip',
    category: '',
    pinned: false,
    timestamp: now.toLocaleString(),
    createdDate: formatDateKey(now),
    pageTitle: tab?.title || 'Untitled page',
    pageUrl: tab?.url || '',
    tabGroupColor
  };

  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    notes.unshift(note);
    chrome.storage.local.set({ notes }, () => {
      // Notify popup if it's open so it reloads instantly
      chrome.runtime.sendMessage({ type: 'NOTE_SAVED' }).catch(() => {});
    });
  });
});

// ── Messages from popup ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // Register an alarm for a reminder
  if (msg.type === 'SET_ALARM') {
    const delayInMinutes = Math.max(0.1, (msg.fireAt - Date.now()) / 60000);
    chrome.alarms.create(msg.remId, { delayInMinutes });
    sendResponse({ ok: true });
    return true;
  }

  // Cancel an alarm
  if (msg.type === 'CLEAR_ALARM') {
    chrome.alarms.clear(msg.remId, () => sendResponse({ ok: true }));
    return true;
  }
});

// ── Alarm fires → show silent OS notification ────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  // Only handle our reminder alarms (prefixed snp_rem_)
  if (!alarm.name.startsWith('snp_rem_')) return;

  // Look up the reminder to get the note text
  chrome.storage.local.get(['reminders'], (res) => {
    const reminders = res.reminders || [];
    const rem = reminders.find(r => r.id === alarm.name);
    const title = 'Smart Notepad reminder';
    const message = rem ? (rem.noteText || 'Your note reminder') : 'Your note reminder';

    // Show silent Chrome notification (no sound by default on most OSes)
    chrome.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: 'icon128.png',
      title,
      message,
      silent: true,           // ← explicitly no sound
      priority: 0             // normal priority, non-intrusive
    });

    // Remove fired reminder from storage so it doesn't show in list
    const updated = reminders.filter(r => r.id !== alarm.name);
    chrome.storage.local.set({ reminders: updated });

    // Notify popup if open so it refreshes its list
    chrome.runtime.sendMessage({ type: 'REMINDER_FIRED', remId: alarm.name }).catch(() => {});
  });
});

// ── On startup: re-register any pending alarms that survived a browser restart ──
// (chrome.alarms survive restarts, but this is a safety net)
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['reminders'], (res) => {
    const reminders = res.reminders || [];
    const now = Date.now();
    const future = reminders.filter(r => r.fireAt > now);

    future.forEach(r => {
      chrome.alarms.get(r.id, (existing) => {
        if (!existing) {
          const delayInMinutes = Math.max(0.1, (r.fireAt - now) / 60000);
          chrome.alarms.create(r.id, { delayInMinutes });
        }
      });
    });

    // Clean up past reminders from storage
    const past = reminders.filter(r => r.fireAt <= now);
    if (past.length) {
      chrome.storage.local.set({ reminders: future });
    }
  });
});
