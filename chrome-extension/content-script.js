// Content script to provide page text and selection to the extension

function getPageText(limit = 50000) {
  try {
    // Try to get meaningful content from the page
    let text = '';
    
    // Check if this is an email page (Gmail, Outlook, etc.)
    if (isEmailPage()) {
      text = extractEmailContent();
    } else {
      // Get general page content
      text = extractGeneralContent();
    }
    
    // Clean and limit the text
    text = cleanText(text);
    if (text.length > limit) {
      text = text.slice(0, limit) + '\n\n[Content truncated...]';
    }
    
    return text;
  } catch (e) {
    console.error('Error extracting page text:', e);
    return document.body?.innerText || '';
  }
}

function getSelectionText(limit = 50000) {
  try {
    const text = window.getSelection()?.toString() || '';
    const cleaned = cleanText(text);
    if (cleaned.length > limit) {
      return cleaned.slice(0, limit) + '\n\n[Selection truncated...]';
    }
    return cleaned;
  } catch (e) {
    console.error('Error extracting selection text:', e);
    return '';
  }
}

function isEmailPage() {
  // Check if we're on a known email service
  const hostname = window.location.hostname.toLowerCase();
  const emailDomains = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'mail.yahoo.com'];
  
  if (emailDomains.some(domain => hostname.includes(domain))) {
    return true;
  }
  
  // Check for email-like content structure
  const emailIndicators = [
    '[role="main"]', // Gmail main content
    '.ii.gt', // Gmail email content
    '[data-testid="message-body"]', // Outlook
    '.msg-body', // Yahoo Mail
    '[aria-label*="message"]',
    '[aria-label*="email"]'
  ];
  
  return emailIndicators.some(selector => document.querySelector(selector));
}

function extractEmailContent() {
  // Gmail specific selectors
  const gmailSelectors = [
    '.ii.gt', // Email body
    '.go .ii', // Email content area
    '[role="listitem"] .ii.gt', // Individual email in conversation
    '.adn.ads .ii.gt' // Email body in conversation view
  ];
  
  // Outlook specific selectors
  const outlookSelectors = [
    '[data-testid="message-body"]',
    '.rps_d41d .rps_d41d',
    '[role="region"][aria-label*="message"]'
  ];
  
  // Try Gmail first
  for (const selector of gmailSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return extractElementContent(element);
    }
  }
  
  // Try Outlook
  for (const selector of outlookSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return extractElementContent(element);
    }
  }
  
  // Fallback to general email content
  const emailContainer = document.querySelector('[role="main"], .email-content, .message-body, .mail-content');
  if (emailContainer) {
    return extractElementContent(emailContainer);
  }
  
  return extractGeneralContent();
}

function extractGeneralContent() {
  // Get main content areas
  const contentSelectors = [
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    'article',
    '.post-content',
    '.entry-content'
  ];
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      return extractElementContent(element);
    }
  }
  
  // Fallback to body content, excluding navigation and footer
  const excludeSelectors = 'nav, header, footer, .nav, .header, .footer, .sidebar, .ads, .advertisement';
  const body = document.body.cloneNode(true);
  
  // Remove excluded elements
  body.querySelectorAll(excludeSelectors).forEach(el => el.remove());
  
  return body.innerText || body.textContent || '';
}

function extractElementContent(element) {
  if (!element) return '';
  
  // Get text content but preserve some structure
  let text = '';
  
  // Try to extract subject/title first
  const titleSelectors = [
    'h1', 'h2', '.subject', '.title', '[data-legacy-thread-id] h2',
    '.hP', // Gmail subject
    '[data-testid="message-subject"]' // Outlook subject
  ];
  
  for (const selector of titleSelectors) {
    const titleEl = element.querySelector(selector) || document.querySelector(selector);
    if (titleEl && titleEl.textContent.trim()) {
      text += `Subject: ${titleEl.textContent.trim()}\n\n`;
      break;
    }
  }
  
  // Get the main content
  const content = element.innerText || element.textContent || '';
  text += content;
  
  return text;
}

function cleanText(text) {
  if (!text) return '';
  
  // Remove excessive whitespace
  text = text.replace(/\s+/g, ' ');
  
  // Remove common unwanted patterns
  text = text.replace(/\[image:.*?\]/gi, '[IMAGE]');
  text = text.replace(/\[attachment:.*?\]/gi, '[ATTACHMENT]');
  
  // Normalize line breaks
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // Remove excessive line breaks
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return text.trim();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'getPageText') {
    try {
      const text = getPageText();
      sendResponse({ ok: true, data: text });
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
    return true;
  }
  if (message?.type === 'getSelectionText') {
    try {
      const text = getSelectionText();
      sendResponse({ ok: true, data: text });
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
    return true;
  }
}); 