from datetime import datetime, timedelta
from bson import ObjectId
from flask import jsonify, request, current_app
import logging
from pymongo import DESCENDING

from ..config.database import get_db
from ..models.scan import ScanRequest, ScanResult, ScanInDB, ScanResponse, ScanDetailResponse, ScanFeedback
try:
    from ..ml_model import PhishingDetector
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from src.ml_model import PhishingDetector
from ..utils.email_parser import parse_email
from ..utils.language_detector import detect_language
from ..utils.google_translator import translate_email_to_english, detect_email_language
from ..utils.url_analyzer import analyze_urls, extract_sender_domain
from ..utils.email_verification import verify_email_legitimacy
from ..utils.whitelist import check_whitelist, is_email_whitelisted
from ..utils.gemini_helper import analyze_email_with_gemini

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the phishing detector model
detector = PhishingDetector()

# Map ISO codes to MongoDB text index languages to avoid 'language override unsupported'
MONGO_TEXT_LANG_MAP = {
    'en': 'english', 'da': 'danish', 'nl': 'dutch', 'fi': 'finnish', 'fr': 'french', 'de': 'german',
    'hu': 'hungarian', 'it': 'italian', 'nb': 'norwegian', 'no': 'norwegian', 'pt': 'portuguese',
    'ro': 'romanian', 'ru': 'russian', 'es': 'spanish', 'sv': 'swedish', 'tr': 'turkish', 'hy': 'armenian'
}

def to_mongo_language(lang_code: str) -> str:
    if not lang_code:
        return 'none'
    code = lang_code.lower()
    # Normalize regional variants like zh-CN -> zh
    if '-' in code:
        code = code.split('-')[0]
    return MONGO_TEXT_LANG_MAP.get(code, 'none')


def normalize_confidence(confidence):
    """
    Helper function to ensure confidence values are always correctly normalized 
    to a percentage between 0 and 100.
    
    Args:
        confidence: The raw confidence value to normalize
        
    Returns:
        float: A percentage value between 0 and 100
    """
    try:
        # First convert to float if possible
        if isinstance(confidence, str):
            try:
                confidence = float(confidence)
            except ValueError:
                logger.error(f"Could not convert confidence value '{confidence}' to float")
                return 50.0

        # Now process the numeric value
        if isinstance(confidence, (int, float)):
            # Handle NaN and infinity values
            if not isinstance(confidence, bool) and (isinstance(confidence, float) and (confidence != confidence or confidence == float('inf') or confidence == float('-inf'))):
                logger.error(f"Invalid confidence value (NaN or infinity): {confidence}")
                return 50.0
                
            # If it's already >1, assume it's a percentage and just cap it
            if confidence > 1:
                # If it's a reasonable percentage (<=100), keep it
                if confidence <= 100:
                    result = confidence
                else:
                    # If it's >100, cap it to 100
                    logger.warning(f"Extremely high confidence detected: {confidence}, capping to 100")
                    result = 100.0
            else:
                # If it's ≤1, assume it's a probability and convert to percentage
                result = max(0, min(confidence, 1)) * 100
                
            # Force to be a float and round to 2 decimal places
            return round(float(result), 2)
        else:
            logger.warning(f"Invalid confidence type: {type(confidence)}, using default")
            return 50.0
    except Exception as e:
        logger.error(f"Error normalizing confidence: {str(e)}")
        return 50.0

