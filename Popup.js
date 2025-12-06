function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Markdown-lite renderer: **bold**, *italic*, `code`, line breaks
function renderMarkdownLite(text) {
  if (!text) return '';

  // 1) Escape & and < first
  let safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;');

  // 2) Blockquote: lines starting with "> "
  safe = safe.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');

  // 3) Now escape any remaining ">"
  safe = safe.replace(/>/g, '&gt;');

  // 4) Checklist items
  safe = safe.replace(
    /^-\s\[( |x)\]\s+(.*)$/gim,
    (match, checked, label) =>
      `<div class="task-line"><input type="checkbox" class="task-checkbox" ${checked === 'x' ? 'checked' : ''} data-label="${label.replace(/"/g, '&quot;')}" /> <span>${label}</span></div>`
  );

  // 5) FIXED: Inline code `code`
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 6) Bold: **text**
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 7) Italic: *text*
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 8) Line breaks
  safe = safe.replace(/\n/g, '<br>');

  return safe;
}

function getColorForTag(tag) {
  const palette = [
    { bg: '#fee2e2', fg: '#b91c1c' }, // red
    { bg: '#ffedd5', fg: '#c05621' }, // orange
    { bg: '#fef3c7', fg: '#92400e' }, // amber
    { bg: '#dcfce7', fg: '#166534' }, // green
    { bg: '#e0f2fe', fg: '#075985' }, // sky
    { bg: '#e0e7ff', fg: '#3730a3' }, // indigo
    { bg: '#fce7f3', fg: '#9d174d' }  // pink
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  const idx = hash % palette.length;
  return palette[idx];
}

// Global: which hashtag is currently active (e.g., "#cn")
let currentTagFilter = null;
let stats = {
  today: 0,
  week: 0,
  streak: 0,
  bestStreak: 0,
  total: 0
};

// IDs of notes currently selected for merge
let selectedNoteIds = new Set();
let searchQuery = '';  // ADD THIS LINE


document.addEventListener('DOMContentLoaded', function() {
  const noteInput   = document.getElementById('noteInput');
  const saveBtn     = document.getElementById('saveBtn');
  const clearBtn    = document.getElementById('clearBtn');
  const voiceBtn    = document.getElementById('voiceBtn');
  const tagsSection = document.getElementById('tagsSection');
  const autoTags    = document.getElementById('autoTags');
  const notesList   = document.getElementById('notesList');
  const tagFilters  = document.getElementById('tagFilters');

  const statsBtn    = document.getElementById('statsBtn');
  const statsPanel  = document.getElementById('statsPanel');
  const statToday   = document.getElementById('statToday');
  const statWeek    = document.getElementById('statWeek');
  const statStreak  = document.getElementById('statStreak');
  const statBest    = document.getElementById('statBestStreak');
  const statTotal   = document.getElementById('statTotal');
  const timelineBtn = document.getElementById('timelineBtn');
  const mergeBtn    = document.getElementById('mergeBtn');
  const searchInput = document.getElementById('searchInput');
  // 1) Fill from storage if popup was opened AFTER voice
  chrome.storage.local.get(['voiceText'], (res) => {
    if (res.voiceText) {
      noteInput.value = res.voiceText;
      generateSmartTags();
      chrome.storage.local.remove('voiceText');
    }
  });

  // 2) Listen for live messages from voice.html (when popup is already open)
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'VOICE_TEXT') {
      noteInput.value = msg.text || '';
      generateSmartTags();
      sendResponse({ ok: true });
    } else if (msg.type === 'NOTE_UPDATED' || msg.type === 'NOTE_DELETED') {
      loadNotes();
      sendResponse({ ok: true });
    }
  });

  loadNotes(); // also builds tag filters

  saveBtn.onclick  = saveNote;
  clearBtn.onclick = () => noteInput.value = '';
  noteInput.oninput = generateSmartTags;

  statsBtn.onclick = () => {
    statsPanel.classList.toggle('hidden');
  };

  timelineBtn.onclick = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('timeline.html'),
      type: 'popup',
      width: 420,
      height: 420
    });
  };

  mergeBtn.onclick = handleMergeClicked;

  // 3) Open voice window as small popup
  voiceBtn.disabled = false;
  voiceBtn.title = 'Click to open voice input';
  voiceBtn.onclick = () => {
    chrome.windows.create({
      url: chrome.runtime.getURL('voice.html'),
      type: 'popup',
      width: 420,
      height: 380
    });
  };
  
  searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentTagFilter = null;  // Clear tag filter when searching
    loadNotes();
  };

  // Clear search when clicking away
  searchInput.onblur = () => {
    if (!searchQuery) loadNotes();
  };

  function computeStats(allNotes) {
    const todayKey = formatDateKey(new Date());

    let todayCount = 0;
    let weekCount = 0;
    const dateSet = new Set();

    allNotes.forEach(note => {
      const key = note.createdDate || formatDateKey(new Date(note.timestamp || Date.now()));
      dateSet.add(key);

      if (key === todayKey) todayCount++;

      const diffDays = Math.floor((new Date(todayKey) - new Date(key)) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) weekCount++;
    });

    const dates = Array.from(dateSet).sort(); // ascending
    let currentStreak = 0;
    let bestStreak = 0;

    let dayCursor = new Date(todayKey);
    while (true) {
      const key = formatDateKey(dayCursor);
      if (dateSet.has(key)) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
        dayCursor.setDate(dayCursor.getDate() - 1);
      } else {
        break;
      }
    }

    let tempStreak = 0;
    let prevDate = null;
    dates.forEach(key => {
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const d1 = new Date(prevDate);
        const d2 = new Date(key);
        const diff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
        if (diff === 1) tempStreak++; else tempStreak = 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      prevDate = key;
    });

    stats = {
      today: todayCount,
      week: weekCount,
      streak: currentStreak,
      bestStreak,
      total: allNotes.length
    };

    statToday.textContent  = stats.today;
    statWeek.textContent   = stats.week;
    statStreak.textContent = stats.streak;
    statBest.textContent   = stats.bestStreak;
    statTotal.textContent  = stats.total;

    statsBtn.title = `Streak: ${stats.streak} days`;
  }

  function toggleTaskInNote(noteId, checkboxElement) {
    const label = checkboxElement.getAttribute('data-label') || '';
    chrome.storage.sync.get(['notes'], (res) => {
      const allNotes = res.notes || [];
      const idx = allNotes.findIndex(n => n.id === noteId);
      if (idx === -1) return;

      const original = allNotes[idx].text || '';
      const lines = original.split('\n');

      const isChecked = checkboxElement.checked;

      const updatedLines = lines.map(line => {
        const match = line.match(/^-\s\[( |x)\]\s+(.*)$/i);
        if (!match) return line;
        const currentLabel = match[2];
        if (currentLabel === label) {
          return `- [${isChecked ? 'x' : ' '}] ${currentLabel}`;
        }
        return line;
      });

      allNotes[idx].text = updatedLines.join('\n');

      chrome.storage.sync.set({ notes: allNotes }, () => {
        loadNotes();
      });
    });
  }

  // Merge selected notes into one
  function handleMergeClicked() {
    if (selectedNoteIds.size < 2) return;

    chrome.storage.sync.get(['notes'], (res) => {
      const allNotes = res.notes || [];
      const selected = allNotes.filter(n => selectedNoteIds.has(n.id));
      if (selected.length < 2) return;

      const base = selected[0];
      const pageTitle = base.pageTitle || 'Merged note';
      const pageUrl   = base.pageUrl || '';

      const combinedText = selected
        .map(n => (n.text || '').trim())
        .filter(t => t)
        .join('\n\n---\n\n');

      const tagSet = new Set();
      selected.forEach(n => {
        const txt = n.text || '';
        const matches = txt.match(/#\w+/g);
        if (matches) matches.forEach(t => tagSet.add(t));
      });
      const mergedTags = Array.from(tagSet).join(' ');

      const now = new Date();
      const mergedNote = {
        id: Date.now(),
        text: combinedText,
        tags: mergedTags,
        timestamp: now.toLocaleString(),
        createdDate: formatDateKey(now),
        pageTitle,
        pageUrl
      };

      const remaining = allNotes.filter(n => !selectedNoteIds.has(n.id));
      remaining.unshift(mergedNote);

      chrome.storage.sync.set({ notes: remaining }, () => {
        selectedNoteIds.clear();
        loadNotes();
      });
    });
  }
  
  // ---------- functions ----------

  function saveNote() {
    if (!noteInput.value.trim()) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0] ? tabs[0] : {};
      const pageTitle = tab.title || 'Untitled page';
      const pageUrl   = tab.url   || '';

      const note = {
        id: Date.now(),
        text: noteInput.value,
        tags: autoTags.textContent || '',
        timestamp: new Date().toLocaleString(),
        createdDate: formatDateKey(new Date()),
        pageTitle,
        pageUrl
      };

      chrome.storage.sync.get(['notes'], (result) => {
        const notes = result.notes || [];
        notes.unshift(note);
        if (notes.length > 50) notes.pop();

        chrome.storage.sync.set({ notes }, () => {
          noteInput.value = '';
          tagsSection.classList.add('hidden');
          loadNotes();
        });
      });
    });
  }

  function generateSmartTags() {
    const text = noteInput.value.toLowerCase();
    const tags = [];

    if (text.includes('code') || text.includes('bug') || text.includes('fix')) tags.push('💻 Code');
    if (text.includes('idea') || text.includes('feature')) tags.push('💡 Idea');
    if (text.includes('learn') || text.includes('tutorial')) tags.push('📚 Learn');
    if (text.includes('project') || text.includes('task')) tags.push('🚀 Task');

    if (tags.length) {
      autoTags.textContent = tags.join(' ');
      tagsSection.classList.remove('hidden');
    } else {
      tagsSection.classList.add('hidden');
    }
  }

  function buildTagFilters(notes) {
    const tagSet = new Set();

    notes.forEach(note => {
      const text = note.text || '';
      const matches = text.match(/#\w+/g);
      if (matches) {
        matches.forEach(tag => tagSet.add(tag));
      }
    });

    const tags = Array.from(tagSet).sort();

    if (!tags.length) {
      tagFilters.innerHTML = '';
      tagFilters.classList.add('hidden');
      currentTagFilter = null;
      return;
    }

    tagFilters.classList.remove('hidden');
    tagFilters.innerHTML = '';

    tags.forEach(tag => {
      const pill = document.createElement('div');
      pill.className = 'tag-pill';
      pill.textContent = tag;

      const colors = getColorForTag(tag);
      pill.style.background = colors.bg;
      pill.style.color = colors.fg;
      pill.style.borderColor = colors.bg;

      if (currentTagFilter === tag) {
        pill.classList.add('active');
      }

      pill.onclick = () => {
        if (currentTagFilter === tag) {
          currentTagFilter = null;
        } else {
          currentTagFilter = tag;
        }
        loadNotes();
      };

      tagFilters.appendChild(pill);
    });
  }

  function loadNotes() {
    chrome.storage.sync.get(['notes'], (result) => {
      const allNotes = result.notes || [];
      computeStats(allNotes);
      buildTagFilters(allNotes);

      if (!allNotes.length) {
        notesList.innerHTML = '';
        notesList.classList.add('hidden');
        return;
      }

      notesList.classList.remove('hidden');
      notesList.innerHTML = '';

      let notes = currentTagFilter
        ? allNotes.filter(n => (n.text || '').includes(currentTagFilter))
        : allNotes;

      // SEARCH FILTERING 
      if (searchQuery) {
        notes = notes.filter(note => {
          const text = (note.text || '').toLowerCase();
          return text.includes(searchQuery) || 
                (note.pageTitle || '').toLowerCase().includes(searchQuery) ||
                (note.tags || '').toLowerCase().includes(searchQuery);
        });
        // Show ALL search results (not just top 20)
        notes = notes.slice(0, 30);
      } else {
        notes = notes.slice(0, 20);
      }

      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item';
        if (selectedNoteIds.has(note.id)) {
          item.classList.add('selected');
        }

        // Single-click: toggle selection for merge
        item.onclick = () => {
          if (selectedNoteIds.has(note.id)) {
            selectedNoteIds.delete(note.id);
            item.classList.remove('selected');
          } else {
            selectedNoteIds.add(note.id);
            item.classList.add('selected');
          }
        };

        // Double-click: open detail editor window
        item.ondblclick = (e) => {
          e.stopPropagation();
          chrome.windows.create({
            url: chrome.runtime.getURL(`note.html?noteId=${note.id}`),
            type: 'popup',
            width: 420,
            height: 380
          });
        };

        const textDiv = document.createElement('div');
        textDiv.className = 'note-text';
        textDiv.innerHTML = renderMarkdownLite(note.text);

        if (note.pageTitle) {
          const originDiv = document.createElement('div');
          originDiv.className = 'note-origin';
          originDiv.textContent = note.pageTitle;
          originDiv.title = note.pageUrl || '';
          originDiv.onclick = (e) => {
            e.stopPropagation();
            if (note.pageUrl) chrome.tabs.create({ url: note.pageUrl });
          };
          item.appendChild(originDiv);
        }

        const metaDiv = document.createElement('div');
        metaDiv.className = 'note-meta';
        metaDiv.textContent = note.timestamp;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Delete note';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteNote(note.id);
        };

        item.appendChild(deleteBtn);
        item.appendChild(textDiv);
        item.appendChild(metaDiv);
        notesList.appendChild(item);
      });

      // Attach click handlers to checklist checkboxes after items are in the DOM
      const checkboxes = notesList.querySelectorAll('.task-checkbox');
      checkboxes.forEach(cb => {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemEl = e.target.closest('.note-item');
          if (!itemEl) return;
          const index = Array.from(notesList.children).indexOf(itemEl);
          if (index === -1) return;
          const targetNote = notes[index];
          if (!targetNote) return;
          toggleTaskInNote(targetNote.id, e.target);
        });
      });
    });
  }


  function deleteNote(id) {
    chrome.storage.sync.get(['notes'], (result) => {
      const notes = (result.notes || []).filter(n => n.id !== id);
      chrome.storage.sync.set({ notes }, () => {
        loadNotes();
      });
    });
  }
});
