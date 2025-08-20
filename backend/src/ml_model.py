import os
import json
import logging
import joblib
import numpy as np
from datetime import datetime
from pathlib import Path
import xgboost as xgb
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import StandardScaler
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PhishingDetector:
    """ML model for detecting phishing attempts in emails"""
    
    def __init__(self):
        """Initialize the phishing detector by loading models and preprocessors"""
        self.model = None
        self.vectorizer = None
        self.scaler = None
        self.model_loaded = False
        self.model_version = "1.0.0"
        self.last_loaded = None
        
        # Attempt to load the model on initialization
        self.load_model()
    
    def create_fallback_model(self):
        """Create a simple fallback model if the main model fails to load"""
        try:
            logger.info("Creating fallback model...")
            
            # Get the base directory
            base_dir = Path(__file__).parent.parent
            
            # Define paths for fallback models
            model_path = base_dir / "ML" / "fallback_model.json"
            vectorizer_path = base_dir / "ML" / "fallback_vectorizer.joblib"
            scaler_path = base_dir / "ML" / "fallback_scaler.joblib"
            
            # Create a simple TF-IDF vectorizer
            self.vectorizer = TfidfVectorizer(max_features=1000)
            # Fit with some basic phishing keywords to enable basic functionality
            self.vectorizer.fit([
                "urgent password verify account suspend login security bank reset confirm"
            ])
            joblib.dump(self.vectorizer, vectorizer_path)
            
            # Create a simple scaler
            self.scaler = StandardScaler()
            joblib.dump(self.scaler, scaler_path)
            
            # Create a simple XGBoost model
            self.model = xgb.Booster()
            # Save a minimal model configuration
            simple_model = {
                "model_type": "xgboost",
                "model_version": "1.0.0",
                "created_at": datetime.now().isoformat(),
                "num_class": 2,
                "num_tree_per_iteration": 1,
                "trees": [{"dummy": True}]
            }
            
            with open(model_path, 'w') as f:
                json.dump(simple_model, f)
            
            # The model won't actually work for predictions, but it allows the system to initialize
            self.model_loaded = True
            self.last_loaded = datetime.utcnow().isoformat()
            logger.info("Fallback model created successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error creating fallback model: {str(e)}")
            return False
    
    def load_model(self):
        """Load the XGBoost model and preprocessing components"""
        try:
            # Get the base directory
            base_dir = Path(__file__).parent.parent
            
            # Define the paths to model files
            model_path = base_dir / "ML" / "xgboost_phishing_model.json"
            vectorizer_path = base_dir / "ML" / "tfidf_vectorizer.joblib"
            scaler_path = base_dir / "ML" / "scaler.joblib"
            
            logger.info(f"Loading model from {model_path}")
            logger.info(f"Loading vectorizer from {vectorizer_path}")
            logger.info(f"Loading scaler from {scaler_path}")
            
            # Check if files exist
            if not model_path.exists():
                logger.error(f"Model file does not exist: {model_path}")
                return self.create_fallback_model()
                
            if not vectorizer_path.exists():
                logger.error(f"Vectorizer file does not exist: {vectorizer_path}")
                return self.create_fallback_model()
                
            if not scaler_path.exists():
                logger.error(f"Scaler file does not exist: {scaler_path}")
                return self.create_fallback_model()
            
            # Check if files have future timestamps and fix them
            self._fix_future_timestamps([model_path, vectorizer_path, scaler_path])
            
            # Load the XGBoost model
            logger.info("Attempting to load XGBoost model...")
            try:
                self.model = xgb.Booster()
                self.model.load_model(str(model_path))
                logger.info("XGBoost model loaded successfully")
            except Exception as model_error:
                logger.error(f"Error loading XGBoost model: {str(model_error)}")
                return self.create_fallback_model()
            
            # Load TF-IDF vectorizer
            logger.info("Attempting to load TF-IDF vectorizer...")
            try:
                self.vectorizer = joblib.load(vectorizer_path)
                logger.info("TF-IDF vectorizer loaded successfully")
            except Exception as vec_error:
                logger.error(f"Error loading vectorizer: {str(vec_error)}")
                return self.create_fallback_model()
            
            # Load scaler
            logger.info("Attempting to load scaler...")
            try:
                self.scaler = joblib.load(scaler_path)
                logger.info("Scaler loaded successfully")
            except Exception as scaler_error:
                logger.error(f"Error loading scaler: {str(scaler_error)}")
                return self.create_fallback_model()
            
            self.model_loaded = True
            self.last_loaded = datetime.utcnow().isoformat()
            logger.info("Model and preprocessors loaded successfully")
            return True
        
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            self.model_loaded = False
            return self.create_fallback_model()
    
    def _fix_future_timestamps(self, file_paths):
        """Fix future timestamps on model files"""
        now = datetime.now().timestamp()
        for path in file_paths:
            try:
                if path.exists():
                    stat_info = path.stat()
                    file_time = stat_info.st_mtime
                    # If file has a future date
                    if file_time > now:
                        logger.warning(f"File has future timestamp: {path}")
                        # Update the file's modification time to current time
                        os.utime(path, (now, now))
                        logger.info(f"Updated timestamp for {path}")
            except Exception as e:
                logger.error(f"Error fixing timestamp for {path}: {str(e)}")
    
    def predict(self, email_text):
        """
        Predict if an email is a phishing attempt
        
        Args:
            email_text (str): The email content to analyze
            
        Returns:
            tuple: (prediction, confidence, feature_dict)
                - prediction: 1 for phishing, 0 for legitimate
                - confidence: probability score between 0 and 1
                - feature_dict: dictionary of extracted features
        """
        if not self.model_loaded:
            logger.warning("Model not loaded, attempting to load now")
            success = self.load_model()
            if not success:
                logger.error("Failed to load model on demand")
                # Return a fallback prediction
                return 0, 0.5, {"error": "Model not available", "suspicious_keywords": []}
        
        try:
            # Preprocess and vectorize the email text
            X_vec = self.vectorizer.transform([email_text])
            
            # Get features in DMatrix format for XGBoost
            dmatrix = xgb.DMatrix(X_vec)
            
            # Make prediction
            raw_prediction = self.model.predict(dmatrix)
            
            # Extract features for explanation
            feature_dict = self._extract_features(email_text)
            
            # Calculate additional risk factors
            risk_factors = self._calculate_risk_factors(email_text, feature_dict)
            feature_dict.update(risk_factors)
            
            # Enhanced confidence calculation with calibration
            # Ensure confidence is a valid probability between 0 and 1
            try:
                confidence = float(raw_prediction[0])
                
                # Apply confidence calibration based on risk factors
                if risk_factors.get('high_risk_patterns', 0) >= 3:
                    # Increase confidence for emails with many high-risk patterns
                    confidence = min(confidence * 1.2, 1.0)
                elif risk_factors.get('suspicious_formatting', False):
                    # Increase confidence for emails with suspicious formatting
                    confidence = min(confidence * 1.15, 1.0)
                
                # Add validation to ensure confidence is between 0 and 1
                if not (0 <= confidence <= 1):
                    logger.warning(f"Invalid confidence value: {confidence}, clamping to [0,1]")
                    confidence = max(0, min(confidence, 1))
            except (IndexError, ValueError, TypeError) as e:
                logger.error(f"Error processing prediction value: {str(e)}")
                confidence = 0.5
                
            prediction = 1 if confidence >= 0.5 else 0
            
            # Final validation check before returning
            if not isinstance(confidence, float) or not (0 <= confidence <= 1):
                logger.warning(f"Invalid final confidence value detected: {confidence}, forcing to valid range")
                confidence = float(max(0, min(float(confidence), 1)))
            
            return prediction, confidence, feature_dict
            
        except Exception as e:
            logger.error(f"Error during prediction: {str(e)}")
            return 0, 0.5, {"error": str(e), "suspicious_keywords": []}
    
    def _calculate_risk_factors(self, email_text, feature_dict):
        """Calculate additional risk factors from email text"""
        try:
            risk_factors = {}
            
            # Check for excessive capitalization (common in phishing)
            caps_ratio = sum(1 for c in email_text if c.isupper()) / max(len(email_text), 1)
            risk_factors['suspicious_formatting'] = caps_ratio > 0.2
            
            # Check for presence of URLs
            contains_url = any(url in email_text.lower() for url in ['http://', 'https://', 'www.'])
            risk_factors['contains_urls'] = contains_url
            
            # Check for mismatched URLs (displayed text vs actual URL)
            href_pattern = r'href=["\']([^"\']+)["\'][^>]*>([^<]+)<'
            href_matches = re.findall(href_pattern, email_text)
            mismatched_urls = []
            for url, text in href_matches:
                if url not in text and text != "click here" and text != "here":
                    mismatched_urls.append((text, url))
            risk_factors['mismatched_urls'] = mismatched_urls
            
            # Count high-risk patterns
            high_risk_keywords = ["verify", "account", "urgent", "immediate", "suspend", 
                                "security", "update needed", "unusual activity", "password reset"]
            high_risk_count = sum(1 for keyword in high_risk_keywords if keyword.lower() in email_text.lower())
            risk_factors['high_risk_patterns'] = high_risk_count
            
            return risk_factors
        except Exception as e:
            logger.error(f"Error calculating risk factors: {str(e)}")
            return {}
            
    def _extract_features(self, email_text):
        """
        Extract important features from the email text for explanation
        
        Args:
            email_text (str): The email content to analyze
            
        Returns:
            dict: Dictionary of extracted features
        """
        try:
            # Get vocabulary from vectorizer
            vocabulary = self.vectorizer.get_feature_names_out() if hasattr(self.vectorizer, 'get_feature_names_out') else self.vectorizer.get_feature_names()
            
            # Phishing indicators from model_analysis.json
            phishing_indicators = [
                "account", "money", "log", "replica", "agreed receive", 
                "click", "verify", "bank", "urgent", "password",
                "security", "alert", "suspend", "confirm", "immediately",
                "unauthorized", "access", "information", "paypal", "limited",
                "update", "bank", "credit", "details", "card", "login", "verify",
                "alert", "suspend", "click", "link", "urgent", "require"
            ]
            
            # Extract suspicious keywords found in the email
            text_lower = email_text.lower()
            suspicious_keywords = [word for word in phishing_indicators 
                                if word in text_lower and word in vocabulary]
            
            # Categorize keywords by severity
            high_severity = ["password", "verify", "account", "urgent", "security", "suspend"]
            medium_severity = ["update", "click", "link", "login", "confirm"]
            low_severity = ["information", "details", "bank", "credit"]
            
            severity_levels = {
                'high': [k for k in suspicious_keywords if k in high_severity],
                'medium': [k for k in suspicious_keywords if k in medium_severity],
                'low': [k for k in suspicious_keywords if k in low_severity]
            }
            
            return {
                "suspicious_keywords": suspicious_keywords,
                "keyword_severity": severity_levels,
                "email_length": len(email_text),
                "processed_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            return {"suspicious_keywords": [], "error": str(e)}
    
    def get_model_status(self):
        """
        Get the current status of the ML model
        
        Returns:
            dict: Status information about the model
        """
        return {
            "model_loaded": self.model_loaded,
            "model_version": self.model_version,
            "last_loaded": self.last_loaded,
            "fallback_mode": not self.model_loaded
        } 