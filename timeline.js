function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

document.addEventListener('DOMContentLoaded', () => {
  const closeBtn     = document.getElementById('closeBtn');
  const dateLabel    = document.getElementById('dateLabel');
  const timelineList = document.getElementById('timelineList');
  const summaryEl    = document.getElementById('summary');

  const today = new Date();
  const todayKey = formatDateKey(today);
  dateLabel.textContent = today.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  closeBtn.onclick = () => window.close();

  chrome.storage.sync.get(['notes'], (res) => {
    const allNotes = res.notes || [];

    // filter to today
    const todayNotes = allNotes.filter(n => {
      const key = n.createdDate || formatDateKey(new Date(n.timestamp || Date.now()));
      return key === todayKey;
    });

    if (!todayNotes.length) {
      timelineList.textContent = 'No notes for today yet.';
      summaryEl.textContent = '';
      return;
    }

    // sort by real time (timestamp)
    todayNotes.sort((a, b) => {
      return new Date(a.timestamp || 0) - new Date(b.timestamp || 0);
    });

    // group by source domain
    const sessions = new Map(); // domain -> { title, notes: [] }
    todayNotes.forEach(note => {
      let domain = 'Unknown source';
      if (note.pageUrl) {
        try {
          domain = new URL(note.pageUrl).hostname;
        } catch (_) {}
      }
      if (!sessions.has(domain)) {
        sessions.set(domain, {
          title: note.pageTitle || domain,
          notes: []
        });
      }
      sessions.get(domain).notes.push(note);
    });

    // build UI
    timelineList.innerHTML = '';
    let completedTasks = 0;

    sessions.forEach((session, domain) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'session-group';

      const headerEl = document.createElement('div');
      headerEl.className = 'session-header';
      headerEl.textContent = session.title + ' (' + domain + ')';
      groupEl.appendChild(headerEl);

      session.notes.forEach(note => {
        const itemEl = document.createElement('div');
        itemEl.className = 'timeline-item';

        const timeEl = document.createElement('div');
        timeEl.className = 'timeline-time';
        const t = new Date(note.timestamp || Date.now());
        timeEl.textContent = t.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });

        const textEl = document.createElement('div');
        textEl.className = 'timeline-text';
        textEl.textContent = (note.text || '').replace(/\s+/g, ' ').slice(0, 120);

        itemEl.appendChild(timeEl);
        itemEl.appendChild(textEl);
        groupEl.appendChild(itemEl);

        // count completed tasks in this note (- [x] ...)
        const txt = note.text || '';
        const matches = txt.match(/-\s\[x\]\s+/gi);
        if (matches) completedTasks += matches.length;
      });

      timelineList.appendChild(groupEl);
    });

    const sessionCount = sessions.size;
    const noteCount = todayNotes.length;
    summaryEl.textContent =
      `${sessionCount} session${sessionCount !== 1 ? 's' : ''} · ` +
      `${noteCount} note${noteCount !== 1 ? 's' : ''} · ` +
      `${completedTasks} task${completedTasks !== 1 ? 's' : ''} completed`;
  });
});
