# 📝 Smart Notepad — Chrome Extension

> A fast, keyboard-driven sidebar notepad with voice input, reminders, hashtag filtering, categories, colour labels, templates, drag-to-reorder, and a polished dark/light theme — all living inside Chrome's native side panel.

---

## 📦 Installation

1. **Unzip** this folder to a permanent location on your computer.
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle top-right).
4. Click **Load unpacked** and select the unzipped folder.
5. The Smart Notepad icon appears in your toolbar. Click it to open the sidebar.

> Icons must be `.png` — the included `icon16.png`, `icon48.png`, `icon128.png` are already correct.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` / `Cmd+Shift+N` | Open / focus the Smart Notepad sidebar |
| `Ctrl+Enter` (in textarea) | Save the current note |
| `↓ / ↑` | Navigate between notes |
| `Enter` (note focused) | Open note detail panel |
| `Delete` (note focused) | Delete focused note |
| `P` (note focused) | Pin / unpin focused note |
| `Escape` | Exit note focus, return to textarea |

---

## ✨ Features

### 1. 📝 Saving a Note
Type in the textarea → **Save_** button or `Ctrl+Enter`. The note captures the current page title and URL automatically.

---

### 2. 📋 Templates
Five built-in note scaffolds appear above the textarea:

| Template | Pre-fills |
|---|---|
| **Meeting** | Date, attendees, agenda, action items, notes |
| **Bug** | Title, severity, steps to reproduce, expected/actual |
| **Standup** | Yesterday / Today / Blockers |
| **Research** | Topic, source, key finding, why it matters |
| **To-do** | Three empty checkboxes + `#task` |

Click any template button to pre-fill the textarea instantly. Custom templates can be stored in `chrome.storage.local` under the key `customTemplates` as a plain object (`{ key: "template text" }`).

---

### 3. 🎨 Colour Labels
Five accent swatches appear below the template row:

**Rose · Amber · Teal · Violet · Sky**

Pick a colour before saving. The note card gets a matching tinted border and background — much faster to scan visually than categories alone. Works in both dark and light mode. Select the ✕ swatch (left) to save with no colour.

---

### 4. 📁 Categories
Category dropdown above the textarea:

| Category | Keyboard shortcut |
|---|---|
| 💼 Work | Filter via header pill |
| 🏠 Personal | Filter via header pill |
| 🔬 Research | Filter via category filter row |
| 💡 Ideas | Filter via header pill |

Category filter pills appear automatically below the search bar once notes with categories exist.

---

### 5. 📌 Pinning Notes
Hover any note card and click **↑** to pin. Pinned notes always sort to the top above all filters. Gold border in light mode, purple glow in dark mode. Press `P` on a keyboard-focused note to toggle pin.

---

### 6. 🔀 Drag-to-Reorder
Drag any note card up or down to reorder. The custom order persists in `chrome.storage.local` under `customOrder`. Pinned notes always stay on top regardless of drag order. Drag order is preserved across reopens.

---

### 7. 🔍 Search
The `/ search notes...` bar filters by note text, page title, and tags in real time across all notes (not just visible ones).

---

### 8. 🔖 Hashtags & Tag Filtering
Type `#tagname` anywhere in a note to tag it. Coloured tag pills appear below the search bar — click to filter. Tags are colour-coded consistently (same tag always same colour).

---

### 9. ✅ Checklists
Use `- [ ] item` syntax. Rendered notes show interactive checkboxes. Checking/unchecking persists immediately.

---

