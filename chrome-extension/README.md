# Phishing Detector Chrome Extension

A professional, industrial-grade Chrome extension that integrates with your Phishing Detector backend to analyze web content, selected text, and pasted content for phishing threats.

## 🚀 Features

### Core Functionality
- **Page Analysis**: Scan entire web pages for phishing indicators
- **Selection Scanning**: Right-click context menu to scan highlighted text
- **Manual Text Analysis**: Paste and analyze email content or messages
- **Multi-language Support**: Auto-detection and manual language selection
- **Real-time Connection Status**: Live backend connectivity monitoring

### Professional UI/UX
- **Industrial Design**: Clean, modern interface with gradient backgrounds
- **Responsive Layout**: Optimized for various screen sizes without content cutoff
- **Visual Feedback**: Loading spinners, status indicators, and progress bars
- **Detailed Results**: Comprehensive threat analysis with confidence scores
- **Suspicious Elements**: Detailed breakdown of detected threats
- **Connection Testing**: Built-in backend connectivity verification

### Security & Authentication
- **Public Scans**: Anonymous scanning without authentication
- **Authenticated Mode**: Save results to account history with JWT tokens
- **Secure Storage**: Chrome sync storage for settings and credentials
- **CORS Compatible**: Works with existing backend CORS configuration

## 📋 Prerequisites

- **Backend Server**: Phishing Detector backend running (default: `http://127.0.0.1:5000`)
- **Browser**: Google Chrome or Chromium-based browser
- **Network**: Backend accessible from browser (check Windows firewall)

## 🔧 Windows Installation

### 1. Load Extension (Developer Mode)
```
1. Open Chrome → Navigate to chrome://extensions/
2. Enable "Developer mode" toggle (top-right corner)
3. Click "Load unpacked" button
4. Select folder: phishing-detector/chrome-extension
5. Extension icon appears in toolbar → Pin for easy access
```

### 2. Configure Backend Connection
```
1. Click extension icon → Settings (gear icon)
2. Set "Backend Server URL": http://127.0.0.1:5000
3. Test connection using "Test Connection" button
4. Verify green status indicator shows "Backend is online"
```

### 3. Optional: Enable Authentication
```
1. In web app: Login → Open DevTools (F12)
2. Application tab → Local Storage → Copy auth token
3. Extension Settings → Enable "authenticated scans"
4. Paste JWT token → Save configuration
```

## 🎯 Usage Guide

### Quick Scanning
- **Popup Interface**: Click extension icon for main interface
- **Page Scan**: Extract and analyze entire page content
- **Selection Scan**: Highlight text → click "Selection" button
- **Context Menu**: Right-click selected text → "Scan selected text for phishing"

### Manual Analysis
- **Text Input**: Paste email content, messages, or suspicious text
- **Language Selection**: Choose specific language or auto-detect
- **Detailed Results**: View threat level, confidence, and suspicious elements

### Result Interpretation
- **Risk Levels**: Low (Safe) | Medium (Suspicious) | High (Phishing)
- **Confidence Scores**: ML model confidence percentage
- **Suspicious Elements**: Detailed breakdown of detected threats
- **Scan Metadata**: Language detection, translation status, timestamps

## ⚙️ Configuration Options

### Backend Settings
- **Server URL**: Full backend URL with protocol
- **Connection Testing**: Real-time connectivity verification
- **Response Time Monitoring**: Performance metrics display

### Authentication
- **Public Mode**: Anonymous scans (no history saved)
- **Authenticated Mode**: Requires JWT token from web app
- **Token Management**: Secure storage and validation

### Language Support
- **Auto-detection**: Automatic language identification
- **Manual Selection**: English, Sinhala, Tamil, Hindi, Spanish, French
- **Translation Integration**: Seamless backend translation handling

## 🔍 API Integration

### Endpoints Used
```javascript
// Public scanning
POST /api/scan
{
  "emailText": "content to analyze",
  "language": "auto"
}

// Authenticated scanning
POST /api/scan/auth
Headers: { "Authorization": "Bearer <jwt_token>" }
{
  "emailText": "content to analyze", 
  "language": "auto"
}

Features
- Scan current page text
- Scan selected text via context menu or popup
- Paste text and scan
- Configure backend URL and optional JWT for authenticated scans

Prerequisites
- Backend running locally (default): http://127.0.0.1:5000
  - CORS for /api/* is already enabled in the Flask app
- Google Chrome (or Chromium-based browser)

Windows Installation (Developer Mode)
1. Open Chrome → visit `chrome://extensions/`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select this folder: `phishing-detector/chrome-extension`
5. The extension icon will appear in the toolbar. Pin it for quick access.

Configure Backend
1. Click the extension icon → Settings
2. Set Backend URL, e.g. `http://127.0.0.1:5000`
3. Optional: Toggle authenticated scans and paste your JWT token (Bearer token)

Usage
- Popup → Scan page: extracts visible text and sends to `/api/scan`
- Popup → Scan selection: scans highlighted text on the page
- Right-click selected text → "Scan selected text for phishing"
- Paste text into the popup and click "Scan pasted text"

Notes
- The backend expects `{ emailText, language }` as in the web app. The extension uses the same payload.
- Large pages are truncated to avoid huge payloads.
- If you use authenticated scans, ensure the token is valid and not expired.

Troubleshooting
- If requests fail, verify the backend is running and accessible at the configured URL.
- Check DevTools → Extensions → Service Worker console for logs.
- Ensure Windows firewall is not blocking `localhost:5000`. 