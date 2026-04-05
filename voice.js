const statusEl = document.getElementById('status');
const textEl   = document.getElementById('text');
const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const useBtn   = document.getElementById('useBtn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (!SpeechRecognition) {
  statusEl.textContent = 'Speech recognition not supported.';
  startBtn.disabled = true;
  stopBtn.disabled  = true;
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;

  recognition.onstart = () => {
    statusEl.textContent  = 'Listening... speak now.';
    statusEl.className    = 'listening';
  };
  recognition.onresult = (event) => {
    let full = '';
    for (let i = 0; i < event.results.length; i++) {
      full += event.results[i][0].transcript + ' ';
    }
    textEl.value = full.trim();
  };
  recognition.onerror = (e) => {
    statusEl.textContent = 'Error: ' + e.error;
    statusEl.className   = '';
  };
  recognition.onend = () => {
    statusEl.textContent = 'Stopped. Edit text or click Use in Notepad.';
    statusEl.className   = 'done';
  };
}

startBtn.onclick = () => { if (recognition) recognition.start(); };
stopBtn.onclick  = () => { if (recognition) recognition.stop(); };

useBtn.onclick = () => {
  const value = textEl.value.trim();
  if (!value) return;
  chrome.runtime.sendMessage({ type: 'VOICE_TEXT', text: value }, (response) => {
    if (response && response.ok) {
      window.close();
    } else {
      chrome.storage.local.set({ voiceText: value }, () => window.close());
    }
  });
};