### 10. ✍️ Markdown Formatting Toolbar
Buttons: **B** (bold), *I* (italic), `` ` `` (inline code), `1.` (numbered list), ☑ (task), • (bullet), H1, H2, S (strikethrough). Also available in the Note Detail panel.

---

### 11. 🔀 Merge Notes
Single-click notes to select them (purple highlight). When 2+ are selected, a **merge bar** slides in showing the count and a "Merge into one" button. The merged note gets a bold source-title header per section, unioned tags, and majority-voted category.

---

### 12. ⧉ Copy Note
Hover any note and click **⧉** to copy the plain text to clipboard (markdown stripped). A toast confirms.

---

### 13. ◑ Highlight Clipped Notes
Clip notes (saved via right-click → Save selection) show a **◑** button. Click to apply a yellow highlight wash — useful for marking clips to revisit.

---

### 14. 🗑️ Undo Delete
Delete a note → a toast appears for 5 seconds with an **Undo** button. Click to restore.

---

### 15. 🎤 Voice Input
Click **Voice** in the action row. The voice panel slides in (no separate window). Click **Start** and speak — text appears in real time. Click **Use in notepad** to transfer the recognized text to the main textarea.

---

### 16. 📅 Today's Timeline
Click **Today**. The timeline panel slides in showing all notes from today grouped by source domain, with timestamps. Summary bar shows sessions · notes · tasks completed.

---

### 17. 🔔 Reminders
Click **Remind**. Pick a note from the dropdown, set a date/time (defaults to +1 hour rounded to nearest 5 min), click **Set reminder**. Chrome fires a **silent** OS notification at that time — even when the sidebar is closed or Chrome is minimized. Reminders survive browser restarts. Delete upcoming reminders from the list inside the panel.

---

### 18. 📈 Stats
Click **Stats** to expand: Today / This week / Current streak / Best streak / Total notes.

---

### 19. 🌙 Dark / Light Mode
Click the moon/sun icon in the header. Default is Dark (Deep Space). Light mode uses the Ink & Paper theme (cream background, monospace fonts, gold accents).

---

### 20. 🖱️ Right-Click to Clip
Select any text on any webpage → right-click → **Save selection to Smart Notepad**. Saved as an italic note tagged `#clip`.

---

### 21. 🗂️ Tab Group Awareness
Notes remember the Chrome tab group colour of the tab they were saved from. A coloured left bar appears on the card matching the group colour.

---

### 22. ⚠️ Storage Quota Guard
`chrome.storage.local` has a 10MB limit. The extension checks usage on load and after every save. A warning toast appears at 7.5MB ("approaching limit") and a red warning at 9MB. This prevents silent save failures.

---

### 23. ⌨️ Keyboard Navigation
Press `↓` anywhere to enter note navigation mode. A glow ring highlights the focused note. `↑↓` to move, `Enter` to open, `Delete` to remove, `P` to pin, `Escape` to exit back to textarea. A hint bar fades in to show shortcuts.

---

## 🗂️ File Overview

| File | Purpose |
|---|---|
| `manifest.json` | Extension config, permissions, keyboard shortcuts, side panel |
| `popup.html` | Full UI — sidebar layout + all inline panels |
| `popup.css` | All styles — dark/light themes, components, panels |
| `popup.js` | All logic — notes, panels, drag, templates, colours, reminders |
| `background.js` | Service worker — alarms, notifications, context menu |
| `icon16/48/128.png` | Extension icons |

> **Legacy files removed:** `note.html`, `note.js`, `voice.html`, `voice.js`, `timeline.html`, `timeline.js` — these are no longer used. All functionality is handled inline within `popup.html` / `popup.js`.

---

## 🔧 Storage Schema

All data lives in `chrome.storage.local` (10MB limit). Key structure:

```js
{
  notes: [
    {
      id: Number,           // Date.now() timestamp
      text: String,         // markdown content
      tags: String,         // auto-detected smart tags
      category: String,     // 'work' | 'personal' | 'research' | 'ideas' | ''
      colorLabel: String,   // 'rose' | 'amber' | 'teal' | 'violet' | 'sky' | ''
      pinned: Boolean,
      highlighted: Boolean, // yellow highlight (clip notes)
      tabGroupColor: String, // Chrome tab group color name
      timestamp: String,    // human-readable
      createdDate: String,  // 'YYYY-MM-DD'
      pageTitle: String,
      pageUrl: String
    }
  ],
  customOrder: [Number],    // array of note IDs in drag-reorder sequence
  reminders: [
    {
      id: String,           // 'snp_rem_<timestamp>'
      noteId: Number,
      noteText: String,     // first 80 chars for display
      fireAt: Number,       // Unix ms
      timeLabel: String     // human-readable
    }
  ],
  customTemplates: {},      // optional user-defined templates
  lightMode: Boolean,
  darkMode: Boolean
}
```

---

## 🛠️ Development Notes

- No build step — plain HTML, CSS, vanilla JS.
- To add a custom template: open DevTools console on the extension page and run:
  ```js
  chrome.storage.local.get(['customTemplates'], r => {
    const t = r.customTemplates || {};
    t.mykey = '## My template\n- [ ] item\n';
    chrome.storage.local.set({ customTemplates: t });
  });
  ```
- To reset drag order: `chrome.storage.local.remove('customOrder')`
- Fonts: `Syne` (brand, dark mode), `Space Mono` (mono labels, light mode brand), `DM Sans` (body)

---

## 📄 License

MIT — use it, fork it, ship it.
