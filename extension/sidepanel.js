const chatBox = document.getElementById('chat-box');
const queryInput = document.getElementById('query-input');
const sendBtn = document.getElementById('send-btn');
const serverStatus = document.getElementById('server-status');
const statusText = document.getElementById('status-text');

let currentSessionId = null;

// Check server status
async function checkStatus() {
  try {
    const res = await fetch('http://localhost:8000/api/system/status');
    if (res.ok) {
      serverStatus.style.background = '#22c55e';
      statusText.innerText = 'Online';
      loadLatestSession();
    } else {
      serverStatus.style.background = '#f59e0b';
      statusText.innerText = 'Connecting...';
    }
  } catch (e) {
    serverStatus.style.background = '#ef4444';
    statusText.innerText = 'Server Offline';
  }
}

async function loadLatestSession() {
  try {
    const res = await fetch('http://localhost:8000/api/sessions');
    if (res.ok) {
      const list = await res.json();
      if (list && list.length > 0) {
        currentSessionId = list[0].id;
      }
    }
  } catch (_) {}
}

sendBtn.addEventListener('click', sendMessage);
queryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
  const text = queryInput.value.trim();
  if (!text) return;

  // Add user message to UI
  const userDiv = document.createElement('div');
  userDiv.className = 'msg user';
  userDiv.innerText = text;
  chatBox.appendChild(userDiv);
  queryInput.value = '';
  chatBox.scrollTop = chatBox.scrollHeight;

  const thinkingDiv = document.createElement('div');
  thinkingDiv.className = 'msg assistant';
  thinkingDiv.innerText = 'Thinking...';
  chatBox.appendChild(thinkingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    if (!currentSessionId) await loadLatestSession();
    const sid = currentSessionId || 'demo_cybersecurity_module_2';

    const res = await fetch(`http://localhost:8000/api/sessions/${sid}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sid,
        message: text,
        mode: 'simple'
      })
    });

    if (res.ok) {
      const data = await res.json();
      thinkingDiv.innerText = data.text;
    } else {
      thinkingDiv.innerText = 'Could not get response from local LearnLens engine.';
    }
  } catch (err) {
    thinkingDiv.innerText = 'Local LearnLens AI server is unreachable at http://localhost:8000.';
  }
  chatBox.scrollTop = chatBox.scrollHeight;
}

checkStatus();
setInterval(checkStatus, 10000);
