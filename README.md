# 📝 Smart Notepad — Chrome Extension

> Capture ideas instantly while browsing. Voice input, hashtag filtering, categories, pinned notes, dark mode, and a built-in Pomodoro timer — all in your browser toolbar.

---

## 📦 Installation (Load Unpacked)

You don't need to publish to the Chrome Web Store to use this. Follow these steps:

1. **Download / clone** this repository to your computer.
2. Convert your icon files to **PNG** format (Chrome requires PNG, not JPEG):
   - Rename `icon16.jpg` → `icon16.png`, `icon48.jpg` → `icon48.png`, `icon128.jpg` → `icon128.png`
   - Or replace them with proper PNG images at those sizes.
3. Open Chrome and go to `chrome://extensions/`
4. Enable **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the folder containing `manifest.json`.
6. The Smart Notepad icon will appear in your toolbar. Click it to open!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` (Windows/Linux) | Open the Smart Notepad popup |
| `Cmd+Shift+N` (Mac) | Open the Smart Notepad popup |
| `Ctrl+Enter` (inside textarea) | Save the current note |

> **To customise shortcuts:** Go to `chrome://extensions/shortcuts`

---

## ✨ Features & How to Use Them

### 1. 📝 Saving a Note

1. Click the Smart Notepad icon in the toolbar.
2. Type your note in the big text area.
3. Click **Save Note** or press `Ctrl+Enter`.

The note automatically captures the **page title and URL** you were on, so you always know where an idea came from.

---

### 2. 📁 Categories

Organise notes into one of four buckets before saving:

| Category | Use it for |
|---|---|
| 💼 Work | Tasks, meetings, deadlines |
| 🏠 Personal | Life admin, to-dos |
| 🔬 Research | Articles, references, findings |
| 💡 Ideas | Anything creative or speculative |

**How to use:**
1. Click the **category dropdown** (below the icon row).
2. Select a category.
3. Write and save your note.

Once notes with categories exist, **filter pills** appear below the search bar. Click any pill to show only notes from that category.

---

### 3. 📌 Pinning Notes

Pin important notes so they always appear **at the top** of the list, regardless of filters or sort order.

**How to use:**
- Hover over any note — a 📌 button appears in the top-right.
- Click 📌 to pin. Click again to unpin.
- Pinned notes show a **gold border**.

---

### 4. 🔖 Hashtags & Tag Filtering

Type `#tagname` anywhere in your note text to tag it.

```
Just shipped the new auth flow #work #code
```

After saving, coloured **tag pills** appear below the search bar. Click a pill to filter to only notes with that tag.

- Click the active pill again to clear the filter.
- Tags are colour-coded consistently — `#work` is always the same colour.

---

### 5. 💡 Smart Auto-Tags

While you type, Smart Notepad automatically detects keywords and suggests tags:

| You write... | Auto-tag |
|---|---|
| `code`, `bug`, `fix` | 💻 Code |
| `idea`, `feature` | 💡 Idea |
| `learn`, `tutorial` | 📚 Learn |
| `project`, `task` | 🚀 Task |

These are shown above the notes list and saved alongside the note.

---

### 6. 🔍 Search

The search bar filters all notes in real time across the note text, page title, and tags.

- Results are not limited to the current category or tag filter.
- Selecting a category or tag pill clears the search.

---

### 7. ✅ Checklist / Tasks

Write checklist items using Markdown syntax:

```
- [ ] Buy groceries
- [ ] Call dentist
- [x] Deploy to staging
```

Rendered notes show interactive checkboxes. Checking/unchecking a box saves the state immediately.

---

### 8. ✍️ Markdown Support

Inside the note text, you can use:

| Syntax | Result |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `` `code` `` | `code` |
| `> quote` | Blockquote |
| `- [ ] task` | Checkbox |

---

### 9. 🗑️ Undo Delete

Accidentally deleted a note? A toast notification appears at the bottom for 5 seconds with an **Undo** button. Click it to restore the note instantly.

---

### 10. 🌙 Dark Mode

Click the **🌙 button** in the header to toggle dark mode. Your preference is saved and remembered next time you open the extension.

The extension also respects your system dark mode setting by default.

---

### 11. 🎤 Voice Input

1. Click the **🎤 Voice** button.
2. A small window opens. Click **Start** and speak.
3. Your speech appears as text in real time.
4. Edit if needed, then click **Use in Notepad**.
5. The text lands in the note textarea, ready to save.

> Voice uses the browser's built-in Web Speech API. Chrome supports this natively.

---

### 12. 📅 Today's Timeline

Click **📅 Today** to open a timeline window showing all notes from today, grouped by the website they were captured on.

The summary line shows: sessions visited · notes taken · tasks completed.

---

### 13. 📈 Stats

Click **📈 Stats** to expand the stats panel:

- **Today** — notes saved today
- **This week** — notes in the last 7 days
- **Current streak** — consecutive days with at least one note
- **Longest streak** — your best ever streak
- **Total notes** — all time

---

### 14. 🔀 Merge Notes

You can combine multiple notes into one:

1. **Single-click** any notes you want to merge (they get a purple highlight).
2. Click the **Merge** button.
3. A new note is created with all selected notes joined by `---` separators.

---

### 15. 🍅 Pomodoro / Focus Mode

Click **🍅 Focus** to open the Pomodoro panel:

1. Click **Start 25m** to begin a 25-minute focus session.
2. The popup enters **focus mode** (dark theme).
3. Notes saved during a session are automatically tagged `#focus`.
4. When the timer ends, a session summary note is saved automatically.

**Stop** cancels the session. **Skip** ends it immediately.

---

### 16. ✏️ Editing a Note

**Double-click** any note to open a detail window where you can:
- Edit the full text
- See the source page (clickable link)
- Save changes or delete the note

---

### 17. 🖱️ Right-Click to Clip

Select any text on any webpage → right-click → **Save selection to Smart Notepad**.

The clipped text is saved as an italicised note tagged `#clip`, with the page source attached.

---

## 🗂️ File Overview

| File | What it does |
|---|---|
| `manifest.json` | Extension config, permissions, keyboard shortcuts |
| `popup.html` | Main UI structure |
| `popup.css` | All styles including dark mode variables |
| `popup.js` | All main logic: save, search, filter, pin, undo, categories |
| `background.js` | Service worker: context menu, clip-to-notepad |
| `note.html` / `note.js` | Note detail/edit window |
| `voice.html` / `voice.js` | Voice input window |
| `timeline.html` / `timeline.js` | Today's timeline window |

---

## 🔧 Storage

Notes are stored in `chrome.storage.local` (up to 10MB). This keeps data on your device only — nothing is sent to any server.

> **Upgrading from an older version?** If you had notes saved with an older version using `chrome.storage.sync`, they won't appear. You can export/import via the Chrome DevTools console:
> ```js
> chrome.storage.sync.get(['notes'], console.log) // see old notes
> chrome.storage.local.set({ notes: [...] })       // paste them in
> ```

---

## 🛠️ Development Notes

- No build step required — plain HTML, CSS, and vanilla JS.
- All pages (popup, note, voice, timeline) are standalone HTML files with their own JS.
- To add a new category, edit the `CATEGORIES` object in `popup.js` and add an `<option>` in `popup.html`.
- To add a new smart tag keyword, edit the `generateSmartTags()` function in `popup.js`.

---

## 📄 License

MIT — use it, fork it, ship it.
