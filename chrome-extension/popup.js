const $ = (sel) => document.querySelector(sel);

const state = {
  language: 'auto',
  isConnected: false
};

function setStatus(text, type = 'info') {
  const statusBar = $('#statusBar');
  const statusText = text || '';
  
  statusBar.style.display = statusText ? 'flex' : 'none';
  statusBar.textContent = statusText;
  statusBar.className = `status-bar ${type}`;
  
  if (type === 'loading') {
    statusBar.innerHTML = `<div class="spinner"></div> ${statusText}`;
  }
}

function showResult(data) {
  const container = $('#resultContainer');
  container.style.display = 'block';
  container.className = 'result-container fade-in';
  
  try {
    const verdict = data.verdict || data.classification || 'unknown';
    const confidence = data.confidence != null ? Number(data.confidence) : 0;
    const suspiciousElements = data.suspicious_elements || data.suspiciousElements || [];
    
    container.innerHTML = `
      <div class="result-header">
        <div class="verdict ${verdict}">
          <i class="fas fa-${getVerdictIcon(verdict)}"></i>
          ${verdict.toUpperCase()}
        </div>
        <div style="text-align: right; font-size: 12px; color: #666666;">
          ${confidence.toFixed(1)}% confidence
        </div>
      </div>
      
      <div class="confidence-bar">
        <div class="confidence-fill ${verdict}" style="width: ${confidence}%"></div>
      </div>
      
      <div class="result-details">
        <div class="result-row">
          <span>Risk Level:</span>
          <span style="font-weight: 600; color: ${getVerdictColor(verdict)}">${getRiskLevel(verdict)}</span>
        </div>
        <div class="result-row">
          <span>Scan Time:</span>
          <span>${new Date().toLocaleTimeString()}</span>
        </div>
        ${data.language ? `
        <div class="result-row">
          <span>Detected Language:</span>
          <span>${data.language.toUpperCase()}</span>
        </div>
        ` : ''}
        ${data.translation_used ? `
        <div class="result-row">
          <span>Translation:</span>
          <span style="color: #000000;">Applied</span>
        </div>
        ` : ''}
        ${data.sender_details?.email ? `
        <div class="result-row">
          <span>Sender:</span>
          <span>${data.sender_details.email}</span>
        </div>
        ` : ''}
        ${data.subject ? `
        <div class="result-row">
          <span>Subject:</span>
          <span>${data.subject}</span>
        </div>
        ` : ''}
      </div>
      
      ${suspiciousElements.length > 0 ? `
        <div class="suspicious-elements">
          <h4><i class="fas fa-exclamation-triangle"></i> Suspicious Elements Found</h4>
          <div class="element-list">
            ${suspiciousElements.map(element => `
              <div class="element-item">
                <div class="element-type">${element.type || 'Unknown'}</div>
                <div class="element-reason">${element.reason || element.description || 'No details available'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  } catch (e) {
    container.innerHTML = `
      <div class="result-header">
        <div class="verdict unknown">
          <i class="fas fa-question-circle"></i>
          SCAN COMPLETE
        </div>
      </div>
      <div class="result-details">
        <pre style="font-size: 11px; color: #333333; white-space: pre-wrap; max-height: 200px; overflow-y: auto;">${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }
}

function getVerdictIcon(verdict) {
  switch (verdict) {
    case 'safe': return 'check-circle';
    case 'suspicious': return 'exclamation-triangle';
    case 'phishing': return 'times-circle';
    default: return 'question-circle';
  }
}

function getVerdictColor(verdict) {
  switch (verdict) {
    case 'safe': return '#006600';
    case 'suspicious': return '#cc6600';
    case 'phishing': return '#cc0000';
    default: return '#333333';
  }
}

function getRiskLevel(verdict) {
  switch (verdict) {
    case 'safe': return 'Low Risk';
    case 'suspicious': return 'Medium Risk';
    case 'phishing': return 'High Risk';
    default: return 'Unknown';
  }
}

async function getSettings() {
  const res = await chrome.runtime.sendMessage({ type: 'getSettings' });
  if (!res?.ok) throw new Error(res?.error || 'Failed to load settings');
  return res.data;
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function getPageText() {
  const tabId = await getActiveTabId();
  const res = await chrome.tabs.sendMessage(tabId, { type: 'getPageText' });
  if (!res?.ok) throw new Error(res?.error || 'Could not read page text');
  return res.data;
}

async function getSelectionText() {
  const tabId = await getActiveTabId();
  const res = await chrome.tabs.sendMessage(tabId, { type: 'getSelectionText' });
  if (!res?.ok) throw new Error(res?.error || 'Could not read selection');
  return res.data;
}

async function scanText(text, contentType = 'mixed') {
  const res = await chrome.runtime.sendMessage({ 
    type: 'scanText', 
    text, 
    language: state.language,
    contentType 
  });
  if (!res?.ok) throw new Error(res?.error || 'Scan failed');
  return res.data;
}

function updateConnectionStatus(settings) {
  const statusIndicator = $('#statusIndicator');
  const connectionStatus = $('#connectionStatus');
  
  if (state.isConnected) {
    statusIndicator.className = 'status-indicator';
    const authMode = settings.useAuthenticated ? 'Authenticated' : 'Public';
    connectionStatus.textContent = `Connected • ${authMode} Mode`;
  } else {
    statusIndicator.className = 'status-indicator offline';
    connectionStatus.textContent = 'Backend Offline';
  }
}

async function testConnection() {
  try {
    const settings = await getSettings();
    const response = await fetch(`${settings.backendUrl}/api/health`);
    state.isConnected = response.ok;
  } catch (e) {
    state.isConnected = false;
  }
}

function disableButtons(disabled) {
  $('#scanPage').disabled = disabled;
  $('#scanSelection').disabled = disabled;
  $('#scanManual').disabled = disabled;
}

function showError(message, details = '') {
  const container = $('#resultContainer');
  container.style.display = 'block';
  container.className = 'result-container fade-in';
  
  container.innerHTML = `
    <div class="result-header">
      <div class="verdict error" style="color: #cc0000;">
        <i class="fas fa-exclamation-triangle"></i>
        ERROR
      </div>
    </div>
    <div class="result-details">
      <div style="color: #cc0000; font-weight: 500; margin-bottom: 8px;">
        ${message}
      </div>
      ${details ? `
      <div style="font-size: 11px; color: #666666; padding: 8px; background: #f8f8f8; border-radius: 4px; border: 1px solid #cccccc;">
        ${details}
      </div>
      ` : ''}
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const settings = await getSettings();
    await testConnection();
    updateConnectionStatus(settings);
  } catch (e) {
    $('#connectionStatus').textContent = 'Settings unavailable';
  }

  $('#language').addEventListener('change', (e) => {
    state.language = e.target.value;
  });

  $('#scanPage').addEventListener('click', async () => {
    setStatus('Extracting page content...', 'loading');
    $('#resultContainer').style.display = 'none';
    disableButtons(true);
    
    try {
      const text = await getPageText();
      if (!text || !text.trim()) {
        throw new Error('No readable content found on this page');
      }
      
      setStatus('Analyzing content for threats...', 'loading');
      const data = await scanText(text, 'page');
      showResult(data);
      setStatus('Analysis complete', 'success');
    } catch (e) {
      const message = e?.message || 'Failed to scan page';
      setStatus(message, 'error');
      showError('Page Scan Failed', message);
    } finally {
      disableButtons(false);
    }
  });

  $('#scanSelection').addEventListener('click', async () => {
    setStatus('Reading selected text...', 'loading');
    $('#resultContainer').style.display = 'none';
    disableButtons(true);
    
    try {
      const text = await getSelectionText();
      if (!text || !text.trim()) {
        throw new Error('No text selected. Please highlight some text first.');
      }
      
      setStatus('Analyzing selected content...', 'loading');
      const data = await scanText(text, 'selection');
      showResult(data);
      setStatus('Analysis complete', 'success');
    } catch (e) {
      const message = e?.message || 'Failed to scan selection';
      setStatus(message, 'error');
      showError('Selection Scan Failed', message);
    } finally {
      disableButtons(false);
    }
  });

  $('#scanManual').addEventListener('click', async () => {
    setStatus('Processing text...', 'loading');
    $('#resultContainer').style.display = 'none';
    disableButtons(true);
    
    try {
      const text = $('#manualText').value || '';
      if (!text.trim()) {
        throw new Error('Please paste some text to analyze');
      }
      
      setStatus('Running phishing detection...', 'loading');
      const data = await scanText(text, 'email');
      showResult(data);
      setStatus('Analysis complete', 'success');
    } catch (e) {
      const message = e?.message || 'Failed to analyze text';
      setStatus(message, 'error');
      showError('Text Analysis Failed', message);
    } finally {
      disableButtons(false);
    }
  });

  $('#openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}); 