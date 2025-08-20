const DEFAULTS = {
  backendUrl: 'http://127.0.0.1:5000',
  useAuthenticated: false,
  authToken: ''
};

function $(s) { return document.querySelector(s); }

async function load() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const settings = { ...DEFAULTS, ...stored };
  $('#backendUrl').value = settings.backendUrl;
  $('#useAuth').checked = !!settings.useAuthenticated;
  $('#authToken').value = settings.authToken || '';
  
  // Auto-test connection on load
  if (settings.backendUrl) {
    setTimeout(() => testConnection(), 500);
  }
}

async function save() {
  const backendUrl = $('#backendUrl').value.trim().replace(/\/$/, '');
  const useAuthenticated = $('#useAuth').checked;
  const authToken = $('#authToken').value.trim();

  if (!backendUrl) {
    setStatus('Backend URL is required', 'error');
    return;
  }

  if (!/^https?:\/\//i.test(backendUrl)) {
    setStatus('Please enter a valid http(s) URL', 'error');
    return;
  }

  if (useAuthenticated && !authToken) {
    setStatus('JWT token is required for authenticated mode', 'error');
    return;
  }

  try {
    await chrome.storage.sync.set({ backendUrl, useAuthenticated, authToken });
    setStatus('Configuration saved successfully!', 'success');
    
    // Test connection after saving
    setTimeout(() => testConnection(), 1000);
  } catch (error) {
    setStatus('Failed to save settings', 'error');
  }
}

async function testConnection() {
  const backendUrl = $('#backendUrl').value.trim().replace(/\/$/, '');
  
  if (!backendUrl) {
    return;
  }

  showConnectionTest();
  updateConnectionStatus('testing', 'Testing connection...');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(`${backendUrl}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      updateConnectionStatus('online', 'Backend is online and responding');
      $('#connectionDetails').innerHTML = `
        <div style="margin-top: 8px;">
          <strong>Status:</strong> ${data.status || 'healthy'}<br>
          <strong>Response Time:</strong> ${Date.now() - startTime}ms<br>
          <strong>Server:</strong> ${response.headers.get('server') || 'Unknown'}
        </div>
      `;
    } else {
      updateConnectionStatus('offline', `Backend returned ${response.status} ${response.statusText}`);
      $('#connectionDetails').textContent = 'The server is running but returned an error. Check your backend configuration.';
    }
  } catch (error) {
    updateConnectionStatus('offline', 'Connection failed');
    
    let details = '';
    if (error.name === 'AbortError') {
      details = 'Connection timeout after 10 seconds. Check if the backend is running.';
    } else if (error.message.includes('fetch')) {
      details = 'Network error. Ensure the backend URL is correct and the server is running.';
    } else {
      details = error.message;
    }
    
    $('#connectionDetails').textContent = details;
  }
}

function showConnectionTest() {
  $('#connectionTest').style.display = 'block';
  startTime = Date.now();
}

function updateConnectionStatus(status, message) {
  const indicator = $('#statusIndicator');
  const text = $('#statusText');
  
  indicator.className = `status-indicator ${status}`;
  text.textContent = message;
}

function setStatus(text, type) {
  const el = $('#status');
  el.style.display = 'flex';
  el.textContent = text || '';
  el.className = `status-message ${type}`;
  
  if (type === 'success') {
    el.innerHTML = `<i class="fas fa-check-circle"></i> ${text}`;
  } else if (type === 'error') {
    el.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${text}`;
  }
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    el.style.display = 'none';
  }, 5000);
}

let startTime = 0;

document.addEventListener('DOMContentLoaded', () => {
  load();
  
  $('#save').addEventListener('click', save);
  $('#testConnection').addEventListener('click', testConnection);
  
  // Auto-test when URL changes
  $('#backendUrl').addEventListener('blur', () => {
    const url = $('#backendUrl').value.trim();
    if (url && /^https?:\/\//i.test(url)) {
      setTimeout(() => testConnection(), 500);
    }
  });
  
  // Show/hide auth token field based on checkbox
  $('#useAuth').addEventListener('change', (e) => {
    const tokenGroup = $('#authToken').closest('.form-group');
    tokenGroup.style.opacity = e.target.checked ? '1' : '0.5';
    $('#authToken').disabled = !e.target.checked;
  });
  
  // Initial state for auth token field
  const tokenGroup = $('#authToken').closest('.form-group');
  tokenGroup.style.opacity = $('#useAuth').checked ? '1' : '0.5';
  $('#authToken').disabled = !$('#useAuth').checked;
}); 