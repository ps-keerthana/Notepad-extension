# notepad_

> A Chrome side panel extension for capturing, organising, and formatting notes without leaving your current page.

Built with plain HTML, CSS, and vanilla JavaScript. No frameworks. No build step. No server.

---

## Installation

1. Download or clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the folder containing `manifest.json`.
5. Click the Smart Notepad icon in the toolbar — the side panel opens pinned to the right of your browser.

> To customise the keyboard shortcut, go to `chrome://extensions/shortcuts`

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+N` / `Cmd+Shift+N` | Open the side panel |
| `Ctrl+Enter` | Save the current note |
| `↑ / ↓` | Navigate the notes list |
| `Enter` | Open selected note |
| `Del` | Delete selected note |
| `P` | Pin / unpin the focused note |

---

## Features

### Side Panel

The extension runs as a Chrome side panel — it stays open alongside any webpage without covering your content. Click the toolbar icon to open or close it.

---

### Note Capture

Type in the input area and press **Save_** or `Ctrl+Enter`. Every note automatically records the **page title and URL** it was captured from.

The input area is resizable — drag the handle between the input and notes list upward to give more room to the notes list, or downward to expand the writing area. The size is remembered across sessions.

---

### Formatting Toolbar

A toolbar above the input area applies Markdown formatting on selected text with a single click. Click a button without a selection to insert a placeholder.

| Button | Syntax | Result |
|---|---|---|
| B | `**text**` | Bold |
| I | `*text*` | Italic |
| `` ` `` | `` `text` `` | Inline code |
| 1. | `1. item` | Numbered list (auto-increments) |
| Checkbox | `- [ ] task` | Task item |
| Bullet | `- item` | Unordered list item |
| H1 | `# Heading` | Large heading |
| H2 | `## Heading` | Medium heading |
| S | `~~text~~` | Strikethrough |

The numbered list button reads existing numbered lines above the cursor and continues the sequence automatically.

---

### Markdown Rendering

Notes are rendered in the list with full Markdown support:

- `**bold**` and `*italic*`
- `` `inline code` ``
- `# H1` and `## H2` headings
- `~~strikethrough~~`
- `- [ ] / - [x]` interactive task checkboxes — state is saved immediately on check
- Bullet and numbered lists

---

### Categories

Assign a category from the dropdown before saving.

| Category | Intended use |
|---|---|
| Work | Tasks, meetings, decisions |
| Personal | Life admin, reminders |
| Research | Articles, references, findings |
| Ideas | Speculative or creative notes |

Category filter pills appear below the search bar once categorised notes exist.

---

### Hashtags and Tag Filtering

Type `#tagname` anywhere in a note to tag it. Tag filter pills appear below the search bar after saving. Click a pill to filter; click again to clear.

---

### Smart Auto-Tags

Keywords detected while typing trigger automatic tag suggestions:

| Keywords | Auto-tag |
|---|---|
| `code`, `bug`, `fix` | code |
| `idea`, `feature` | idea |
| `learn`, `tutorial` | learn |
| `project`, `task` | task |

---

### Search

The search bar filters all notes in real time across note text, page title, and tags.

---

### Pinning Notes

Hover over any note to reveal an `↑` button. Click it to pin — pinned notes always float to the top regardless of filters and show a gold left border. Press `P` on a keyboard-focused note to toggle pin.

---

### Merging Notes

Single-click notes to select them (they highlight). Once two or more are selected, click **Merge** — a new note is created with all selected content joined by `---` separators.

---

### Note Detail and Editing

Double-click any note (or press `Enter` when focused) to open the note detail panel inline. From there you can edit the full text with the formatting toolbar, view and open the source URL, save changes, or delete the note.

---

### Undo Delete

Deleting a note shows a toast for five seconds with an **Undo** button. Click it to restore the note with all metadata intact.

---

### Right-Click to Clip

Select any text on any webpage → right-click → **Save selection to Smart Notepad**.

The clipped text is saved immediately as a note tagged `#clip` with the source page attached. The side panel refreshes instantly if it is open — no need to close and reopen.

---

### Voice Input

Click **Voice** to open the voice input panel inline. Click **Start** and speak — text appears in real time via the browser's Web Speech API. Edit the transcription, then click **Use in Notepad** to transfer it to the input area.

---

### Today's Timeline

Click **Today** to open the timeline panel inline, showing all notes from the current day grouped by source website. The header shows a summary: sessions, notes taken, and tasks completed.

---

### Stats

Click **Stats** to expand the stats panel:

- Notes saved today
- Notes this week
- Current daily streak
- Longest streak
- Total notes all time

---

### Reminders

Click **Remind** to open the reminder panel. Select a note and a date/time — a browser notification fires at the set time. Active reminders are listed and can be deleted individually. Reminders survive browser restarts.

---

### Tab Group Colour

Clipped notes inherit the colour of the Chrome tab group the source tab belongs to, if any. This appears as a coloured accent on the note card.

---

### Dark and Light Mode

Click the mode toggle in the header to switch themes. The preference is saved and applied on next open.

---

## File Structure

| File | Purpose |
|---|---|
| `manifest.json` | Extension config, permissions, side panel path, keyboard shortcut |
| `popup.html` | Side panel UI |
| `popup.css` | All styles and dark/light theme variables |
| `popup.js` | Core logic: save, search, filter, format, pin, merge, remind, stats, inline panels |
| `background.js` | Service worker: context menu clip, reminder alarms, notifications |
| `note.html` / `note.js` | Standalone note detail window (legacy, now handled inline) |
| `voice.html` / `voice.js` | Standalone voice window (legacy, now handled inline) |
| `timeline.html` / `timeline.js` | Standalone timeline window (legacy, now handled inline) |

---

## Storage

Notes and reminders are stored in `chrome.storage.local` (up to 10 MB). Everything stays on your device — nothing is sent to any server.

---

## License

MIT — use it, fork it, ship it.
