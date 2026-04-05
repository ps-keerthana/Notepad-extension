// note.js — detail / edit window for a single note
let currentNoteId = null;
let currentNote   = null;

function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

document.addEventListener('DOMContentLoaded', () => {
  const originEl  = document.getElementById('origin');
  const tsEl      = document.getElementById('timestamp');
  const editArea  = document.getElementById('editArea');
  const saveBtn   = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');
  const closeBtn  = document.getElementById('closeBtn');

  const params = new URLSearchParams(location.search);
  currentNoteId = Number(params.get('noteId'));

  // ✅ Use local storage
  chrome.storage.local.get(['notes'], (res) => {
    const notes = res.notes || [];
    currentNote = notes.find(n => n.id === currentNoteId);
    if (!currentNote) { editArea.value = 'Note not found.'; return; }

    originEl.textContent = currentNote.pageTitle || 'Unknown source';
    originEl.title       = currentNote.pageUrl   || '';
    tsEl.textContent     = currentNote.timestamp || '';
    editArea.value       = currentNote.text      || '';

    originEl.onclick = () => {
      if (currentNote.pageUrl) chrome.tabs.create({ url: currentNote.pageUrl });
    };
  });

  saveBtn.onclick = () => {
    const newText = editArea.value;
    chrome.storage.local.get(['notes'], (res) => {
      const notes = res.notes || [];
      const idx = notes.findIndex(n => n.id === currentNoteId);
      if (idx === -1) return;
      notes[idx].text = newText;
      if (!notes[idx].createdDate) {
        notes[idx].createdDate = formatDateKey(new Date(notes[idx].timestamp || Date.now()));
      }
      chrome.storage.local.set({ notes }, () => {
        chrome.runtime.sendMessage({ type: 'NOTE_UPDATED', noteId: currentNoteId });
        window.close();
      });
    });
  };

  deleteBtn.onclick = () => {
    chrome.storage.local.get(['notes'], (res) => {
      const notes = (res.notes || []).filter(n => n.id !== currentNoteId);
      chrome.storage.local.set({ notes }, () => {
        chrome.runtime.sendMessage({ type: 'NOTE_DELETED', noteId: currentNoteId });
        window.close();
      });
    });
  };

  closeBtn.onclick = () => window.close();
});

// ── Formatting Toolbar ─────────────────────────────────────────────────────
(function initFmtToolbar() {
  const toolbar  = document.getElementById('noteFmtToolbar');
  const textarea = document.getElementById('editArea');
  if (!toolbar || !textarea) return;

  const FORMATS = {
    bold:   { wrap: ['**', '**'],   line: false, placeholder: 'bold text' },
    italic: { wrap: ['*', '*'],     line: false, placeholder: 'italic text' },
    code:   { wrap: ['`', '`'],     line: false, placeholder: 'code' },
    strike: { wrap: ['~~', '~~'],   line: false, placeholder: 'text' },
    quote:  { wrap: ['> ', ''],     line: true,  placeholder: 'quote' },
    olist:  { wrap: null,           line: true,  placeholder: 'item' },
    task:   { wrap: ['- [ ] ', ''], line: true,  placeholder: 'task' },
    bullet: { wrap: ['- ', ''],     line: true,  placeholder: 'item' },
    h1:     { wrap: ['# ', ''],     line: true,  placeholder: 'Heading' },
    h2:     { wrap: ['## ', ''],    line: true,  placeholder: 'Heading' },
  };

  toolbar.addEventListener('mousedown', (e) => e.preventDefault());

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fmt]');
    if (!btn) return;
    applyFormat(btn.dataset.fmt);
    textarea.focus();
  });

  function applyFormat(fmt) {
    const cfg = FORMATS[fmt];
    if (!cfg) return;

    const start = textarea.selectionStart;
    const end   = textarea.selectionEnd;
    const val   = textarea.value;
    const sel   = val.slice(start, end);

    let before, insert, after, newStart, newEnd;

    if (fmt === 'olist') {
      const textBefore = val.slice(0, start);
      const linesAbove = textBefore.split('\n');
      let nextNum = 1;
      for (let i = linesAbove.length - 1; i >= 0; i--) {
        const m = linesAbove[i].match(/^(\d+)\.\s/);
        if (m) { nextNum = parseInt(m[1]) + 1; break; }
        if (linesAbove[i].trim() !== '') break;
      }
      const lineStart   = val.lastIndexOf('\n', start - 1) + 1;
      const lineContent = val.slice(start, end) || cfg.placeholder;
      const prefix      = `${nextNum}. `;
      textarea.value    = val.slice(0, lineStart) + prefix + lineContent + val.slice(end);
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length + lineContent.length);
      return;
    }

    if (cfg.line) {
      const lineStart  = val.lastIndexOf('\n', start - 1) + 1;
      const prefix     = cfg.wrap[0];
      const lineContent = sel || cfg.placeholder;
      before   = val.slice(0, lineStart);
      insert   = prefix + lineContent;
      after    = val.slice(end);
      newStart = lineStart + prefix.length;
      newEnd   = newStart + lineContent.length;
    } else {
      const [open, close] = cfg.wrap;
      const text = sel || cfg.placeholder;
      before   = val.slice(0, start);
      insert   = open + text + close;
      after    = val.slice(end);
      newStart = start + open.length;
      newEnd   = newStart + text.length;
    }

    textarea.value = before + insert + after;
    textarea.setSelectionRange(newStart, newEnd);
  }
})();
