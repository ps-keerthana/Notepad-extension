# notepad_

> A browser extension for capturing, organising, and formatting notes — without leaving the page you are on.

Built with plain HTML, CSS, and vanilla JavaScript. No frameworks. No build step. No server.

---

## Installation

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. The notepad icon will appear in your toolbar.

> To customise the keyboard shortcut, go to `chrome://extensions/shortcuts`

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` / `Cmd+Shift+N` | Open the extension |
| `Ctrl+Enter` | Save the current note |
| `Arrow keys` | Navigate the notes list |
| `Enter` | Open selected note |
| `Del` | Delete selected note |

---

## Features

### Note Capture

Type in the input area and press **Save_** or `Ctrl+Enter`. Each note automatically records the **page title and URL** it was captured from, so context is never lost.

Notes can be written in plain text or with Markdown formatting (see Formatting Toolbar below).

---

### Categories

Assign a category before saving to keep notes organised.

| Category | Intended use |
|---|---|
| Work | Tasks, meetings, decisions |
| Personal | Life admin, reminders |
| Research | Articles, references, findings |
| Ideas | Speculative or creative notes |

Category filter pills appear below the search bar once notes with categories exist. Click any pill to show only that category.

---

### Formatting Toolbar

A toolbar sits above the input area with one-click Markdown formatting. Select text, then click a button — or click without a selection to insert a placeholder.

| Button | Output | Syntax |
|---|---|---|
| B | Bold | `**text**` |
| I | Italic | `*text*` |
| `` ` `` | Inline code | `` `text` `` |
| 1. | Numbered list | `1. item` (auto-increments) |
| Checkbox | Task item | `- [ ] task` |
| Bullet | Unordered list | `- item` |
| H1 | Large heading | `# Heading` |
| H2 | Medium heading | `## Heading` |
| S | Strikethrough | `~~text~~` |

The numbered list button is context-aware — it reads existing numbered lines above the cursor and continues the sequence automatically.

---

### Markdown Rendering

Notes are rendered in the list view with full Markdown support:

- `**bold**` and `*italic*`
- `` `inline code` ``
- `# H1` and `## H2` headings
- `~~strikethrough~~`
- `- [ ] / - [x]` interactive task checkboxes — checking a box saves the state immediately
- Bullet and numbered lists

---

### Resizable Input Area

A drag handle sits between the input area and the notes list. Drag it **upward** to shrink the input area and give more vertical space to the notes list. Drag **downward** to restore it. The position is remembered across sessions.

---

### Search

The search bar filters all notes in real time across note text, page title, and tags. Results are not scoped to the active category or tag filter.

---

### Hashtags and Tag Filtering

Type `#tagname` anywhere in a note to tag it. After saving, tag filter pills appear below the search bar. Click a pill to filter by that tag; click again to clear.

---

### Smart Auto-Tags

Keywords in your note text are detected while you type and auto-tags are suggested:

| Keywords | Auto-tag |
|---|---|
| `code`, `bug`, `fix` | code |
| `idea`, `feature` | idea |
| `learn`, `tutorial` | learn |
| `project`, `task` | task |

---

### Pinning Notes

Hover over any note to reveal a pin button. Pinned notes always appear at the top of the list, regardless of filters or sort order, and are marked with a gold border.

---

### Merging Notes

To combine multiple notes into one:

1. Single-click the notes you want to merge — they highlight on selection.
2. Click **Merge**.
3. A new note is created with all selected notes joined by `---` separators.

The merge count badge on the button updates as you select.

---

### Undo Delete

Deleting a note shows a toast notification at the bottom of the popup for five seconds with an **Undo** button. Click it to restore the note with all its metadata intact.

---

### Note Detail and Editing

Double-click any note to open a full detail view where you can:

- Edit the note text (with the same formatting toolbar)
- View and open the source page URL
- Save changes or permanently delete the note

---

### Voice Input

Click **Voice** to open the voice input window. Speak — your words appear as text in real time via the browser's Web Speech API. Edit the transcription if needed, then click **Use in Notepad** to transfer it to the input area.

---

### Right-Click to Clip

Select any text on any webpage, right-click, and choose **Save selection to Smart Notepad**. The clipped text is saved as a note tagged `#clip` with the source page attached.

---

### Today's Timeline

Click **Today** to open a timeline window showing all notes from the current day, grouped by the website they were captured from. The header shows a summary: sessions, notes, and completed tasks.

---

### Stats

Click **Stats** to expand the stats panel inline:

- Notes saved today
- Notes this week
- Current daily streak
- Longest streak
- Total notes all time

---

### Reminders

Click **Remind** to open the reminder panel. Select a note and a date/time — the extension will trigger a browser notification at the set time. Existing reminders are listed and can be deleted individually.

---

### Dark and Light Mode

Click the mode toggle in the header to switch between dark and light themes. The preference is saved and applied automatically on next open.

---

## File Structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension config, permissions, keyboard shortcuts |
| `popup.html` | Main UI |
| `popup.css` | All styles, dark/light theme variables |
| `popup.js` | Core logic: save, search, filter, format, pin, merge, stats |
| `background.js` | Service worker: context menu, right-click clip |
| `note.html` / `note.js` | Note detail and edit window |
| `voice.html` / `voice.js` | Voice input window |
| `timeline.html` / `timeline.js` | Today's timeline window |

---

## Storage

Notes are stored in `chrome.storage.local` (up to 10 MB). Data stays on your device — nothing is sent to any server.

---

## Screenshots

> Add screenshots here. Suggested shots:
> - Dark mode — input area with formatting toolbar visible
> - Light mode — notes list with rendered Markdown
> - Note detail / edit window
> - Voice input window
> - Today's timeline view

---

## License

MIT — use it, fork it, ship it.
