let currentNoteId = null;
let currentNote = null;

// Helper: date key if missing (keeps stats consistent)
function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', () => {
  const originEl = document.getElementById('origin');
  const tsEl     = document.getElementById('timestamp');
  const editArea = document.getElementById('editArea');
  const saveBtn  = document.getElementById('saveBtn');
  const deleteBtn= document.getElementById('deleteBtn');
  const closeBtn = document.getElementById('closeBtn');

  // Read noteId from query string: note.html?noteId=123
  const params = new URLSearchParams(location.search);
  currentNoteId = Number(params.get('noteId'));

  chrome.storage.sync.get(['notes'], (res) => {
    const notes = res.notes || [];
    currentNote = notes.find(n => n.id === currentNoteId);
    if (!currentNote) {
      editArea.value = 'Note not found.';
      return;
    }
    originEl.textContent = currentNote.pageTitle || 'Unknown source';
    originEl.title = currentNote.pageUrl || '';
    tsEl.textContent = currentNote.timestamp || '';

    editArea.value = currentNote.text || '';

    originEl.onclick = () => {
      if (currentNote.pageUrl) chrome.tabs.create({ url: currentNote.pageUrl });
    };
  });

saveBtn.onclick = () => {
  const newText = editArea.value;
  chrome.storage.sync.get(['notes'], (res) => {
    const notes = res.notes || [];
    const idx = notes.findIndex(n => n.id === currentNoteId);
    if (idx === -1) return;

    notes[idx].text = newText;
    if (!notes[idx].createdDate) {
      notes[idx].createdDate = formatDateKey(new Date(notes[idx].timestamp || Date.now()));
    }

    chrome.storage.sync.set({ notes }, () => {
      // notify any open popup to refresh
      chrome.runtime.sendMessage({ type: 'NOTE_UPDATED', noteId: currentNoteId });
      window.close();
    });
  });
};

deleteBtn.onclick = () => {
  chrome.storage.sync.get(['notes'], (res) => {
    const notes = (res.notes || []).filter(n => n.id !== currentNoteId);
    chrome.storage.sync.set({ notes }, () => {
      chrome.runtime.sendMessage({ type: 'NOTE_DELETED', noteId: currentNoteId });
      window.close();
    });
  });
};

  closeBtn.onclick = () => window.close();
});
