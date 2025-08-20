# Google Translate API Integration Setup

This guide explains how to set up Google Translate API for multilingual email phishing detection.

## Overview

The system now supports automatic language detection and translation of non-English emails before ML model analysis. This enables:

- Auto-detection of email language using Google Translate API (with langdetect fallback)
- Automatic translation of non-English emails to English for ML analysis
- Display of translation information in scan results
- User manual language selection override

## Features

### Language Detection
- **Primary**: Google Translate API for accurate detection
- **Fallback**: `langdetect` library when Google Translate is unavailable
- **User Override**: Manual language selection in the UI

### Translation
- Automatic translation to English for ML model processing
- Translation quality scoring
- Error handling with fallback to original text
- Translation information displayed in results

### Supported Languages
The system dynamically loads supported languages from Google Translate API. Fallback languages include:
- English (en)
- Spanish (es)  
- French (fr)
- German (de)
- Chinese (zh)
- Russian (ru)
- Arabic (ar)
- Portuguese (pt)
- Italian (it)
- Japanese (ja)
- Korean (ko)
- Dutch (nl)
- Hindi (hi)
- Turkish (tr)
- And many more...

## Setup Instructions

### 1. Google Cloud Project Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Cloud Translation API:
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Translation API"
   - Click "Enable"

### 2. Authentication Setup

Choose one of the following authentication methods:

#### Option A: Service Account (Recommended for Production)

1. Create a service account:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Give it a name and description
   - Click "Create and Continue"

2. Assign permissions:
   - Add role: "Cloud Translation API User"
   - Click "Continue" and "Done"

3. Create and download key:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Download the file

4. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
   ```

#### Option B: API Key (Simple Setup)

1. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key

2. Restrict the API key (recommended):
   - Click on the API key to edit
   - Under "API restrictions", select "Restrict key"
   - Choose "Cloud Translation API"
   - Save

3. Set environment variable:
   ```bash
   export GOOGLE_TRANSLATE_API_KEY="your-api-key-here"
   ```

### 3. Environment Configuration

Add these environment variables to your `.env` file:

```env
# Google Translate Configuration
GOOGLE_TRANSLATE_API_KEY=your-api-key-here                           # If using API key
GOOGLE_TRANSLATE_PROJECT_ID=your-project-id                          # If using project-based auth
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json     # If using service account

# Optional: Existing Google API key can be used
GOOGLE_API_KEY=your-existing-google-api-key                          # Alternative to GOOGLE_TRANSLATE_API_KEY
```

### 4. Install Dependencies

The required dependency is already added to `requirements.txt`:

```bash
pip install google-cloud-translate==3.11.3
```

### 5. Test the Integration

1. Start the backend server:
   ```bash
   cd backend
   python app.py
   ```

2. Test language detection endpoint:
   ```bash
   curl http://localhost:5000/api/languages
   ```

3. Test with a non-English email through the frontend scanner

## API Endpoints

### Get Supported Languages
```
GET /api/languages
```

**Response:**
```json
{
  "languages": {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    // ... more languages
  },
  "count": 109
}
```

## Frontend Integration

### New Components

- **LanguageInfo Component**: Displays language detection and translation information
- **Dynamic Language Loading**: Fetches supported languages from backend
- **Translation Status**: Shows when emails were translated

### Updated Pages

- **ScannerPage**: Enhanced with dynamic language selection and translation info
- **PublicScannerPage**: Same enhancements as ScannerPage
- **QuickScanPanel**: Basic language selection (simplified)

### API Service

New method added to `frontend/src/services/api.js`:
```javascript
getSupportedLanguages: async () => {
  // Fetches supported languages from backend
}
```

## Database Schema Updates

Scan documents now include translation information:

```javascript
{
  // ... existing fields
  "language": "es",                    // Detected language code
  "translated_text": "Hello...",      // Translated text (if translation was used)
  "translation_info": {               // Translation metadata
    "translation_used": true,
    "source_language": "es",
    "confidence": 0.9,
    "error": null
  }
}
```

## Error Handling

The system includes comprehensive error handling:

1. **Google Translate Unavailable**: Falls back to `langdetect`
2. **Translation Failure**: Uses original text with error message
3. **Network Issues**: Graceful degradation to manual language selection
4. **Invalid Languages**: Default to English

## Usage Examples

### Auto-Detection and Translation Flow

1. User pastes Spanish email content
2. System detects language as "es" (Spanish)
3. Email is translated to English
4. ML model analyzes translated text
5. Results show original language and translation info

### Manual Language Selection

1. User selects specific language from dropdown
2. System uses selected language for translation
3. Skips auto-detection step
4. Processes as above

## Troubleshooting

### Common Issues

1. **"Google Cloud Translate not available"**
   - Check if `google-cloud-translate` is installed
   - Verify environment variables

2. **"Translation service not available"**
   - Check API key/credentials
   - Verify project has Translation API enabled
   - Check network connectivity

3. **"Failed to get supported languages"**
   - System falls back to default language list
   - Check API quotas and billing

### Debugging

Enable debug logging:
```python
import logging
logging.getLogger('google').setLevel(logging.DEBUG)
```

## Cost Considerations

- Google Translate API charges per character
- Current pricing: ~$20 per 1M characters
- Consider implementing caching for repeated translations
- Monitor usage in Google Cloud Console

## Security Notes

- Store service account keys securely
- Use IAM roles with minimal required permissions
- Restrict API keys to specific services
- Never commit credentials to version control
- Consider using Google Cloud Secret Manager for production

## Performance Optimization

- Translation adds latency to email analysis
- Consider implementing:
  - Translation caching
  - Async translation for non-critical paths
  - Language detection confidence thresholds
  - Batch translation for multiple emails 