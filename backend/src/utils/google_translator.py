import os
import logging
import requests
from typing import Dict, Any, Optional, Tuple
from .language_detector import detect_language, get_language_name

logger = logging.getLogger(__name__)

try:
    from google.cloud import translate_v2 as translate
    from google.oauth2 import service_account
    GOOGLE_CLOUD_AVAILABLE = True
except ImportError as e:
    translate = None
    service_account = None
    GOOGLE_CLOUD_AVAILABLE = False
    logger.warning("Google Cloud Translate not available: %s", e)

# Google Translate configuration
GOOGLE_TRANSLATE_API_KEY = os.environ.get('GOOGLE_TRANSLATE_API_KEY')
GOOGLE_TRANSLATE_PROJECT_ID = os.environ.get('GOOGLE_TRANSLATE_PROJECT_ID')
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')

class GoogleTranslator:
    """Google Translate API integration for email translation"""
    
    def __init__(self):
        self.client = None
        self.api_key = None
        self.is_configured = False
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Translate client"""
        # First try API key with direct HTTP approach
        api_key = GOOGLE_TRANSLATE_API_KEY or os.environ.get('GOOGLE_API_KEY')
        if api_key:
            try:
                # Test the API key with a simple request
                self._test_api_key(api_key)
                self.client = 'http_client'  # Use string to indicate HTTP client
                self.api_key = api_key
                self.is_configured = True
                logger.info("Google Translate initialized with API key (HTTP)")
                return
            except Exception as e:
                logger.warning(f"API key test failed: {str(e)}")
        
        # Fallback to Google Cloud client library
        if not GOOGLE_CLOUD_AVAILABLE:
            logger.warning("Google Cloud Translate library not installed")
            return
            
        try:
            # Try different authentication methods
            if GOOGLE_APPLICATION_CREDENTIALS and os.path.exists(GOOGLE_APPLICATION_CREDENTIALS):
                # Use service account file
                credentials = service_account.Credentials.from_service_account_file(
                    GOOGLE_APPLICATION_CREDENTIALS
                )
                self.client = translate.Client(credentials=credentials)
                logger.info("Google Translate initialized with service account file")
                
            elif GOOGLE_TRANSLATE_PROJECT_ID:
                # Use default credentials with project ID
                self.client = translate.Client(project=GOOGLE_TRANSLATE_PROJECT_ID)
                logger.info("Google Translate initialized with project ID")
                
            else:
                # Try default credentials
                self.client = translate.Client()
                logger.info("Google Translate initialized with default credentials")
            
            self.is_configured = True
            
        except Exception as e:
            logger.error(f"Failed to initialize Google Translate client: {str(e)}")
            self.client = None
            self.is_configured = False
    
    def _test_api_key(self, api_key):
        """Test if the API key works"""
        url = f"https://translation.googleapis.com/language/translate/v2/detect?key={api_key}"
        response = requests.post(url, json={
            'q': 'Hello world'
        }, timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"API key test failed: {response.status_code} - {response.text}")
        
        return True
    
    def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect language using Google Translate API with fallback to langdetect
        
        Args:
            text (str): Text to analyze
            
        Returns:
            Dict containing language detection results
        """
        result = {
            'language': 'en',  # Default fallback
            'confidence': 0.5,
            'source': 'fallback',
            'language_name': 'English'
        }
        
        if not self.is_configured or not self.client:
            # Use fallback language detection
            detected_lang = detect_language(text)
            result.update({
                'language': detected_lang,
                'source': 'langdetect_fallback',
                'language_name': get_language_name(detected_lang)
            })
            return result
        
        try:
            if self.client == 'http_client':
                # Use HTTP API
                detection = self._detect_language_http(text)
            else:
                # Use Google Cloud client
                detection = self.client.detect_language(text)
            
            if detection and 'language' in detection:
                confidence = detection.get('confidence', 0.5)
                language_code = detection['language']
                
                result.update({
                    'language': language_code,
                    'confidence': confidence,
                    'source': 'google_translate',
                    'language_name': get_language_name(language_code)
                })
                
                logger.info(f"Google Translate detected language: {language_code} (confidence: {confidence})")
                
        except Exception as e:
            logger.error(f"Google Translate detection failed: {str(e)}")
            # Fallback to langdetect
            detected_lang = detect_language(text)
            result.update({
                'language': detected_lang,
                'source': 'langdetect_fallback',
                'language_name': get_language_name(detected_lang)
            })
        
        return result
    
    def _detect_language_http(self, text: str) -> Dict[str, Any]:
        """Detect language using HTTP API"""
        url = f"https://translation.googleapis.com/language/translate/v2/detect?key={self.api_key}"
        response = requests.post(url, json={'q': text}, timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"Detection failed: {response.status_code} - {response.text}")
        
        data = response.json()
        if 'data' in data and 'detections' in data['data'] and data['data']['detections']:
            detection = data['data']['detections'][0][0]
            return {
                'language': detection.get('language', 'en'),
                'confidence': detection.get('confidence', 0.5)
            }
        
        return {'language': 'en', 'confidence': 0.5}
    
    def _translate_text_http(self, text: str, source_language: str, target_language: str) -> Dict[str, Any]:
        """Translate text using HTTP API"""
        url = f"https://translation.googleapis.com/language/translate/v2?key={self.api_key}"
        
        data = {
            'q': text,
            'target': target_language,
            'format': 'text'
        }
        
        if source_language:
            data['source'] = source_language
        
        response = requests.post(url, json=data, timeout=30)
        
        if response.status_code != 200:
            raise Exception(f"Translation failed: {response.status_code} - {response.text}")
        
        result = response.json()
        if 'data' in result and 'translations' in result['data'] and result['data']['translations']:
            translation = result['data']['translations'][0]
            return {
                'translatedText': translation.get('translatedText', text),
                'detectedSourceLanguage': translation.get('detectedSourceLanguage')
            }
        
        return {'translatedText': text}
    
    def translate_to_english(self, text: str, source_language: Optional[str] = None) -> Dict[str, Any]:
        """
        Translate text to English
        
        Args:
            text (str): Text to translate
            source_language (Optional[str]): Source language code. If None, auto-detect
            
        Returns:
            Dict containing translation results
        """
        result = {
            'translated_text': text,  # Default to original text
            'source_language': source_language or 'en',
            'target_language': 'en',
            'translation_used': False,
            'confidence': 1.0,
            'error': None
        }
        
        # Skip translation if already English or no text
        if not text or not text.strip():
            return result
            
        # Detect language if not provided
        if not source_language:
            detection_result = self.detect_language(text)
            source_language = detection_result['language']
            result['source_language'] = source_language
            
        # Skip translation if already English
        if source_language == 'en':
            logger.info("Text is already in English, skipping translation")
            return result
        
        if not self.is_configured or not self.client:
            logger.warning("Google Translate not configured, returning original text")
            result['error'] = "Translation service not available"
            return result
            
        try:
            # Perform translation
            if self.client == 'http_client':
                # Use HTTP API
                translation = self._translate_text_http(text, source_language, 'en')
            else:
                # Use Google Cloud client
                translation = self.client.translate(
                    text,
                    target_language='en',
                    source_language=source_language
                )
            
            if translation and 'translatedText' in translation:
                result.update({
                    'translated_text': translation['translatedText'],
                    'translation_used': True,
                    'confidence': 0.9  # Google Translate is generally reliable
                })
                
                logger.info(f"Successfully translated from {source_language} to English")
                
        except Exception as e:
            logger.error(f"Translation failed: {str(e)}")
            result['error'] = f"Translation failed: {str(e)}"
            
        return result
    
    def get_supported_languages(self) -> Dict[str, str]:
        """
        Get list of supported languages
        
        Returns:
            Dict mapping language codes to language names
        """
        if not self.is_configured or not self.client:
            # Return basic supported languages from langdetect
            return {
                'en': 'English',
                'es': 'Spanish', 
                'fr': 'French',
                'de': 'German',
                'zh': 'Chinese',
                'ru': 'Russian',
                'ar': 'Arabic',
                'pt': 'Portuguese',
                'it': 'Italian',
                'ja': 'Japanese',
                'ko': 'Korean',
                'nl': 'Dutch',
                'hi': 'Hindi',
                'tr': 'Turkish',
                'pl': 'Polish',
                'vi': 'Vietnamese',
                'th': 'Thai',
                'sv': 'Swedish',
                'no': 'Norwegian',
                'fi': 'Finnish'
            }
        
        try:
            if self.client == 'http_client':
                # Use HTTP API
                return self._get_languages_http()
            else:
                # Use Google Cloud client
                languages = self.client.get_languages(target_language='en')
                return {lang['language']: lang['name'] for lang in languages}
        except Exception as e:
            logger.error(f"Failed to get supported languages: {str(e)}")
            return {'en': 'English'}  # Minimal fallback
    
    def _get_languages_http(self) -> Dict[str, str]:
        """Get supported languages using HTTP API"""
        url = f"https://translation.googleapis.com/language/translate/v2/languages?key={self.api_key}&target=en"
        response = requests.get(url, timeout=10)
        
        if response.status_code != 200:
            raise Exception(f"Failed to get languages: {response.status_code} - {response.text}")
        
        data = response.json()
        if 'data' in data and 'languages' in data['data']:
            return {lang['language']: lang['name'] for lang in data['data']['languages']}
        
        return {'en': 'English'}

# Global translator instance
translator = GoogleTranslator()

def translate_email_to_english(email_text: str, user_selected_language: Optional[str] = None) -> Tuple[str, Dict[str, Any]]:
    """
    Translate email text to English for ML model analysis
    
    Args:
        email_text (str): Email content to translate
        user_selected_language (Optional[str]): User-specified language code
        
    Returns:
        Tuple of (translated_text, translation_info)
    """
    if not email_text or not email_text.strip():
        return email_text, {'translation_used': False, 'source_language': 'en'}
    
    # Use user-selected language or auto-detect
    source_language = user_selected_language if user_selected_language != 'auto' else None
    
    # Translate text
    translation_result = translator.translate_to_english(email_text, source_language)
    
    return translation_result['translated_text'], translation_result

def detect_email_language(email_text: str) -> Dict[str, Any]:
    """
    Detect the language of email text
    
    Args:
        email_text (str): Email content to analyze
        
    Returns:
        Dict containing language detection results
    """
    return translator.detect_language(email_text)

def get_supported_languages() -> Dict[str, str]:
    """
    Get list of supported languages for translation
    
    Returns:
        Dict mapping language codes to language names
    """
    return translator.get_supported_languages() 