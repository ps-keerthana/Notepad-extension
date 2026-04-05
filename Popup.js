// ─── Shared helpers ───────────────────────────────────────────────────────────

function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

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
  safe = safe.replace(/^##\s+(.*)$/gm, '<strong style="font-size:1.05em">$1</strong>');
  safe = safe.replace(/^#\s+(.*)$/gm,  '<strong style="font-size:1.15em;letter-spacing:-0.01em">$1</strong>');
  safe = safe.replace(/~~([^~]+)~~/g, '<s>$1</s>');
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

// Tab group color → CSS color mapping
// Chrome tab group colors are named strings
const TAB_GROUP_COLORS = {
  grey:   { bg: 'rgba(128,128,128,0.18)', border: '#888', dot: '#888' },
  blue:   { bg: 'rgba(26,115,232,0.15)',  border: '#1a73e8', dot: '#1a73e8' },
  red:    { bg: 'rgba(217,48,37,0.15)',   border: '#d93025', dot: '#d93025' },
  yellow: { bg: 'rgba(249,171,0,0.15)',   border: '#f9ab00', dot: '#f9ab00' },
  green:  { bg: 'rgba(30,142,62,0.15)',   border: '#1e8e3e', dot: '#1e8e3e' },
  pink:   { bg: 'rgba(240,98,146,0.15)',  border: '#f06292', dot: '#f06292' },
  purple: { bg: 'rgba(120,86,255,0.15)',  border: '#7856ff', dot: '#7856ff' },
  cyan:   { bg: 'rgba(0,186,201,0.15)',   border: '#00bac9', dot: '#00bac9' },
  orange: { bg: 'rgba(230,81,0,0.15)',    border: '#e65100', dot: '#e65100' },
};

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
let renderedNotes         = []; // track currently visible notes for keyboard nav

// Keyboard navigation state
let focusedNoteIndex = -1; // -1 = no note focused

let stats = { today: 0, week: 0, streak: 0, bestStreak: 0, total: 0 };

// Reminder panel state
let remindPanelOpen = false;

// Undo
let undoBuffer  = null;
let undoTimeout = null;

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {

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
  const statsBtn        = document.getElementById('statsBtn');
  const statsPanel      = document.getElementById('statsPanel');
  const statToday       = document.getElementById('statToday');
  const statWeek        = document.getElementById('statWeek');
  const statStreak      = document.getElementById('statStreak');
  const statBest        = document.getElementById('statBestStreak');
  const statTotal       = document.getElementById('statTotal');
  const timelineBtn     = document.getElementById('timelineBtn');
  const mergeBtn        = document.getElementById('mergeBtn');
  const searchInput     = document.getElementById('searchInput');
  const darkModeBtn     = document.getElementById('darkModeBtn');
  const navHint         = document.getElementById('navHint');
  const remindBtn       = document.getElementById('remindBtn');
  const remindPanel     = document.getElementById('remindPanel');
  const remindNoteSelect = document.getElementById('remindNoteSelect');
  const remindTime      = document.getElementById('remindTime');
  const remindSaveBtn   = document.getElementById('remindSaveBtn');
  const remindCloseBtn  = document.getElementById('remindCloseBtn');
  const remindList      = document.getElementById('remindList');
  const undoToast       = document.getElementById('undoToast');
  const undoBtn         = document.getElementById('undoBtn');
  const mergeBar        = document.getElementById('mergeBar');
  const mergeBarLabel   = document.getElementById('mergeBarLabel');
  const mergeConfirmBtn = document.getElementById('mergeConfirmBtn');
  const mergeClearBtn   = document.getElementById('mergeClearBtn');
  const mergeBadge      = document.getElementById('mergeBadge');

  // ── Theme ─────────────────────────────────────────────────────────────────

  chrome.storage.local.get(['lightMode'], (res) => {
    applyTheme(res.lightMode === true);
  });

  function applyTheme(isLight) {
    document.body.classList.toggle('light-mode', isLight);
    darkModeBtn.textContent = isLight ? '🌙' : '☀️';
  }

  darkModeBtn.onclick = () => {
    const isLight = document.body.classList.toggle('light-mode');
    darkModeBtn.textContent = isLight ? '🌙' : '☀️';
    chrome.storage.local.set({ lightMode: isLight });
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

  // ── Ctrl+Enter to save ────────────────────────────────────────────────────

  noteInput.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveNote();
    }
  });

  // ── Initial load ──────────────────────────────────────────────────────────

  loadNotes();

  // ── Header quick-filter pills ─────────────────────────────────────────────

  document.querySelectorAll('.mode-pill[data-cat]').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategoryFilter = pill.dataset.cat;
      focusedNoteIndex = -1;
      loadNotes();
    };
  });

  const catAllBtn = document.getElementById('catAllBtn');
  if (catAllBtn) {
    catAllBtn.onclick = () => {
      document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
      catAllBtn.classList.add('active');
      currentCategoryFilter = null;
      focusedNoteIndex = -1;
      loadNotes();
    };
  }

  saveBtn.onclick   = saveNote;
  clearBtn.onclick  = () => { noteInput.value = ''; tagsSection.classList.add('hidden'); };
  noteInput.oninput = generateSmartTags;
  statsBtn.onclick  = () => statsPanel.classList.toggle('hidden');

  timelineBtn.onclick = () => {
    const t = document.body.classList.contains('light-mode') ? '?theme=light' : '';
    chrome.windows.create({ url: chrome.runtime.getURL('timeline.html') + t, type: 'popup', width: 440, height: 440 });
  };

  mergeBtn.onclick = handleMergeClicked;
  mergeConfirmBtn.onclick = handleMergeClicked;
  mergeClearBtn.onclick   = clearMergeSelection;

  voiceBtn.onclick = () => {
    const t = document.body.classList.contains('light-mode') ? '?theme=light' : '';
    chrome.windows.create({ url: chrome.runtime.getURL('voice.html') + t, type: 'popup', width: 420, height: 340 });
  };

  searchInput.oninput = (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentTagFilter = null;
    currentCategoryFilter = null;
    focusedNoteIndex = -1;
    loadNotes();
  };

  // ── KEYBOARD NAVIGATION ───────────────────────────────────────────────────
  // Arrow keys navigate, Enter opens detail, Delete removes the focused note.
  // Navigation is active when noteInput is NOT focused.

  document.addEventListener('keydown', (e) => {
    // Don't intercept if typing in input/textarea
    const active = document.activeElement;
    const isTyping = active === noteInput || active === searchInput || active.tagName === 'TEXTAREA' || active.tagName === 'INPUT';

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Allow arrow keys even when search is focused — move focus to notes list
      e.preventDefault();
      const items = notesList.querySelectorAll('.note-item');
      if (!items.length) return;

      // Remove focus from search input so visual focus goes to list
      if (active === searchInput) searchInput.blur();

      if (e.key === 'ArrowDown') {
        focusedNoteIndex = Math.min(focusedNoteIndex + 1, items.length - 1);
      } else {
        focusedNoteIndex = Math.max(focusedNoteIndex - 1, 0);
      }

      updateNoteFocus(items);
      return;
    }

    // Keys below only fire when a note is focused via keyboard
    if (focusedNoteIndex < 0) return;
    if (isTyping && e.key !== 'Escape') return;

    if (e.key === 'Enter') {
      e.preventDefault();
      const note = renderedNotes[focusedNoteIndex];
      if (!note) return;
      openNoteDetail(note);
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Only fire on Backspace if not in an input
      if (e.key === 'Backspace' && isTyping) return;
      e.preventDefault();
      const note = renderedNotes[focusedNoteIndex];
      if (!note) return;
      const prevIdx = focusedNoteIndex;
      deleteNote(note.id, note);
      // After deletion, try to keep same position or move up
      focusedNoteIndex = Math.max(0, prevIdx - 1);
    }

    if (e.key === 'Escape') {
      focusedNoteIndex = -1;
      clearNoteFocus();
      noteInput.focus();
    }

    if (e.key === 'p' || e.key === 'P') {
      // P = pin/unpin focused note
      const note = renderedNotes[focusedNoteIndex];
      if (note) togglePin(note.id);
    }
  });

  function updateNoteFocus(items) {
    clearNoteFocus();
    const el = items[focusedNoteIndex];
    if (!el) return;
    el.classList.add('kb-focused');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // Show nav hint
    navHint.classList.add('visible');
  }

  function clearNoteFocus() {
    notesList.querySelectorAll('.note-item.kb-focused').forEach(el => el.classList.remove('kb-focused'));
    if (focusedNoteIndex < 0) navHint.classList.remove('visible');
  }

  function openNoteDetail(note) {
    const t = document.body.classList.contains('light-mode') ? '&theme=light' : '';
    chrome.windows.create({
      url: chrome.runtime.getURL(`note.html?noteId=${note.id}${t}`),
      type: 'popup', width: 440, height: 400
    });
  }

  // ── Undo toast ────────────────────────────────────────────────────────────

  undoBtn.onclick = () => {
    if (!undoBuffer) return;
    clearTimeout(undoTimeout);
    chrome.storage.local.get(['notes'], (res) => {
      const notes = res.notes || [];
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
    undoTimeout = setTimeout(() => { undoBuffer = null; hideUndoToast(); }, 5000);
  }

  function hideUndoToast() { undoToast.classList.add('hidden'); }

  // ── Pomodoro ──────────────────────────────────────────────────────────────

  // ── Reminders ─────────────────────────────────────────────────────────────

  remindBtn.onclick = () => {
    const isOpen = !remindPanel.classList.contains('hidden');
    remindPanel.classList.toggle('hidden', isOpen);
    if (!isOpen) {
      populateRemindSelect();
      setDefaultRemindTime();
      loadReminderList();
    }
  };
  remindCloseBtn.onclick = () => remindPanel.classList.add('hidden');

  // Fill the note selector with current notes
  function populateRemindSelect() {
    chrome.storage.local.get(['notes'], (res) => {
      const notes = (res.notes || []).slice(0, 30);
      remindNoteSelect.innerHTML = '<option value="">— pick a note —</option>' +
        notes.map(n => {
          const label = (n.text || '').replace(/\n/g, ' ').slice(0, 55);
          return `<option value="${n.id}">${label}</option>`;
        }).join('');
    });
  }

  // Default to +1 hour from now, rounded to nearest 5 min
  function setDefaultRemindTime() {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    // datetime-local format: YYYY-MM-DDTHH:MM
    const pad = n => String(n).padStart(2, '0');
    remindTime.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    remindTime.min = new Date().toISOString().slice(0,16);
  }

  remindSaveBtn.onclick = () => {
    const noteId = remindNoteSelect.value;
    const timeVal = remindTime.value;
    if (!noteId || !timeVal) {
      showToast('Pick a note and a time');
      return;
    }
    const fireAt = new Date(timeVal).getTime();
    if (fireAt <= Date.now()) {
      showToast('Pick a future time');
      return;
    }
    // Store reminder
    const remId = `snp_rem_${Date.now()}`;
    chrome.storage.local.get(['reminders', 'notes'], (res) => {
      const reminders = res.reminders || [];
      const notes = res.notes || [];
      const note = notes.find(n => n.id === Number(noteId));
      const reminder = {
        id: remId,
        noteId: Number(noteId),
        noteText: (note?.text || '').slice(0, 80),
        fireAt,
        timeLabel: new Date(fireAt).toLocaleString()
      };
      reminders.push(reminder);
      chrome.storage.local.set({ reminders }, () => {
        // Tell background to register the alarm
        chrome.runtime.sendMessage({ type: 'SET_ALARM', remId, fireAt });
        showToast('Reminder set');
        loadReminderList();
      });
    });
  };

  function loadReminderList() {
    chrome.storage.local.get(['reminders'], (res) => {
      const reminders = (res.reminders || [])
        .filter(r => r.fireAt > Date.now())          // only future
        .sort((a, b) => a.fireAt - b.fireAt);        // earliest first

      if (!reminders.length) {
        remindList.innerHTML = '<div class="remind-empty">No upcoming reminders</div>';
        return;
      }
      remindList.innerHTML = reminders.map(r => `
        <div class="remind-item">
          <div class="remind-item-text">${(r.noteText || '').replace(/</g,'&lt;')}</div>
          <div class="remind-item-meta">
            <span>${r.timeLabel}</span>
            <button class="remind-item-del" data-id="${r.id}">✕</button>
          </div>
        </div>
      `).join('');

      remindList.querySelectorAll('.remind-item-del').forEach(btn => {
        btn.onclick = () => deleteReminder(btn.dataset.id);
      });
    });
  }

  function deleteReminder(remId) {
    chrome.storage.local.get(['reminders'], (res) => {
      const reminders = (res.reminders || []).filter(r => r.id !== remId);
      chrome.storage.local.set({ reminders }, () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_ALARM', remId });
        loadReminderList();
      });
    });
  }

  // Listen for reminder fired — refresh list if panel is open
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'REMINDER_FIRED') {
      loadReminderList();
    }
  });

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
      if (dateSet.has(key)) { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); dayCursor.setDate(dayCursor.getDate() - 1); }
      else break;
    }
    const dates = Array.from(dateSet).sort();
    let tempStreak = 0, prevDate = null;
    dates.forEach(key => {
      if (!prevDate) { tempStreak = 1; }
      else { const diff = Math.floor((new Date(key) - new Date(prevDate)) / 86400000); tempStreak = diff === 1 ? tempStreak + 1 : 1; }
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

  function toggleTaskInNote(noteId, checkboxEl) {
    const label = checkboxEl.getAttribute('data-label') || '';
    const isChecked = checkboxEl.checked;
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

  // Update the merge bar whenever selection changes
  function updateMergeUI() {
    const count = selectedNoteIds.size;
    if (count >= 2) {
      mergeBar.classList.remove('hidden');
      mergeBarLabel.textContent = `${count} note${count !== 1 ? 's' : ''} selected`;
      mergeBadge.textContent = count;
      mergeBadge.classList.remove('hidden');
    } else {
      mergeBar.classList.add('hidden');
      mergeBadge.classList.add('hidden');
    }
  }

  function clearMergeSelection() {
    selectedNoteIds.clear();
    updateMergeUI();
    // Remove selected class from all cards without full reload
    notesList.querySelectorAll('.note-item.selected').forEach(el => el.classList.remove('selected'));
  }

  function handleMergeClicked() {
    if (selectedNoteIds.size < 2) return;
    chrome.storage.local.get(['notes'], (res) => {
      const allNotes = res.notes || [];
      // Keep original note order (by position in allNotes, not selection order)
      const selected = allNotes.filter(n => selectedNoteIds.has(n.id));
      if (selected.length < 2) return;
      const base = selected[0];

      // Build merged text: each note prefixed with its source title as a header
      const combinedText = selected.map(n => {
        const header = n.pageTitle ? `**${n.pageTitle}**` : null;
        const body = (n.text || '').trim();
        return header ? `${header}\n${body}` : body;
      }).filter(Boolean).join('\n\n---\n\n');

      // Union all hashtags from all selected notes
      const tagSet = new Set();
      selected.forEach(n => { (n.text || '').match(/#\w+/g)?.forEach(t => tagSet.add(t)); });

      // Inherit category from majority vote (most common), fallback to base
      const catVotes = {};
      selected.forEach(n => { if (n.category) catVotes[n.category] = (catVotes[n.category] || 0) + 1; });
      const bestCat = Object.entries(catVotes).sort((a,b) => b[1]-a[1])[0]?.[0] || base.category || '';

      const now = new Date();
      const mergedNote = {
        id: Date.now(),
        text: combinedText,
        tags: Array.from(tagSet).join(' '),
        category: bestCat,
        pinned: false,
        timestamp: now.toLocaleString(),
        createdDate: formatDateKey(now),
        pageTitle: `Merged (${selected.length} notes)`,
        pageUrl: base.pageUrl || '',
        tabGroupColor: base.tabGroupColor || null
      };

      const remaining = allNotes.filter(n => !selectedNoteIds.has(n.id));
      remaining.unshift(mergedNote);
      chrome.storage.local.set({ notes: remaining }, () => {
        selectedNoteIds.clear();
        updateMergeUI();
        loadNotes();
      });
    });
  }

  // ── Save note ─────────────────────────────────────────────────────────────

  function saveNote() {
    if (!noteInput.value.trim()) return;
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs && tabs[0] ? tabs[0] : {};
      const text = noteInput.value;

      // ── TAB GROUP AWARENESS: detect color of the active tab's group ────────
      let tabGroupColor = null;
      try {
        if (tab.groupId && tab.groupId !== -1) {
          const group = await chrome.tabGroups.get(tab.groupId);
          tabGroupColor = group.color || null;
        }
      } catch (_) {}

      const note = {
        id: Date.now(), text,
        tags: autoTags.textContent || '',
        category: categorySelect.value || '',
        pinned: false,
        timestamp: new Date().toLocaleString(),
        createdDate: formatDateKey(),
        pageTitle: tab.title || 'Untitled page',
        pageUrl:   tab.url   || '',
        tabGroupColor  // ← stored with the note
      };

      chrome.storage.local.get(['notes'], (result) => {
        const notes = result.notes || [];
        notes.unshift(note);
        chrome.storage.local.set({ notes }, () => {
          noteInput.value = '';
          tagsSection.classList.add('hidden');
          categorySelect.value = '';
          focusedNoteIndex = -1;
          loadNotes();

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
    if (tags.length) { autoTags.textContent = tags.join(' '); tagsSection.classList.remove('hidden'); }
    else tagsSection.classList.add('hidden');
  }

  // ── Build category filter pills ───────────────────────────────────────────

  function buildCategoryFilters(notes) {
    const usedCats = new Set(notes.map(n => n.category).filter(Boolean));
    if (!usedCats.size) { categoryFilters.innerHTML = ''; categoryFilters.classList.add('hidden'); return; }
    categoryFilters.classList.remove('hidden');
    categoryFilters.innerHTML = '';
    usedCats.forEach(cat => {
      const meta = CATEGORIES[cat];
      if (!meta) return;
      const pill = document.createElement('div');
      pill.className = 'cat-pill' + (currentCategoryFilter === cat ? ' active' : '');
      pill.textContent = meta.label;
      pill.onclick = () => { currentCategoryFilter = currentCategoryFilter === cat ? null : cat; focusedNoteIndex = -1; loadNotes(); };
      categoryFilters.appendChild(pill);
    });
  }

  // ── Build tag filter pills ────────────────────────────────────────────────

  function buildTagFilters(notes) {
    const tagSet = new Set();
    notes.forEach(note => { (note.text || '').match(/#\w+/g)?.forEach(tag => tagSet.add(tag)); });
    const tags = Array.from(tagSet).sort();
    if (!tags.length) { tagFilters.innerHTML = ''; tagFilters.classList.add('hidden'); return; }
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
      pill.onclick = () => { currentTagFilter = currentTagFilter === tag ? null : tag; focusedNoteIndex = -1; loadNotes(); };
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
        notesList.innerHTML = ''; notesList.classList.add('hidden');
        renderedNotes = []; return;
      }

      notesList.classList.remove('hidden');
      notesList.innerHTML = '';

      let notes = currentCategoryFilter ? allNotes.filter(n => n.category === currentCategoryFilter) : allNotes;
      if (currentTagFilter) notes = notes.filter(n => (n.text || '').includes(currentTagFilter));
      if (searchQuery) {
        notes = notes.filter(note =>
          (note.text || '').toLowerCase().includes(searchQuery) ||
          (note.pageTitle || '').toLowerCase().includes(searchQuery) ||
          (note.tags || '').toLowerCase().includes(searchQuery)
        );
      }

      notes = [...notes].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.id - a.id;
      });

      notes = notes.slice(0, searchQuery ? 30 : 20);
      renderedNotes = notes; // keep reference for keyboard nav

      // Clamp focused index after reload
      if (focusedNoteIndex >= notes.length) focusedNoteIndex = notes.length - 1;

      notes.forEach((note, idx) => {
        const item = document.createElement('div');
        const isFocused = idx === focusedNoteIndex;

        item.className = 'note-item' +
          (selectedNoteIds.has(note.id) ? ' selected' : '') +
          (note.pinned ? ' pinned' : '') +
          (isFocused ? ' kb-focused' : '') +
          (note.highlighted ? ' highlighted' : '');

        // ── TAB GROUP COLOR: apply to card if note has a group color ──────────
        if (note.tabGroupColor && TAB_GROUP_COLORS[note.tabGroupColor]) {
          const gc = TAB_GROUP_COLORS[note.tabGroupColor];
          item.style.borderColor = gc.border;
          item.style.background  = gc.bg;
          // Add a small colored dot indicator
          const groupDot = document.createElement('div');
          groupDot.className = 'tab-group-dot';
          groupDot.style.background = gc.dot;
          groupDot.title = `Tab group: ${note.tabGroupColor}`;
          item.appendChild(groupDot);
        }

        // Single-click: toggle merge selection
        item.onclick = () => {
          focusedNoteIndex = idx;
          if (selectedNoteIds.has(note.id)) { selectedNoteIds.delete(note.id); item.classList.remove('selected'); }
          else { selectedNoteIds.add(note.id); item.classList.add('selected'); }
          notesList.querySelectorAll('.note-item').forEach((el, i) => {
            el.classList.toggle('kb-focused', i === focusedNoteIndex);
          });
          navHint.classList.add('visible');
          updateMergeUI(); // ← update badge & bar on every selection change
        };

        // Double-click: open detail editor
        item.ondblclick = (e) => {
          e.stopPropagation();
          openNoteDetail(note);
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
          originDiv.onclick = (e) => { e.stopPropagation(); if (note.pageUrl) chrome.tabs.create({ url: note.pageUrl }); };
          item.appendChild(originDiv);
        }

        // Text — scrollable
        const textDiv = document.createElement('div');
        textDiv.className = 'note-text';
        textDiv.innerHTML = renderMarkdownLite(note.text);
        textDiv.addEventListener('wheel', (e) => e.stopPropagation());
        textDiv.addEventListener('mousedown', (e) => e.stopPropagation());
        item.appendChild(textDiv);

        // Meta
        const metaDiv = document.createElement('div');
        metaDiv.className = 'note-meta';
        metaDiv.textContent = note.timestamp;
        item.appendChild(metaDiv);

        // Action buttons row (top-right of card)
        const btnRow = document.createElement('div');
        btnRow.className = 'note-btn-row';

        // Duplicate button
        const dupBtn = document.createElement('button');
        dupBtn.className = 'note-action-btn';
        dupBtn.title = 'Copy text to clipboard';
        dupBtn.textContent = '⧉';
        dupBtn.onclick = (e) => { e.stopPropagation(); copyNote(note); };
        btnRow.appendChild(dupBtn);

        // Highlight toggle button (only on clip notes — text contains #clip)
        if ((note.text || '').includes('#clip')) {
          const hlBtn = document.createElement('button');
          hlBtn.className = 'note-action-btn' + (note.highlighted ? ' hl-active' : '');
          hlBtn.title = note.highlighted ? 'Remove highlight' : 'Highlight this clip';
          hlBtn.textContent = '◑';
          hlBtn.onclick = (e) => { e.stopPropagation(); toggleHighlight(note.id); };
          btnRow.appendChild(hlBtn);
        }

        // Pin button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'note-action-btn' + (note.pinned ? ' pin-active' : '');
        pinBtn.title = note.pinned ? 'Unpin note' : 'Pin to top';
        pinBtn.textContent = '↑';
        pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(note.id); };
        btnRow.appendChild(pinBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'note-action-btn del-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Delete note (or press Del when focused)';
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteNote(note.id, note); };
        btnRow.appendChild(deleteBtn);

        item.appendChild(btnRow);

        notesList.appendChild(item);
      });

      // Re-apply keyboard focus visual after render
      if (focusedNoteIndex >= 0) {
        const items = notesList.querySelectorAll('.note-item');
        if (items[focusedNoteIndex]) items[focusedNoteIndex].classList.add('kb-focused');
      }

      // Keep merge badge in sync after every render
      updateMergeUI();

      // Checkbox handlers
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

  // ── Copy note text to clipboard ──────────────────────────────────────────

  function copyNote(note) {
    const plain = (note.text || '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')   // strip **bold**
      .replace(/\*([^*]+)\*/g, '$1')         // strip *italic*
      .replace(/~~([^~]+)~~/g, '$1')         // strip ~~strike~~
      .replace(/`([^`]+)`/g, '$1')            // strip `code`
      .replace(/^>\s+/gm, '')               // strip blockquote >
      .replace(/^#{1,2}\s+/gm, '')           // strip # and ## headings
      .replace(/^-\s\[[ x]\]\s+/gim, '')   // strip checklist markers
      .trim();
    navigator.clipboard.writeText(plain).then(() => {
      showToast('Copied to clipboard');
    }).catch(() => {
      // Fallback for restricted contexts
      const ta = document.createElement('textarea');
      ta.value = plain;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied to clipboard');
    });
  }

  // ── Highlight toggle (clip notes only) ───────────────────────────────────
  // Highlights mark the whole note with a yellow wash — like a highlighter pen
  // on paper. Stored as note.highlighted boolean.

  function toggleHighlight(id) {
    chrome.storage.local.get(['notes'], (res) => {
      const notes = res.notes || [];
      const idx = notes.findIndex(n => n.id === id);
      if (idx === -1) return;
      notes[idx].highlighted = !notes[idx].highlighted;
      chrome.storage.local.set({ notes }, loadNotes);
    });
  }

  // ── Generic toast (reusable for non-undo messages) ────────────────────────

  function showToast(msg) {
    undoToast.classList.remove('hidden');
    // Temporarily replace content with plain message
    const prev = undoToast.innerHTML;
    undoToast.innerHTML = `<span>${msg}</span>`;
    clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => {
      undoToast.innerHTML = prev;
      undoToast.classList.add('hidden');
    }, 1800);
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
      undoBuffer = noteObj;
      chrome.storage.local.set({ notes }, () => { loadNotes(); showUndoToast(); });
    });
  }
});

// ── Formatting Toolbar ─────────────────────────────────────────────────────
(function initFmtToolbar() {
  const toolbar  = document.getElementById('fmtToolbar');
  const textarea = document.getElementById('noteInput');
  if (!toolbar || !textarea) return;

  const FORMATS = {
    bold:   { wrap: ['**', '**'],  line: false, placeholder: 'bold text' },
    italic: { wrap: ['*', '*'],    line: false, placeholder: 'italic text' },
    code:   { wrap: ['`', '`'],    line: false, placeholder: 'code' },
    strike: { wrap: ['~~', '~~'],  line: false, placeholder: 'text' },
    quote:  { wrap: ['> ', ''],     line: true,  placeholder: 'quote' },
    olist:  { wrap: null,           line: true,  placeholder: 'item' },
    task:   { wrap: ['- [ ] ', ''],line: true,  placeholder: 'task' },
    bullet: { wrap: ['- ', ''],    line: true,  placeholder: 'item' },
    h1:     { wrap: ['# ', ''],    line: true,  placeholder: 'Heading' },
    h2:     { wrap: ['## ', ''],   line: true,  placeholder: 'Heading' },
  };

  toolbar.addEventListener('mousedown', (e) => {
    // Prevent textarea from losing focus/selection
    e.preventDefault();
  });

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
      // Figure out the next number by scanning lines above cursor
      const textBefore = val.slice(0, start);
      const linesAbove = textBefore.split('\n');
      let nextNum = 1;
      for (let i = linesAbove.length - 1; i >= 0; i--) {
        const m = linesAbove[i].match(/^(\d+)\.\s/);
        if (m) { nextNum = parseInt(m[1]) + 1; break; }
        if (linesAbove[i].trim() !== '') break; // non-numbered, non-empty line — reset
      }
      const lineStart   = val.lastIndexOf('\n', start - 1) + 1;
      const lineContent = val.slice(start, end) || cfg.placeholder;
      const prefix      = `${nextNum}. `;
      textarea.value    = val.slice(0, lineStart) + prefix + lineContent + val.slice(end);
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefix.length + lineContent.length);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (cfg.line) {
      // Line-level: prepend prefix to the start of the selection (or current line)
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const prefix    = cfg.wrap[0];

      before = val.slice(0, lineStart);
      const lineContent = sel || cfg.placeholder;
      insert = prefix + lineContent;
      after  = val.slice(end);

      newStart = lineStart + prefix.length;
      newEnd   = newStart + lineContent.length;
    } else {
      // Inline wrap
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

    // Trigger input event so any listeners (auto-tag etc.) still fire
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
})();


// ── Resizer drag ───────────────────────────────────────────────────────────
(function initResizer() {
  const resizer   = document.getElementById('resizer');
  const textarea  = document.getElementById('noteInput');
  if (!resizer || !textarea) return;

  const MIN_H = 30;   // textarea minimum height px
  const MAX_H = 200;  // textarea maximum height px

  // Restore saved textarea height
  const saved = localStorage.getItem('noteInputHeight');
  const initH = saved ? parseInt(saved) : 96;
  textarea.style.height = initH + 'px';
  document.documentElement.style.setProperty('--input-h', initH + 'px');

  let startY = 0;
  let startH = 0;

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startY = e.clientY;
    startH = textarea.offsetHeight;
    resizer.classList.add('dragging');
    document.body.style.cursor = 'ns-resize';

    const onMove = (ev) => {
      // drag UP (negative delta) = shrink textarea = more notes space
      const delta = ev.clientY - startY;
      const newH  = Math.min(MAX_H, Math.max(MIN_H, startH + delta));
      textarea.style.height = newH + 'px';
      document.documentElement.style.setProperty('--input-h', newH + 'px');
    };

    const onUp = (ev) => {
      resizer.classList.remove('dragging');
      document.body.style.cursor = '';
      const delta = ev.clientY - startY;
      const newH  = Math.min(MAX_H, Math.max(MIN_H, startH + delta));
      localStorage.setItem('noteInputHeight', newH);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
})();
