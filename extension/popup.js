document.getElementById('open-studio').addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173' });
});

document.getElementById('open-sidepanel').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
});

// Check status
fetch('http://localhost:8000/api/system/status')
  .then(res => res.json())
  .then(() => {
    document.getElementById('server-status').innerText = '🟢 Local Backend Ready';
  })
  .catch(() => {
    document.getElementById('server-status').innerText = '🔴 Backend Not Running';
  });
