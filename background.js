// background.js — service worker

function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'smartNotepadSaveSelection',
    title: 'Save selection to Smart Notepad',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'smartNotepadSaveSelection') return;
  const selectedText = info.selectionText || '';
  if (!selectedText.trim()) return;

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
    pageUrl:   tab?.url   || ''
  };

  // ✅ Use local storage (10MB) instead of sync (8KB per key)
  chrome.storage.local.get(['notes'], (result) => {
    const notes = result.notes || [];
    notes.unshift(note);
    chrome.storage.local.set({ notes });
  });
});
