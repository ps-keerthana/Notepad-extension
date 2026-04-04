// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// Markdown-lite renderer: **bold**, *italic*, `code`, blockquote, checklist
function renderMarkdownLite(text) {
  if (!text) return '';
  let safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  safe = safe.replace(/^>\s+(.*)$/gm, '<blockquote>$1</blockquote>');
  safe = safe.replace(/>/g, '&gt;');
  safe = safe.replace(
    /^-\s\[( |x)\]\s+(.*)$/gim,
    (_, checked, label) =>
      `<div class="task-line"><input type="checkbox" class="task-checkbox" ${checked === 'x' ? 'checked' : ''} data-label="${label.replace(/"/g, '&quot;')}" /> <span>${label}</span></div>`
  );
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  safe = safe.replace(/\n/g, '<br>');
  return safe;
}

function getColorForTag(tag) {
  const palette = [
    { bg: '#fee2e2', fg: '#b91c1c' },
    { bg: '#ffedd5', fg: '#c05621' },
    { bg: '#fef3c7', fg: '#92400e' },
    { bg: '#dcfce7', fg: '#166534' },
    { bg: '#e0f2fe', fg: '#075985' },
    { bg: '#e0e7ff', fg: '#3730a3' },
    { bg: '#fce7f3', fg: '#9d174d' }
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

// Category metadata
const CATEGORIES = {
  work:     { label: '💼 Work',     color: '#3b82f6' },
  personal: { label: '🏠 Personal', color: '#10b981' },
  research: { label: '🔬 Research', color: '#8b5cf6' },
  ideas:    { label: '💡 Ideas',    color: '#f59e0b' },
};

// ─── State ────────────────────────────────────────────────────────────────────

let currentTagFilter      = null;
let currentCategoryFilter = null;
let selectedNoteIds       = new Set();
let searchQuery           = '';

let stats = { today: 0, week: 0, streak: 0, bestStreak: 0, total: 0 };

// Pomodoro
let pomodoroTime     = 25 * 60;
let pomodoroInterval = null;
let sessionNotes     = 0;
let sessionStart     = null;

// Undo: holds the note object briefly after deletion
let undoBuffer     = null;
let undoTimeout    = null;

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {

  // Element refs
  const noteInput       = document.getElementById('noteInput');
  const saveBtn         = document.getElementById('saveBtn');
  const clearBtn        = document.getElementById('clearBtn');
  const voiceBtn        = document.getElementById('voiceBtn');
  const tagsSection     = document.getElementById('tagsSection');
  const autoTags        = document.getElementById('autoTags');
  const notesList       = document.getElementById('notesList');
  const tagFilters      = document.getElementById('tagFilters');
  const categoryFilters = document.getElementById('categoryFilters');
  const categorySelect  = document.getElementById('categorySelect');

  const statsBtn    = document.getElementById('statsBtn');
  const statsPanel  = document.getElementById('statsPanel');
  const statToday   = document.getElementById('statToday');
  const statWeek    = document.getElementById('statWeek');
  const statStreak  = document.getElementById('statStreak');
  const statBest    = document.getElementById('statBestStreak');
  const statTotal   = document.getElementById('statTotal');

  const timelineBtn   = document.getElementById('timelineBtn');
  const mergeBtn      = document.getElementById('mergeBtn');
  const searchInput   = document.getElementById('searchInput');
  const darkModeBtn   = document.getElementById('darkModeBtn');

  const pomodoroBtn   = document.getElementById('pomodoroBtn');
  const pomodoroPanel = document.getElementById('pomodoroPanel');
  const pomoTimer     = document.getElementById('pomoTimer');
  const pomoStart     = document.getElementById('pomoStart');
  const pomoStop      = document.getElementById('pomoStop');
  const pomoSkip      = document.getElementById('pomoSkip');
  const pomoNotes     = document.getElementById('pomoNotes');
  const pomoScore     = document.getElementById('pomoScore');

  const undoToast = document.getElementById('undoToast');
  const undoBtn   = document.getElementById('undoBtn');

  // ── Dark mode ─────────────────────────────────────────────────────────────

  // Restore saved preference, else respect system
  chrome.storage.local.get(['darkMode'], (res) => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = res.darkMode !== undefined ? res.darkMode : prefersDark;
    applyDarkMode(isDark);
  });

  function applyDarkMode(on) {
    document.body.classList.toggle('dark-mode', on);
    darkModeBtn.textContent = on ? '☀️' : '🌙';
  }

  darkModeBtn.onclick = () => {
    const isDark = document.body.classList.toggle('dark-mode');
    darkModeBtn.textContent = isDark ? '☀️' : '🌙';
    chrome.storage.local.set({ darkMode: isDark });
  };

  // ── Voice text handoff ─────────────────────────────────────────────────────

  chrome.storage.local.get(['voiceText'], (res) => {
    if (res.voiceText) {
      noteInput.value = res.voiceText;
      generateSmartTags();
      chrome.storage.local.remove('voiceText');
    }
  });

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

  // ── Keyboard shortcut: Ctrl+Enter to save ─────────────────────────────────
  noteInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveNote();
    }
  });

  // ── Initial load ──────────────────────────────────────────────────────────

  loadNotes();

  saveBtn.onclick  = saveNote;
  clearBtn.onclick = () => { noteInput.value = ''; tagsSection.classList.add('hidden'); };
  noteInput.oninput = generateSmartTags;

  statsBtn.onclick = () => statsPanel.classList.toggle('hidden');

  timelineBtn.onclick = () => {
    chrome.windows.create({ url: chrome.runtime.getURL('timeline.html'), type: 'popup', width: 420, height: 420 });
  };

  mergeBtn.onclick = handleMergeClicked;

  voiceBtn.onclick = () => {
    chrome.windows.create({ url: chrome.runtime.getURL('voice.html'), type: 'popup', width: 420, height: 380 });
  };

  searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentTagFilter = null;
    currentCategoryFilter = null;
    loadNotes();
  };

  // ── Undo toast ────────────────────────────────────────────────────────────

  undoBtn.onclick = () => {
    if (!undoBuffer) return;
    clearTimeout(undoTimeout);
    // Restore the deleted note
    chrome.storage.local.get(['notes'], (res) => {
      const notes = res.notes || [];
      // Re-insert at original position (front is fine)
      notes.unshift(undoBuffer);
      chrome.storage.local.set({ notes }, () => {
        undoBuffer = null;
        hideUndoToast();
        loadNotes();
      });
    });
  };

  function showUndoToast() {
    undoToast.classList.remove('hidden');
    clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
      undoBuffer = null;
      hideUndoToast();
    }, 5000); // 5 seconds to undo
  }

  function hideUndoToast() {
    undoToast.classList.add('hidden');
  }

  // ── Pomodoro ──────────────────────────────────────────────────────────────

  pomodoroBtn.onclick = () => {
    pomodoroPanel.classList.toggle('hidden');
    if (!pomodoroPanel.classList.contains('hidden')) updatePomoDisplay();
  };

  pomoStart.onclick = startPomodoro;
  pomoStop.onclick  = stopPomodoro;
  pomoSkip.onclick  = skipPomodoro;

  function startPomodoro() {
    sessionStart = Date.now();
    sessionNotes = 0;
    pomodoroTime = 25 * 60;
    document.body.classList.add('focus-mode');
    pomodoroBtn.classList.add('focus-active');
    pomodoroPanel.classList.remove('hidden');
    updatePomoDisplay();
    startTimer();
  }

  function stopPomodoro() {
    stopTimer();
    document.body.classList.remove('focus-mode');
    pomodoroBtn.classList.remove('focus-active');
  }

  function skipPomodoro() {
    stopTimer();
    pomodoroTime = 0;
    updatePomoDisplay();
    document.body.classList.remove('focus-mode');
    pomodoroBtn.classList.remove('focus-active');
  }

  function startTimer() {
    if (pomodoroInterval) clearInterval(pomodoroInterval);
    pomodoroInterval = setInterval(() => {
      pomodoroTime--;
      updatePomoDisplay();
      if (pomodoroTime <= 0) { stopTimer(); saveSessionSummary(); }
    }, 1000);
  }

  function stopTimer() {
    if (pomodoroInterval) { clearInterval(pomodoroInterval); pomodoroInterval = null; }
  }

  function updatePomoDisplay() {
    const m = Math.floor(pomodoroTime / 60);
    const s = pomodoroTime % 60;
    pomoTimer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    const elapsed = sessionStart ? (Date.now() - sessionStart) / 1000 : 0;
    const score = sessionNotes > 0 ? Math.round((sessionNotes * 5 / Math.max(elapsed / 60, 1)) * 100) : 0;
    pomoNotes.textContent = `${sessionNotes} notes`;
    pomoScore.textContent = `Score: ${score}%`;
  }

  function saveSessionSummary() {
    if (!sessionStart || sessionNotes === 0) return;
    const sessionTime = Math.round((Date.now() - sessionStart) / 1000 / 60);
    const summary = `#focus\n\n${sessionNotes} notes in ${sessionTime}min\nScore: ${pomoScore.textContent}`;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const note = {
        id: Date.now(),
        text: summary,
        tags: '🍅 Focus Session',
        category: '',
        pinned: false,
        timestamp: new Date().toLocaleString(),
        createdDate: formatDateKey(),
        pageTitle: tabs[0]?.title || 'Focus Session',
        pageUrl: tabs[0]?.url || ''
      };
      chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        notes.unshift(note);
        chrome.storage.local.set({ notes });
      });
    });
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  function computeStats(allNotes) {
    const todayKey = formatDateKey();
    let todayCount = 0, weekCount = 0;
    const dateSet = new Set();

    allNotes.forEach(note => {
      const key = note.createdDate || formatDateKey(new Date(note.timestamp || Date.now()));
      dateSet.add(key);
      if (key === todayKey) todayCount++;
      const diffDays = Math.floor((new Date(todayKey) - new Date(key)) / 86400000);
      if (diffDays >= 0 && diffDays < 7) weekCount++;
    });

    let currentStreak = 0, bestStreak = 0;
    let dayCursor = new Date(todayKey);
    while (true) {
      const key = formatDateKey(dayCursor);
      if (dateSet.has(key)) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
        dayCursor.setDate(dayCursor.getDate() - 1);
      } else break;
    }

    const dates = Array.from(dateSet).sort();
    let tempStreak = 0, prevDate = null;
    dates.forEach(key => {
      if (!prevDate) { tempStreak = 1; }
      else {
        const diff = Math.floor((new Date(key) - new Date(prevDate)) / 86400000);
        tempStreak = diff === 1 ? tempStreak + 1 : 1;
      }
      bestStreak = Math.max(bestStreak, tempStreak);
      prevDate = key;
    });

    stats = { today: todayCount, week: weekCount, streak: currentStreak, bestStreak, total: allNotes.length };
    statToday.textContent  = stats.today;
    statWeek.textContent   = stats.week;
    statStreak.textContent = stats.streak;
    statBest.textContent   = stats.bestStreak;
    statTotal.textContent  = stats.total;
    statsBtn.title = `Streak: ${stats.streak} days`;
  }

  // ── Checklist toggle ──────────────────────────────────────────────────────

  function toggleTaskInNote(noteId, checkboxElement) {
    const label = checkboxElement.getAttribute('data-label') || '';
    const isChecked = checkboxElement.checked;
    chrome.storage.local.get(['notes'], (res) => {
      const allNotes = res.notes || [];
      const idx = allNotes.findIndex(n => n.id === noteId);
      if (idx === -1) return;
      const lines = (allNotes[idx].text || '').split('\n');
      allNotes[idx].text = lines.map(line => {
        const match = line.match(/^-\s\[( |x)\]\s+(.*)$/i);
        if (!match || match[2] !== label) return line;
        return `- [${isChecked ? 'x' : ' '}] ${match[2]}`;
      }).join('\n');
      chrome.storage.local.set({ notes: allNotes }, loadNotes);
    });
  }

  // ── Merge ─────────────────────────────────────────────────────────────────

  function handleMergeClicked() {
    if (selectedNoteIds.size < 2) return;
    chrome.storage.local.get(['notes'], (res) => {
      const allNotes = res.notes || [];
      const selected = allNotes.filter(n => selectedNoteIds.has(n.id));
      if (selected.length < 2) return;
      const base = selected[0];
      const combinedText = selected.map(n => (n.text || '').trim()).filter(Boolean).join('\n\n---\n\n');
      const tagSet = new Set();
      selected.forEach(n => { (n.text || '').match(/#\w+/g)?.forEach(t => tagSet.add(t)); });
      const now = new Date();
      const mergedNote = {
        id: Date.now(),
        text: combinedText,
        tags: Array.from(tagSet).join(' '),
        category: base.category || '',
        pinned: false,
        timestamp: now.toLocaleString(),
        createdDate: formatDateKey(now),
        pageTitle: base.pageTitle || 'Merged note',
        pageUrl: base.pageUrl || ''
      };
      const remaining = allNotes.filter(n => !selectedNoteIds.has(n.id));
      remaining.unshift(mergedNote);
      chrome.storage.local.set({ notes: remaining }, () => {
        selectedNoteIds.clear();
        loadNotes();
      });
    });
  }

  // ── Save note ─────────────────────────────────────────────────────────────

  function saveNote() {
    if (!noteInput.value.trim()) return;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs && tabs[0] ? tabs[0] : {};
      const text = noteInput.value + (document.body.classList.contains('focus-mode') ? '\n\n#focus' : '');
      const note = {
        id: Date.now(),
        text,
        tags: autoTags.textContent || '',
        category: categorySelect.value || '',
        pinned: false,
        timestamp: new Date().toLocaleString(),
        createdDate: formatDateKey(),
        pageTitle: tab.title || 'Untitled page',
        pageUrl:   tab.url   || ''
      };
      chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        notes.unshift(note);
        chrome.storage.local.set({ notes }, () => {
          noteInput.value = '';
          tagsSection.classList.add('hidden');
          categorySelect.value = '';
          loadNotes();
          if (document.body.classList.contains('focus-mode')) {
            sessionNotes++;
            updatePomoDisplay();
          }
        });
      });
    });
  }

  // ── Smart tags ────────────────────────────────────────────────────────────

  function generateSmartTags() {
    const text = noteInput.value.toLowerCase();
    const tags = [];
    if (text.includes('code') || text.includes('bug') || text.includes('fix')) tags.push('💻 Code');
    if (text.includes('idea') || text.includes('feature'))                     tags.push('💡 Idea');
    if (text.includes('learn') || text.includes('tutorial'))                   tags.push('📚 Learn');
    if (text.includes('project') || text.includes('task'))                     tags.push('🚀 Task');
    if (tags.length) {
      autoTags.textContent = tags.join(' ');
      tagsSection.classList.remove('hidden');
    } else {
      tagsSection.classList.add('hidden');
    }
  }

  // ── Build category filter pills ───────────────────────────────────────────

  function buildCategoryFilters(notes) {
    const usedCats = new Set(notes.map(n => n.category).filter(Boolean));
    if (!usedCats.size) {
      categoryFilters.innerHTML = '';
      categoryFilters.classList.add('hidden');
      return;
    }
    categoryFilters.classList.remove('hidden');
    categoryFilters.innerHTML = '';

    usedCats.forEach(cat => {
      const meta = CATEGORIES[cat];
      if (!meta) return;
      const pill = document.createElement('div');
      pill.className = 'cat-pill' + (currentCategoryFilter === cat ? ' active' : '');
      pill.textContent = meta.label;
      pill.onclick = () => {
        currentCategoryFilter = currentCategoryFilter === cat ? null : cat;
        loadNotes();
      };
      categoryFilters.appendChild(pill);
    });
  }

  // ── Build tag filter pills ────────────────────────────────────────────────

  function buildTagFilters(notes) {
    const tagSet = new Set();
    notes.forEach(note => {
      (note.text || '').match(/#\w+/g)?.forEach(tag => tagSet.add(tag));
    });
    const tags = Array.from(tagSet).sort();
    if (!tags.length) {
      tagFilters.innerHTML = '';
      tagFilters.classList.add('hidden');
      return;
    }
    tagFilters.classList.remove('hidden');
    tagFilters.innerHTML = '';
    tags.forEach(tag => {
      const pill = document.createElement('div');
      pill.className = 'tag-pill' + (currentTagFilter === tag ? ' active' : '');
      pill.textContent = tag;
      const colors = getColorForTag(tag);
      pill.style.background  = colors.bg;
      pill.style.color       = colors.fg;
      pill.style.borderColor = colors.bg;
      if (currentTagFilter === tag) pill.classList.add('active');
      pill.onclick = () => {
        currentTagFilter = currentTagFilter === tag ? null : tag;
        loadNotes();
      };
      tagFilters.appendChild(pill);
    });
  }

  // ── Load & render notes ───────────────────────────────────────────────────

  function loadNotes() {
    chrome.storage.local.get(['notes'], (result) => {
      const allNotes = result.notes || [];
      computeStats(allNotes);
      buildCategoryFilters(allNotes);
      buildTagFilters(allNotes);

      if (!allNotes.length) {
        notesList.innerHTML = '';
        notesList.classList.add('hidden');
        return;
      }

      notesList.classList.remove('hidden');
      notesList.innerHTML = '';

      // Filter by category
      let notes = currentCategoryFilter
        ? allNotes.filter(n => n.category === currentCategoryFilter)
        : allNotes;

      // Filter by hashtag
      if (currentTagFilter) {
        notes = notes.filter(n => (n.text || '').includes(currentTagFilter));
      }

      // Filter by search
      if (searchQuery) {
        notes = notes.filter(note =>
          (note.text || '').toLowerCase().includes(searchQuery) ||
          (note.pageTitle || '').toLowerCase().includes(searchQuery) ||
          (note.tags || '').toLowerCase().includes(searchQuery)
        );
      }

      // Sort: pinned first, then by id descending (newest first)
      notes = [...notes].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned)  return 1;
        return b.id - a.id;
      });

      notes = notes.slice(0, searchQuery ? 30 : 20);

      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'note-item' +
          (selectedNoteIds.has(note.id) ? ' selected' : '') +
          (note.pinned ? ' pinned' : '');

        // Single-click: toggle merge selection
        item.onclick = () => {
          if (selectedNoteIds.has(note.id)) {
            selectedNoteIds.delete(note.id);
            item.classList.remove('selected');
          } else {
            selectedNoteIds.add(note.id);
            item.classList.add('selected');
          }
        };

        // Double-click: open detail editor
        item.ondblclick = (e) => {
          e.stopPropagation();
          chrome.windows.create({
            url: chrome.runtime.getURL(`note.html?noteId=${note.id}`),
            type: 'popup', width: 420, height: 380
          });
        };

        // Category badge
        if (note.category && CATEGORIES[note.category]) {
          const badge = document.createElement('div');
          badge.className = 'note-category-badge';
          badge.textContent = CATEGORIES[note.category].label;
          item.appendChild(badge);
        }

        // Origin
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

        // Text
        const textDiv = document.createElement('div');
        textDiv.className = 'note-text';
        textDiv.innerHTML = renderMarkdownLite(note.text);
        item.appendChild(textDiv);

        // Meta
        const metaDiv = document.createElement('div');
        metaDiv.className = 'note-meta';
        metaDiv.textContent = note.timestamp;
        item.appendChild(metaDiv);

        // Pin button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'note-pin';
        pinBtn.title = note.pinned ? 'Unpin note' : 'Pin to top';
        pinBtn.textContent = '📌';
        pinBtn.onclick = (e) => {
          e.stopPropagation();
          togglePin(note.id);
        };
        item.appendChild(pinBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-delete';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Delete note';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteNote(note.id, note);
        };
        item.appendChild(deleteBtn);

        notesList.appendChild(item);
      });

      // Checkbox handlers — use note.id, not DOM index (bug fix)
      notesList.querySelectorAll('.task-checkbox').forEach(cb => {
        cb.addEventListener('click', (e) => {
          e.stopPropagation();
          const itemEl = e.target.closest('.note-item');
          if (!itemEl) return;
          const idx = Array.from(notesList.children).indexOf(itemEl);
          const targetNote = notes[idx];
          if (!targetNote) return;
          toggleTaskInNote(targetNote.id, e.target);
        });
      });
    });
  }

  // ── Pin toggle ────────────────────────────────────────────────────────────

  function togglePin(id) {
    chrome.storage.local.get(['notes'], (res) => {
      const notes = res.notes || [];
      const idx = notes.findIndex(n => n.id === id);
      if (idx === -1) return;
      notes[idx].pinned = !notes[idx].pinned;
      chrome.storage.local.set({ notes }, loadNotes);
    });
  }

  // ── Delete with undo ──────────────────────────────────────────────────────

  function deleteNote(id, noteObj) {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = (result.notes || []).filter(n => n.id !== id);
      undoBuffer = noteObj; // save for potential undo
      chrome.storage.local.set({ notes }, () => {
        loadNotes();
        showUndoToast();
      });
    });
  }
});
