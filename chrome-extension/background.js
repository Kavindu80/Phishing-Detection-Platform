// Background service worker (Manifest V3)

const DEFAULT_SETTINGS = {
  backendUrl: 'http://127.0.0.1:5000',
  useAuthenticated: false,
  authToken: ''
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'scan-selection',
    title: 'Scan selected text for phishing',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'scan-selection') {
    try {
      const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || ''
      });
      const text = (result || '').trim();
      if (!text) {
        notify('No text selected to scan.');
        return;
      }
      const scan = await scanTextWithBackend(text, 'auto');
      notify(formatScanSummary(scan));
    } catch (e) {
      notify(`Scan failed: ${e?.message || e}`);
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === 'scanText') {
        const res = await scanTextWithBackend(message.text || '', message.language || 'auto');
        sendResponse({ ok: true, data: res });
        return;
      }
      if (message?.type === 'getSettings') {
        const settings = await getSettings();
        sendResponse({ ok: true, data: settings });
        return;
      }
      sendResponse({ ok: false, error: 'Unknown message type' });
    } catch (err) {
      sendResponse({ ok: false, error: err?.message || String(err) });
    }
  })();
  return true; // keep channel open for async
});

async function getSettings() {
  const stored = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...stored };
}

function formatEmailContent(text, contentType = 'mixed') {
  /**
   * Format text content to be better processed by the backend email parser
   * 
   * @param {string} text - Raw text content
   * @param {string} contentType - Type of content: 'email', 'page', 'selection', 'mixed'
   * @returns {string} - Formatted email-like content
   */
  
  if (!text || !text.trim()) return text;
  
  // Check if it already looks like a proper email (has headers)
  if (text.includes('From:') && text.includes('Subject:')) {
    return text; // Already formatted
  }
  
  // Extract potential subject from the beginning of the text
  const lines = text.split('\n').filter(line => line.trim());
  let subject = '';
  let body = text;
  
  // Try to identify a subject line
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    
    // If first line looks like a subject (short, no URLs, not too long)
    if (firstLine.length < 150 && 
        !firstLine.includes('http') && 
        !firstLine.includes('@') &&
        firstLine.length > 5) {
      subject = firstLine;
      body = lines.slice(1).join('\n').trim();
    } else {
      // Use a generic subject based on content type
      switch (contentType) {
        case 'page':
          subject = 'Web Page Content Analysis';
          break;
        case 'selection':
          subject = 'Selected Text Analysis';
          break;
        case 'email':
          subject = 'Email Content Analysis';
          break;
        default:
          subject = 'Content Analysis';
      }
    }
  }
  
  // Create a properly formatted email-like structure
  const timestamp = new Date().toUTCString();
  const formattedEmail = `From: extension@phishguard.local
To: scanner@phishguard.local
Subject: ${subject}
Date: ${timestamp}
Content-Type: text/plain; charset=utf-8

${body}`;

  return formattedEmail;
}

async function scanTextWithBackend(emailText, language = 'auto', contentType = 'mixed') {
  if (!emailText || !emailText.trim()) throw new Error('Empty text');
  
  const settings = await getSettings();
  const base = (settings.backendUrl || '').replace(/\/$/, '');
  const endpoint = settings.useAuthenticated ? '/api/scan/auth' : '/api/scan';
  const url = `${base}${endpoint}`;

  // Format the content for better backend processing
  const formattedContent = formatEmailContent(emailText, contentType);

  const headers = { 'Content-Type': 'application/json' };
  if (settings.useAuthenticated && settings.authToken) {
    headers['Authorization'] = `Bearer ${settings.authToken}`;
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      emailText: formattedContent, 
      language 
    })
  });
  
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let errorMessage = `Backend ${resp.status}`;
    
    try {
      const errorData = JSON.parse(text);
      errorMessage += `: ${errorData.error || text}`;
    } catch {
      errorMessage += `: ${text || 'request failed'}`;
    }
    
    throw new Error(errorMessage);
  }
  
  return resp.json();
}

function notify(message) {
  // Fallback simple notification via badge + popup console log
  try {
    if (typeof message !== 'string') message = JSON.stringify(message);
  } catch (_) {}
  chrome.action.setBadgeBackgroundColor({ color: '#000000' });
  chrome.action.setBadgeText({ text: '!' });
  console.log('[PhishGuard Scanner]', message);
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
}

function formatScanSummary(result) {
  try {
    const verdict = result?.verdict || result?.classification || 'unknown';
    const confidence = result?.confidence != null ? `${Number(result.confidence).toFixed(1)}%` : 'n/a';
    return `Verdict: ${verdict} (confidence: ${confidence})`;
  } catch (e) {
    return 'Scan completed';
  }
} 