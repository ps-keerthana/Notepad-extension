const statusEl = document.getElementById('status');
const textEl   = document.getElementById('text');
const startBtn = document.getElementById('startBtn');
const stopBtn  = document.getElementById('stopBtn');
const useBtn   = document.getElementById('useBtn');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

if (!SpeechRecognition) {
  statusEl.textContent = 'SpeechRecognition not supported in this browser.';
  startBtn.disabled = true;
  stopBtn.disabled = true;
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onstart = () => {
    statusEl.textContent = 'Listening... speak now.';
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
  };

  recognition.onend = () => {
    statusEl.textContent = 'Stopped. You can edit the text or click Start again.';
  };
}

startBtn.onclick = () => {
  if (recognition) recognition.start();
};

stopBtn.onclick = () => {
  if (recognition) recognition.stop();
};

useBtn.onclick = () => {
  const value = textEl.value.trim();
  if (!value) return;

  // Try to send live to any open popup first
  chrome.runtime.sendMessage(
    { type: 'VOICE_TEXT', text: value },
    (response) => {
      // If popup responded, we are done; just close this window
      if (response && response.ok) {
        window.close();
      } else {
        // Popup not open -> store in local so it appears next time
        chrome.storage.local.set({ voiceText: value }, () => {
          window.close();
        });
      }
    }
  );
};