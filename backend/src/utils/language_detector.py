from langdetect import detect, LangDetectException

def detect_language(text):
    """
    Detect the language of the provided text.
    
    Args:
        text (str): The text to analyze
        
    Returns:
        str: ISO 639-1 language code (e.g., 'en' for English)
    """
    try:
        # Clean the text a bit before detection
        clean_text = text.strip()
        
        # Ensure we have enough text to make a reliable detection
        if len(clean_text) < 20:
            return 'en'  # Default to English for very short texts
        
        # Detect the language
        lang_code = detect(clean_text)
        return lang_code
    except LangDetectException:
        # Return English as a fallback
        return 'en'
    except Exception as e:
        print(f"Error detecting language: {str(e)}")
        return 'en'  # Default to English on error

def get_language_name(lang_code):
    """
    Convert language code to full name.
    
    Args:
        lang_code (str): ISO 639-1 language code
        
    Returns:
        str: Full language name
    """
    language_map = {
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
    
    return language_map.get(lang_code, f'Unknown ({lang_code})') 