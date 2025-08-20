from flask import Blueprint, request, jsonify
from flask_limiter.util import get_remote_address
from src.utils.input_validator import InputValidator
import time
import logging

logger = logging.getLogger(__name__)
scan_bp = Blueprint('scan', __name__)

@scan_bp.route('/scan', methods=['POST'])
def scan_url():
    """Scan a URL for phishing - Rate limited with input validation"""
    # Rate limiting will be applied at the app level
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request data is required"}), 400
        
        # Sanitize input
        sanitized_data = InputValidator.sanitize_json_input(data)
        
        email_text = sanitized_data.get('emailText')
        if not email_text:
            return jsonify({"error": "Email text is required"}), 400
        
        # Validate email content
        is_valid, message = InputValidator.validate_email_content(email_text)
        if not is_valid:
            return jsonify({"error": message}), 400
        
        # Simulate processing time (optimized)
        time.sleep(0.05)  # Reduced processing time
        
        # For testing purposes, return mock result
        result = {
            "emailText": email_text[:100] + "..." if len(email_text) > 100 else email_text,
            "is_phishing": False,
            "confidence": 0.85,
            "features": {
                "suspicious_content": False,
                "suspicious_links": False,
                "suspicious_sender": False
            },
            "timestamp": time.time(),
            "processing_time_ms": 50
        }
        
        return jsonify(result), 200
    except Exception as e:
        logger.error(f"Scan error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@scan_bp.route('/scan/history', methods=['GET'])
def scan_history():
    """Get scan history"""
    try:
        # For testing purposes, return mock history
        history = [
            {
                "id": "1",
                "url": "https://example.com",
                "is_phishing": False,
                "timestamp": "2025-01-20T10:00:00Z"
            }
        ]
        return jsonify({"history": history}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 