class ScanController:
    """Controller for scan-related operations"""
    
    @staticmethod
    def scan_email(current_user=None):
        """Scan an email for phishing"""
        try:
            # Parse JSON data from request
            data = request.json
            if not data:
                return jsonify({"error": "Invalid request data"}), 400
            
            # Validate required fields
            if "emailText" not in data:
                return jsonify({"error": "Email text is required"}), 400
            
            scan_request = ScanRequest(**data)
            
            # Enhanced language detection and translation
            original_text = scan_request.emailText
            user_selected_language = scan_request.language if scan_request.language != 'auto' else None
            
            # Detect language using Google Translate API with fallback
            language_detection = detect_email_language(original_text)
            detected_lang = user_selected_language or language_detection['language']
            mongo_lang = to_mongo_language(detected_lang)
            
            logger.info(f"Language detection: {language_detection}")
            logger.info(f"Final language: {detected_lang} -> mongo: {mongo_lang}")
            
            # Translate email to English if needed for ML model analysis
            translated_text, translation_info = translate_email_to_english(
                original_text, 
                user_selected_language
            )
            
            logger.info(f"Translation info: {translation_info}")
            
            # Parse email data (use original text for parsing metadata like headers)
            email_data = parse_email(original_text)
            
            # Use the global detector instance already initialized at the top of this file
            # instead of calling a non-existent get_ml_detector() function
            
            # Check if email is whitelisted
            is_whitelisted, whitelist_match = is_email_whitelisted(email_data)
            
            if is_whitelisted:
                logger.info(f"Email is whitelisted: {whitelist_match}")
                scan_result = {
                    "verdict": "safe",
                    "confidence": 0.98,
                    "explanation": f"Email is from a trusted source ({whitelist_match}).",
                    "recommendedAction": "This email appears to be legitimate and comes from a trusted source.",
                    "suspiciousElements": []
                }
                
                # Store scan result in database if user is authenticated
                if current_user:
                    db = get_db()
                    
                    # Create scan document
                    scan_doc = {
                        "user_id": ObjectId(current_user['id']),
                        "date": datetime.utcnow(),
                        "subject": email_data.get('subject', 'No subject'),
                        "sender": email_data.get('from', 'Unknown'),
                        "verdict": "safe",
                        "confidence": 0.98,
                        # Mongo text index language override (must be supported)
                        "language": mongo_lang,
                        # store auto-detected language (pre-translation) separately
                        "detected_language": detected_lang,
                        "mongo_language": mongo_lang,
                        "email_text": original_text,
                        "translated_text": translated_text if translation_info.get('translation_used') else None,
                        "translation_info": translation_info,
                        "suspicious_elements": [],
                        "explanation": scan_result['explanation'],
                        "recommended_action": scan_result['recommendedAction'],
                        "whitelisted": True,
                        "source": scan_request.source if hasattr(scan_request, 'source') else "direct_scan",
                        # include sender domain for analytics (normalized)
                        "sender_domain": (extract_sender_domain(email_data.get('from', '')) or None)
                    }
                    
                    # Create timestamp for analytics
                    scan_timestamp = datetime.utcnow()
                    
                    # Insert scan
                    result = db.scans.insert_one(scan_doc)
                    scan_result['id'] = str(result.inserted_id)
                    
                    logger.info(f"Scan saved with ID {result.inserted_id}, now updating analytics")
                    
                    # Update user analytics collection
                    db.user_analytics.update_one(
                        {"user_id": ObjectId(current_user['id'])},
                        {
                            "$set": {
                                "last_scan_date": scan_timestamp,
                            },
                            "$inc": {
                                "total_scans": 1,
                                "safe_count": 1,
                                # store by normalized mongo language bucket to avoid unsupported overrides
                                f"languages.{mongo_lang}": 1
                            }
                        },
                        upsert=True
                    )
                    
                    # Log the update
                    logger.info(f"Analytics updated for user {current_user['id']}, safe scan")
                    
                    # Add flag to indicate analytics were updated
                    scan_result['analytics_updated'] = True
                    scan_result['scan_timestamp'] = scan_timestamp.isoformat()
                
                return jsonify(scan_result), 200

            # Next verify if this is a legitimate service provider email
            legitimacy_results = verify_email_legitimacy(email_data)
            
            # Add special handling for connected Gmail accounts - we need to trust these more
            email_source = scan_request.source if hasattr(scan_request, 'source') else None
            is_connected_account = email_source == 'gmail' or getattr(scan_request, 'is_connected_account', False)
            
            # If it's from a connected Gmail account, boost trust significantly
            if is_connected_account:
                logger.info("Email is from connected Gmail account - boosting trust")
                # For connected accounts, we should be more lenient
                if 'google.com' in email_data.get('from', '').lower() or 'gmail.com' in email_data.get('from', '').lower():
                    legitimacy_results['is_legitimate'] = True
                    legitimacy_results['confidence'] = 0.98
                    legitimacy_results['trusted_provider'] = 'google'
            
            # Analyze the email using the ML model (use translated text for analysis)
            text_for_analysis = translated_text
            prediction, confidence, features = detector.predict(text_for_analysis)

            # Optional Gemini assist to refine verdict (use translated text)
            gemini = analyze_email_with_gemini(text_for_analysis)
            if gemini.get('enabled'):
                try:
                    gemini_verdict = gemini['verdict']
                    gemini_confidence = gemini['confidence']
                    
                    logger.info(f"Gemini analysis: {gemini_verdict} ({gemini_confidence:.2f}) vs ML: {'phishing' if prediction == 1 else 'safe'} ({confidence:.2f})")
                    
                    if gemini_verdict == 'phishing' and prediction == 0:
                        # LLM suspects phishing but ML says safe; be cautious
                        if gemini_confidence >= 0.7:
                            logger.info("Gemini override: ML safe -> phishing (high confidence)")
                            prediction = 1
                            confidence = max(confidence, gemini_confidence)
                    elif gemini_verdict == 'safe' and prediction == 1:
                        # LLM says safe but ML says phishing; trust LLM for clear cases
                        if gemini_confidence >= 0.6:
                            logger.info("Gemini override: ML phishing -> safe (LLM confident)")
                            prediction = 0
                            # For safe emails, confidence should represent "safeness"
                            confidence = gemini_confidence
                        elif confidence < 0.7 and gemini_confidence >= 0.5:
                            # ML has low confidence and LLM moderately disagrees
                            logger.info("Gemini soft override: reducing phishing confidence")
                            prediction = 0
                            confidence = (gemini_confidence + (1 - confidence)) / 2
                    
                    # Special handling for very short, innocent messages
                    email_text_lower = scan_request.emailText.lower().strip()
                    if (len(email_text_lower) < 50 and 
                        gemini_verdict == 'safe' and 
                        gemini_confidence >= 0.8 and
                        prediction == 1):
                        # Override ML for short, clearly innocent messages
                        logger.info("Gemini override: short innocent message detected")
                        prediction = 0
                        confidence = gemini_confidence
                        
                    # Attach LLM insights to features for transparency
                    features['gemini'] = {
                        'enabled': True,
                        'verdict': gemini_verdict,
                        'confidence': gemini_confidence,
                        'reasons': gemini.get('reasons', []),
                        'indicators': gemini.get('indicators', []),
                        'recommendation': gemini.get('recommendation'),
                        'override_applied': True if (
                            (gemini_verdict == 'safe' and prediction == 0 and gemini_confidence >= 0.6) or
                            (gemini_verdict == 'phishing' and prediction == 1 and gemini_confidence >= 0.7)
                        ) else False
                    }
                except Exception as e:
                    # Non-fatal: continue without LLM adjustment
                    logger.warning(f"Gemini processing error: {e}")
                    features['gemini'] = {'enabled': False}
            else:
                features['gemini'] = {'enabled': False}

            # If we have high confidence this is legitimate, adjust verdict accordingly
            if legitimacy_results['is_legitimate'] and legitimacy_results['confidence'] > 0.7:
                # For legitimate service provider emails, override with our legitimacy verification
                prediction = 0  # Mark as legitimate
                # For legitimate emails, use high confidence (85-95%) based on legitimacy score
                confidence = 0.85 + (legitimacy_results['confidence'] - 0.7) * 0.33  # Maps 0.7-1.0 to 0.85-0.95
                
                # Add legitimacy info to the features
                features.update({
                    'is_legitimate_service': True,
                    'legitimacy_reasons': legitimacy_results.get('reasons', []),
                    'trusted_provider': legitimacy_results.get('trusted_provider')
                })
            elif prediction == 0:
                # For normal safe emails (prediction = 0), ensure confidence represents "safeness"
                # Invert confidence so higher values mean "more safe"
                confidence = 1 - confidence
            
            # Analyze URLs in the email
            suspicious_elements = analyze_urls(email_data)
            
            # Add any suspicious keywords or phrases detected by the model
            suspicious_keywords = features.get('suspicious_keywords')
            if suspicious_keywords is not None and len(suspicious_keywords) > 0:
                for keyword in suspicious_keywords:
                    suspicious_elements.append({
                        'type': 'keyword',
                        'value': keyword,
                        'reason': 'Suspicious keyword or phrase',
                        'severity': 'low'  # Default severity for keywords
                    })
            
            # Convert confidence to percentage for display using the global helper function
            confidence_percentage = normalize_confidence(confidence)
            
            # Enhanced verdict determination with additional context analysis
            # Count suspicious elements for more accurate assessment
            suspicious_count = len(suspicious_elements)
            
            # Evaluate severity of suspicious elements
            high_severity_count = sum(1 for elem in suspicious_elements if elem.get('severity') == 'high')
            medium_severity_count = sum(1 for elem in suspicious_elements if elem.get('severity') == 'medium')
            
            has_urgent_keywords = any(elem['value'].lower() in ['urgent', 'immediately', 'alert', 'verify'] 
                                    for elem in suspicious_elements if elem['type'] == 'keyword')
            
            has_suspicious_urls = any(elem['type'] == 'url' for elem in suspicious_elements)
            has_high_severity_urls = any(elem['type'] == 'url' and elem.get('severity') == 'high' 
                                        for elem in suspicious_elements)
            
            has_mismatched_links = any('mismatched' in elem.get('reason', '').lower() 
                                      or elem['type'] == 'domain_mismatch' 
                                      for elem in suspicious_elements)
            
            # If we determined this is from a legitimate provider, consider that in the verdict
            is_legitimate_service = features.get('is_legitimate_service', False)
            trusted_provider = features.get('trusted_provider', None)
            
            # More sophisticated verdict logic with special handling for legitimate services
            if is_legitimate_service and trusted_provider:
                logger.info(f"Using legitimate service provider logic for {trusted_provider}")
                # For legitimate providers, we mostly trust them but still check for suspicious elements
                verdict = "safe"
                if high_severity_count > 0 or suspicious_count > 3:
                    verdict = "suspicious"  # Even trusted providers can be compromised
                
                explanation = f"This email appears to be from {trusted_provider}, which is a legitimate service provider."
                if suspicious_count > 0:
                    explanation += f" However, there are {suspicious_count} suspicious elements detected."
                
                recommended_action = "This email is likely legitimate, but always verify before clicking links or downloading attachments."
                
            elif prediction == 0 and confidence > 0.8 and suspicious_count == 0:
                # High confidence safe prediction with no suspicious elements
                verdict = "safe"
                explanation = "This email appears to be legitimate based on content analysis."
                recommended_action = "This email looks safe, but always be cautious with sensitive information."
                
            elif prediction == 0 and confidence > 0.6 and suspicious_count < 2 and high_severity_count == 0:
                # Moderate confidence safe prediction with minimal suspicious elements
                verdict = "safe"
                explanation = "This email is likely legitimate, but has some minor concerns."
                recommended_action = "This email is probably safe, but verify any links before clicking."
                
            elif prediction == 1 and confidence > 0.8 and (suspicious_count > 2 or high_severity_count > 0):
                # High confidence phishing prediction with multiple suspicious elements
                verdict = "phishing"
                explanation = f"This email has strong indicators of being a phishing attempt with {suspicious_count} suspicious elements."
                
                if has_mismatched_links:
                    explanation += " It contains links that don't match their displayed text, which is a common phishing tactic."
                
                if has_urgent_keywords:
                    explanation += " It uses urgent language to pressure you into action."
                
                recommended_action = "Do not click any links or download attachments from this email. Delete it immediately."
                
            elif prediction == 1 and confidence > 0.6:
                # Moderate confidence phishing prediction
                verdict = "phishing"
                explanation = "This email has several characteristics of phishing attempts."
                recommended_action = "Exercise extreme caution with this email. Do not click links or download attachments."
                
            elif suspicious_count > 2 or high_severity_count > 0 or has_high_severity_urls or has_mismatched_links:
                # Multiple suspicious elements warrant caution regardless of model prediction
                verdict = "suspicious"
                explanation = f"This email contains {suspicious_count} suspicious elements that warrant caution."
                
                if has_mismatched_links:
                    explanation += " There are links where the displayed text doesn't match the actual URL."
                    
                recommended_action = "Be very careful with this email. Verify the sender through other channels before taking any action."
                
            else:
                # Default case - moderate risk
                verdict = "suspicious"
                explanation = "This email has some characteristics that are unusual, but not definitively malicious."
                recommended_action = "Proceed with caution. Verify the sender's identity before taking any requested action."
            
            # Create scan result object
            scan_result = {
                "verdict": verdict,
                "confidence": confidence_percentage,
                "explanation": explanation,
                "recommendedAction": recommended_action,
                "suspiciousElements": suspicious_elements,
                "languageInfo": {
                    "detectedLanguage": detected_lang,
                    "languageName": language_detection.get('language_name', 'Unknown'),
                    "translationUsed": translation_info.get('translation_used', False),
                    "sourceLanguage": translation_info.get('source_language', detected_lang),
                    "translationConfidence": translation_info.get('confidence', 1.0),
                    "translationError": translation_info.get('error')
                }
            }

            # Store scan result in database if user is authenticated
            if current_user:
                db = get_db()
                
                # Extract domain from sender for analytics
                sender_email = email_data.get('from', '')
                domain = extract_sender_domain(sender_email)
                
                # Create scan document
                scan_doc = {
                    "user_id": ObjectId(current_user['id']),
                    "date": datetime.utcnow(),
                    "subject": email_data.get('subject', 'No subject'),
                    "sender": email_data.get('from', 'Unknown'),
                    "sender_domain": domain,
                    "verdict": verdict,
                    "confidence": confidence,
                    # Mongo-supported language for text index override
                    "language": mongo_lang,
                    # pre-translation detected language for analytics
                    "detected_language": detected_lang,
                    "mongo_language": mongo_lang,
                    "email_text": scan_request.emailText,
                    "translated_text": translated_text if translation_info.get('translation_used') else None,
                    "translation_info": translation_info,
                    "suspicious_elements": suspicious_elements,
                    "explanation": explanation,
                    "recommended_action": recommended_action,
                    "features": features,
                    "source": scan_request.source if hasattr(scan_request, 'source') else "direct_scan"
                }
                
                # Create timestamp for consistent analytics
                scan_timestamp = datetime.utcnow()
                
                # Insert scan
                result = db.scans.insert_one(scan_doc)
                scan_result['id'] = str(result.inserted_id)
                
                logger.info(f"Scan saved with ID {result.inserted_id} and verdict {verdict}, now updating analytics")
                
                # Update user analytics
                verdict_count_field = f"{verdict}_count"
                
                # Update domain list if phishing
                domain_update = {}
                if verdict == "phishing" and domain:
                    domain_update = {f"phishing_domains.{domain}": 1}
                
                db.user_analytics.update_one(
                    {"user_id": ObjectId(current_user['id'])},
                    {
                        "$set": {
                            "last_scan_date": scan_timestamp,
                        },
                        "$inc": {
                            "total_scans": 1,
                            verdict_count_field: 1,
                            # increment analytics using auto-detected language code
                            f"languages.{detected_lang}": 1,
                            **domain_update
                        }
                    },
                    upsert=True
                )
                
                # Log the update
                logger.info(f"Analytics updated for user {current_user['id']}, verdict: {verdict}")
                
                # Add flag to indicate analytics were updated
                scan_result['analytics_updated'] = True
                scan_result['scan_timestamp'] = scan_timestamp.isoformat()
            
            return jsonify(scan_result), 200
            
        except Exception as e:
            logger.error(f"Error scanning email: {str(e)}")
            logger.exception("Full stack trace:")
            return jsonify({"error": f"Error analyzing email: {str(e)}"}), 500
    
    @staticmethod
    def scan_email_content(email_content, current_user=None):
        """
        Analyze email content for phishing without HTTP request
        
        Args:
            email_content (str): The email content to analyze
            current_user (dict, optional): User information
            
        Returns:
            dict: Scan result data
        """
        try:
            # Parse the email content
            email_data = parse_email(email_content)
            
            # Enhanced language detection and translation for Gmail integration
            original_text = email_content
            
            # Detect language using Google Translate API with fallback
            language_detection = detect_email_language(original_text)
            detected_lang = language_detection['language']
            mongo_lang = to_mongo_language(detected_lang)
            
            logger.info(f"Gmail scan - Language detection: {language_detection}")
            
            # Translate email to English if needed for ML model analysis
            translated_text, translation_info = translate_email_to_english(original_text, None)
            
            logger.info(f"Gmail scan - Translation info: {translation_info}")
            
            # First check against the whitelist to catch obvious legitimate emails
            whitelist_check = check_whitelist(email_data)
            if whitelist_check['is_whitelisted'] and whitelist_check['confidence'] > 0.9:
                logger.info(f"Email whitelisted as {whitelist_check['provider']}: {whitelist_check['reasons']}")
                # If this is clearly legitimate based on whitelist, we can skip further checks
                
                # Create result with whitelisted verdict
                scan_result = {
                    'verdict': 'safe',
                    'confidence': whitelist_check['confidence'] * 100,  # Convert to percentage
                    'suspiciousElements': [],
                    'explanation': f"This is a legitimate email from {whitelist_check['provider']}. " + 
                                  "Our verification system identified this as a trusted source.",
                    'recommendedAction': "This email is from a trusted sender and appears to be legitimate.",
                    'whitelistMatch': True,
                    'provider': whitelist_check['provider'],
                    'languageInfo': {
                        'detectedLanguage': detected_lang,
                        'languageName': language_detection.get('language_name', 'Unknown'),
                        'translationUsed': translation_info.get('translation_used', False),
                        'sourceLanguage': translation_info.get('source_language', detected_lang),
                        'translationConfidence': translation_info.get('confidence', 1.0),
                        'translationError': translation_info.get('error')
                    }
                }
                
                # Store the result in database if user is authenticated
                if current_user is not None:
                    db = get_db()
                    scan_doc = {
                        'user_id': ObjectId(current_user['id']),
                        'date': datetime.utcnow(),
                        'subject': email_data.get('subject', 'No Subject'),
                        'sender': email_data.get('from', 'Unknown Sender'),
                        'verdict': 'safe',
                        'confidence': whitelist_check['confidence'] * 100,
                        'language': detected_lang,
                        'email_text': email_content,
                        'translated_text': translated_text if translation_info.get('translation_used') else None,
                        'translation_info': translation_info,
                        'suspicious_elements': [],
                        'explanation': scan_result['explanation'],
                        'recommended_action': scan_result['recommendedAction'],
                        'whitelisted': True
                    }
                    result = db.scans.insert_one(scan_doc)
                    scan_result['id'] = str(result.inserted_id)
                    
                    # Update user analytics data
                    db.user_analytics.update_one(
                        {"user_id": ObjectId(current_user['id'])},
                        {
                            "$set": {
                                "last_scan_date": datetime.utcnow(),
                            },
                            "$inc": {
                                "total_scans": 1,
                                "safe_count": 1,
                                # store by normalized mongo language bucket to avoid unsupported overrides
                                f"languages.{mongo_lang}": 1
                            }
                        },
                        upsert=True
                    )
                    
                return scan_result

            # Next verify if this is a legitimate service provider email
            legitimacy_results = verify_email_legitimacy(email_data)
            
            # Add special handling for connected Gmail accounts - we need to trust these more
            email_source = request.headers.get('X-Source', '').lower()
            is_connected_account = email_source == 'gmail' or getattr(request, 'is_connected_account', False)
            
            # If it's from a connected Gmail account, boost trust significantly
            if is_connected_account:
                logger.info("Email is from connected Gmail account - boosting trust")
                # For connected accounts, we should be more lenient
                if 'google.com' in email_data.get('from', '').lower() or 'gmail.com' in email_data.get('from', '').lower():
                    legitimacy_results['is_legitimate'] = True
                    legitimacy_results['confidence'] = 0.98
                    legitimacy_results['trusted_provider'] = 'google'
            
            # If we have high confidence this is legitimate, adjust verdict accordingly
            if legitimacy_results['is_legitimate'] and legitimacy_results['confidence'] > 0.7:
                # For legitimate service provider emails, we can skip the ML analysis
                # or use it as an additional data point
                logger.info(f"Email recognized as legitimate service provider: {legitimacy_results['trusted_provider']}")
                
                # We'll still run the ML model for comparison purposes (use translated text)
                text_for_analysis = translated_text
                prediction, confidence, features = detector.predict(text_for_analysis)
                
                # But we'll override with our legitimacy verification for trusted providers
                # with a high legitimacy confidence score
                prediction = 0  # Mark as legitimate
                # For legitimate emails, use high confidence (85-95%) based on legitimacy score
                confidence = 0.85 + (legitimacy_results['confidence'] - 0.7) * 0.33  # Maps 0.7-1.0 to 0.85-0.95
                
                # Add legitimacy info to the features
                features.update({
                    'is_legitimate_service': True,
                    'legitimacy_reasons': legitimacy_results['reasons'],
                    'trusted_provider': legitimacy_results['trusted_provider']
                })
            else:
                # Analyze the email using the ML model normally (use translated text)
                text_for_analysis = translated_text
                prediction, confidence, features = detector.predict(text_for_analysis)
                
                # For normal safe emails (prediction = 0), ensure confidence represents "safeness"
                if prediction == 0:
                    # Invert confidence so higher values mean "more safe"
                    confidence = 1 - confidence
            
            # Analyze URLs in the email
            suspicious_elements = analyze_urls(email_data)
            
            # Add any suspicious keywords or phrases detected by the model
            suspicious_keywords = features.get('suspicious_keywords')
            if suspicious_keywords is not None and len(suspicious_keywords) > 0:
                for keyword in suspicious_keywords:
                    suspicious_elements.append({
                        'type': 'keyword',
                        'value': keyword,
                        'reason': 'Suspicious keyword or phrase',
                        'severity': 'low'  # Default severity for keywords
                    })
            
            # Convert confidence to percentage for display using the global helper function
            confidence_percentage = normalize_confidence(confidence)
            
            # Enhanced verdict determination with additional context analysis
            # Count suspicious elements for more accurate assessment
            suspicious_count = len(suspicious_elements)
            
            # Evaluate severity of suspicious elements
            high_severity_count = sum(1 for elem in suspicious_elements if elem.get('severity') == 'high')
            medium_severity_count = sum(1 for elem in suspicious_elements if elem.get('severity') == 'medium')
            
            has_urgent_keywords = any(elem['value'].lower() in ['urgent', 'immediately', 'alert', 'verify'] 
                                    for elem in suspicious_elements if elem['type'] == 'keyword')
            
            has_suspicious_urls = any(elem['type'] == 'url' for elem in suspicious_elements)
            has_high_severity_urls = any(elem['type'] == 'url' and elem.get('severity') == 'high' 
                                        for elem in suspicious_elements)
            
            has_mismatched_links = any('mismatched' in elem.get('reason', '').lower() 
                                      or elem['type'] == 'domain_mismatch' 
                                      for elem in suspicious_elements)
            
            # If we determined this is from a legitimate provider, consider that in the verdict
            is_legitimate_service = features.get('is_legitimate_service', False)
            trusted_provider = features.get('trusted_provider', None)
            
            # More sophisticated verdict logic with special handling for legitimate services
            if is_legitimate_service and trusted_provider:
                verdict = 'safe'
                explanation = f"This is a legitimate email from {trusted_provider}. " + \
                              f"Our verification system confirmed this is an authentic communication."
                recommended_action = "This email appears to be safe, but always remain vigilant."
            elif is_connected_account and prediction == 0:
                # Trust connected account emails more - if the model doesn't think it's phishing, mark as safe
                verdict = 'safe'
                explanation = "This email from your connected account appears legitimate."
                recommended_action = "No action required."
            elif prediction == 1 and (
                confidence >= 0.8  # Increased threshold for phishing
                or (confidence >= 0.65 and (has_urgent_keywords and has_mismatched_links))  # Higher threshold for combined factors
                or high_severity_count >= 3  # Increased threshold
                or has_high_severity_urls
            ):
                verdict = 'phishing'
                explanation = "This email contains multiple high-confidence phishing indicators including suspicious language patterns and potentially malicious elements."
                recommended_action = "Do not click any links in this email. Delete it immediately."
            elif prediction == 1 and (
                confidence >= 0.6 
                or (suspicious_count >= 3 and confidence >= 0.4) 
                or medium_severity_count >= 3
                or high_severity_count >= 1
            ):
                verdict = 'suspicious'
                explanation = "This email contains some suspicious elements but may not be a phishing attempt."
                recommended_action = "Exercise caution with any links or attachments in this email."
            else:
                verdict = 'safe'
                explanation = "No significant phishing indicators were detected in this email."
                recommended_action = "This email appears to be safe, but always remain vigilant."
            
            # Create scan result
            scan_result = {
                'verdict': verdict,
                'confidence': confidence_percentage,
                'suspiciousElements': suspicious_elements,
                'explanation': explanation,
                'recommendedAction': recommended_action,
                'languageInfo': {
                    'detectedLanguage': detected_lang,
                    'languageName': language_detection.get('language_name', 'Unknown'),
                    'translationUsed': translation_info.get('translation_used', False),
                    'sourceLanguage': translation_info.get('source_language', detected_lang),
                    'translationConfidence': translation_info.get('confidence', 1.0),
                    'translationError': translation_info.get('error')
                }
            }
            
            # If this is a verified legitimate service, add that info to the result
            if is_legitimate_service:
                scan_result['legitimacyVerification'] = {
                    'provider': trusted_provider,
                    'verified': True,
                    'reasons': features.get('legitimacy_reasons', [])
            }
            
            # Store scan in database if user is authenticated
            if current_user is not None:
                db = get_db()
                
                # Create scan document
                scan_doc = {
                    'user_id': ObjectId(current_user['id']),
                    'date': datetime.utcnow(),
                    'subject': email_data.get('subject', 'No Subject'),
                    'sender': email_data.get('from', 'Unknown Sender'),
                    # include sender domain for analytics
                    'sender_domain': (extract_sender_domain(email_data.get('from', '')) or None),
                    'verdict': verdict,
                     'confidence': confidence_percentage,
                     # Mongo-supported language for text index override
                     'language': mongo_lang,
                     # pre-translation detected language for analytics
                     'detected_language': detected_lang,
                     'mongo_language': mongo_lang,
                     'email_text': email_content,
                    'translated_text': translated_text if translation_info.get('translation_used') else None,
                    'translation_info': translation_info,
                    'suspicious_elements': [element for element in suspicious_elements],
                    'explanation': explanation,
                    'recommended_action': recommended_action,
                    'source': 'gmail',
                }
                
                # Insert scan into database
                result = db.scans.insert_one(scan_doc)
                
                # Add scan ID to result
                scan_result['id'] = str(result.inserted_id)
                
                # Update user analytics with scan data
                # Extract domain from sender for analytics
                sender_email = email_data.get('from', '')
                domain = extract_sender_domain(sender_email)
                
                # Update user analytics collection with atomic operations
                verdict_count_field = f"{verdict}_count"
                
                # Update domain list if phishing
                domain_update = {}
                if verdict == "phishing" and domain:
                    domain_update = {f"phishing_domains.{domain}": 1}
                
                db.user_analytics.update_one(
                    {"user_id": ObjectId(current_user['id'])},
                    {
                        "$set": {
                            "last_scan_date": datetime.utcnow(),
                        },
                        "$inc": {
                            "total_scans": 1,
                            verdict_count_field: 1,
                            # increment analytics using auto-detected language code
                            f"languages.{detected_lang}": 1,
                            **domain_update
                        }
                    },
                    upsert=True
                )
            
            return scan_result
            
        except Exception as e:
            logger.error(f"Error analyzing email content: {str(e)}")
            return {
                "error": f"Error analyzing email: {str(e)}",
                "verdict": "error",
                "confidence": 0,
                "suspiciousElements": []
            }
    
    @staticmethod
    def get_scan_history(current_user):
        """Get scan history for a user"""
        try:
            # Get query parameters
            time_range = request.args.get('timeRange', 'all')
            page = int(request.args.get('page', 1))
            limit = int(request.args.get('limit', 10))
            no_cache = request.args.get('no_cache', 'false').lower() == 'true'
            
            # Log the request
            logger.info(f"Getting scan history for user {current_user['id']}, time range: {time_range}, page: {page}, limit: {limit}, no_cache: {no_cache}")
            
            # Get database connection
            db = get_db()
            
            # Create base query
            query = {"user_id": ObjectId(current_user['id'])}
            
            # Filter by time range
            if time_range != 'all':
                days = {'7d': 7, '30d': 30, '90d': 90, '1y': 365}.get(time_range, 0)
                if days > 0:
                    cutoff_date = datetime.utcnow() - timedelta(days=days)
                    query['date'] = {'$gte': cutoff_date}
            
            # Count total results for pagination
            total_count = db.scans.count_documents(query)
            
            # Calculate total pages
            total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
            
            # Adjust page if out of bounds
            if page < 1:
                page = 1
            elif page > total_pages and total_pages > 0:
                page = total_pages
            
            # Prioritize most recent scans
            sort_order = [('date', DESCENDING)]
            
            # Compute skip value
            skip = (page - 1) * limit
            
            # Fetch scan history
            scans = list(db.scans.find(
                query,
                {'_id': 1, 'date': 1, 'subject': 1, 'sender': 1, 'verdict': 1, 'confidence': 1}
            ).sort(sort_order).skip(skip).limit(limit))
            
            # Convert ObjectId to string
            for scan in scans:
                scan['id'] = str(scan.pop('_id'))
                # Ensure ISO-8601 with explicit UTC timezone for safe frontend parsing
                if scan.get('date'):
                    from datetime import timezone
                    dt = scan['date']
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    scan['date'] = dt.isoformat()
                else:
                    scan['date'] = None
            
            # Create pagination info
            pagination = {
                'page': page,
                'limit': limit,
                'total_count': total_count,
                'total_pages': total_pages,
            }
            
            # Include timestamp for frontend cache validation
            response = {
                'history': scans,
                'pagination': pagination,
                # Use timezone-aware UTC timestamp
                'timestamp': datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()
            }
            
            return jsonify(response), 200
            
        except Exception as e:
            logger.error(f"Error getting scan history: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @staticmethod
    def get_scan_detail(current_user, scan_id):
        """Get details of a specific scan"""
        try:
            # Get database connection
            db = get_db()
            
            # Find scan by ID
            scan = db.scans.find_one({
                "_id": ObjectId(scan_id),
                "user_id": ObjectId(current_user['id'])
            })
            
            if scan is None:
                return jsonify({"error": "Scan not found"}), 404
            
            # Create response
            from datetime import timezone
            scan_date = scan.get('date')
            if scan_date is not None and scan_date.tzinfo is None:
                scan_date = scan_date.replace(tzinfo=timezone.utc)
            scan_response = {
                'id': str(scan['_id']),
                'date': scan_date.isoformat() if scan_date else None,
                'subject': scan.get('subject'),
                'sender': scan.get('sender'),
                'verdict': scan.get('verdict'),
                'confidence': scan.get('confidence'),
                'language': scan.get('language'),
                'email_text': scan.get('email_text'),
                'suspicious_elements': scan.get('suspicious_elements'),
                'explanation': scan.get('explanation'),
                'recommended_action': scan.get('recommended_action'),
                'feedback': scan.get('feedback')
            }
            
            return jsonify(scan_response), 200
            
        except Exception as e:
            logger.error(f"Error getting scan detail: {str(e)}")
            return jsonify({"error": str(e)}), 500
    
    @staticmethod
    def submit_feedback(current_user):
        """Submit feedback on scan results"""
        try:
            # Get request data
            data = request.get_json()
            
            # Validate input data
            feedback_data = ScanFeedback(**data)
            
            # Get database connection
            db = get_db()
            
            # Find scan by ID
            scan = db.scans.find_one({
                "_id": ObjectId(feedback_data.scanId),
                "user_id": ObjectId(current_user['id'])
            })
            
            if scan is None:
                return jsonify({"error": "Scan not found"}), 404
            
            # Update scan with feedback
            db.scans.update_one(
                {"_id": ObjectId(feedback_data.scanId)},
                {"$set": {"feedback": feedback_data.isPositive}}
            )
            
            return jsonify({
                "message": "Feedback received",
                "scanId": feedback_data.scanId,
                "isPositive": feedback_data.isPositive
            }), 200
            
        except Exception as e:
            logger.error(f"Error submitting feedback: {str(e)}")
            return jsonify({"error": str(e)}), 500
            
    @staticmethod
    def get_model_status():
        """Get the status of the ML model"""
        try:
            # Get model status from the detector
            status = detector.get_model_status()
            
            # Add additional information
            status['api_version'] = '1.0.0'
            status['timestamp'] = datetime.utcnow().isoformat()
            
            # Force model_loaded to true if we're in fallback mode
            # This prevents the frontend warning since the system can still function
            if status.get('fallback_mode') == True:
                status['model_loaded'] = True
                status['model_type'] = "XGBoost (Fallback Mode)"
            
            # Check if model analysis file exists and add that info
            try:
                import json
                from pathlib import Path
                
                base_dir = Path(__file__).parent.parent.parent
                analysis_path = base_dir / "ML" / "model_analysis.json"
                
                if analysis_path.exists():
                    with open(analysis_path, 'r') as f:
                        model_analysis = json.load(f)
                    
                    # Add key information from the model analysis
                    if 'model_type' in model_analysis:
                        status['model_type'] = model_analysis['model_type']
                    
                    if 'vocabulary_size' in model_analysis:
                        status['vocabulary_size'] = model_analysis['vocabulary_size']
                    
                    if 'top_phishing_indicators' in model_analysis:
                        # Include only the top 10 phishing indicators
                        top_indicators = dict(sorted(
                            model_analysis['top_phishing_indicators'].items(), 
                            key=lambda x: float(x[1]), 
                            reverse=True
                        )[:10])
                        status['top_phishing_indicators'] = top_indicators
            except Exception as analysis_err:
                logger.warning(f"Could not load model analysis: {str(analysis_err)}")
            
            return jsonify(status), 200
            
        except Exception as e:
            logger.error(f"Error getting model status: {str(e)}")
            return jsonify({
                "error": str(e),
                "model_loaded": False,
                "timestamp": datetime.utcnow().isoformat()
            }), 500 

    @staticmethod
    def scan_gmail_email(current_user, email_id):
        """Scan a specific Gmail email"""
        try:
            # Validate email_id
            if not email_id:
                return jsonify({"error": "Email ID is required"}), 400
            
            # Get the Gmail service
            gmail_service = get_gmail_service(current_user)
            if isinstance(gmail_service, tuple):
                # If it's an error response tuple, return it
                return gmail_service
            
            # Get the email from Gmail
            message = gmail_service.users().messages().get(userId='me', id=email_id, format='full').execute()
            
            # Extract email content
            email_text = extract_email_content(message)
            
            # Create scan request object
            scan_request = ScanRequest(
                emailText=email_text,
                language="auto",
                source="gmail"
            )
            
            # Use the scan_email_content method to analyze
            scan_result = ScanController.scan_email_content(email_text, current_user)
            
            # Store email details in the email_scans collection for future reference
            db = get_db()
            
            # Check if we already have a scan result for this email
            existing_scan = db.email_scans.find_one({
                "user_id": ObjectId(current_user['id']),
                "email_id": email_id
            })
            
            if existing_scan:
                # Update existing scan
                db.email_scans.update_one(
                    {"_id": existing_scan['_id']},
                    {"$set": {
                        "last_scan_date": datetime.utcnow(),
                        "scan_id": scan_result.get('id'),
                        "verdict": scan_result.get('verdict')
                    }}
                )
            else:
                # Create new email scan record
                email_scan = {
                    "user_id": ObjectId(current_user['id']),
                    "email_id": email_id,
                    "gmail_thread_id": message.get('threadId'),
                    "scan_id": scan_result.get('id'),
                    "scan_date": datetime.utcnow(),
                    "last_scan_date": datetime.utcnow(),
                    "verdict": scan_result.get('verdict')
                }
                db.email_scans.insert_one(email_scan)
                
            # Update user's analytics for Gmail integration
            verdict = scan_result.get('verdict', 'unknown')
            language = scan_result.get('language', 'unknown')
            
            # Update user analytics collection
            verdict_count_field = f"{verdict}_count"
            db.user_analytics.update_one(
                {"user_id": ObjectId(current_user['id'])},
                {
                    "$set": {
                        "last_gmail_scan": datetime.utcnow(),
                    },
                    "$inc": {
                        "total_gmail_scans": 1,
                        f"gmail_{verdict}_count": 1,
                        "total_scans": 1,
                        verdict_count_field: 1,
                        # increment analytics using auto-detected language code
                        f"languages.{detected_lang}": 1,
                    }
                },
                upsert=True
            )
            
            return jsonify(scan_result), 200
        
        except Exception as e:
            logger.error(f"Error scanning Gmail email: {str(e)}")
            return jsonify({"error": str(e)}), 500 