function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

// Create a context menu item for selected text
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'smartNotepadSaveSelection',
    title: 'Save selection to Smart Notepad',
    contexts: ['selection']
  });
});

// Handle clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'smartNotepadSaveSelection') return;

  const selectedText = info.selectionText || '';
  if (!selectedText.trim()) return;

  const pageTitle = tab && tab.title ? tab.title : 'Untitled page';
  const pageUrl   = tab && tab.url   ? tab.url   : '';

  const now = new Date();
  const note = {
    id: Date.now(),
    // wrap selection in * * so it renders italic in popup
    text: '*' + selectedText + '*\n\n#clip',
    tags: '📎 Clip',
    timestamp: now.toLocaleString(),
    createdDate: formatDateKey(now),
    pageTitle,
    pageUrl
  };

  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    notes.unshift(note);
    if (notes.length > 50) notes.pop();

    chrome.storage.sync.set({ notes });
  });
});
