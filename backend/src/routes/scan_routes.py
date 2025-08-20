from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..controllers.scan_controller import ScanController
from ..middleware.auth import get_current_user
from ..utils.google_translator import get_supported_languages

# Create blueprint
scan_bp = Blueprint('scan', __name__)

# Public scan endpoint
@scan_bp.route('/scan', methods=['POST'])
def scan_email():
    """Public endpoint to scan an email for phishing attempts"""
    return ScanController.scan_email()

# Protected scan endpoint
@scan_bp.route('/scan/auth', methods=['POST'])
@jwt_required()
def scan_email_auth():
    """Protected endpoint to scan an email for phishing attempts"""
    current_user = get_current_user()
    return ScanController.scan_email(current_user)

# History endpoint
@scan_bp.route('/history', methods=['GET'])
@jwt_required()
def get_scan_history():
    """Get scan history for the current user"""
    current_user = get_current_user()
    return ScanController.get_scan_history(current_user)

# Additional history endpoint with alternative path
@scan_bp.route('/scans/history', methods=['GET'])
@jwt_required()
def get_scan_history_alt():
    """Alternative endpoint for scan history (for compatibility)"""
    current_user = get_current_user()
    return ScanController.get_scan_history(current_user)

# Specific scan details endpoint
@scan_bp.route('/history/<scan_id>', methods=['GET'])
@jwt_required()
def get_scan_detail(scan_id):
    """Get details for a specific scan"""
    current_user = get_current_user()
    return ScanController.get_scan_detail(current_user, scan_id)

# Feedback endpoint
@scan_bp.route('/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    """Submit feedback on scan results"""
    current_user = get_current_user()
    return ScanController.submit_feedback(current_user)

# Model status endpoint
@scan_bp.route('/model/status', methods=['GET'])
def get_model_status():
    """Get the status of the ML model"""
    return ScanController.get_model_status()

# Supported languages endpoint
@scan_bp.route('/languages', methods=['GET'])
def get_supported_languages_route():
    """Get list of supported languages for translation"""
    try:
        languages = get_supported_languages()
        return jsonify({
            'languages': languages,
            'count': len(languages)
        })
    except Exception as e:
        return jsonify({
            'error': f'Failed to get supported languages: {str(e)}',
            'languages': {
                'en': 'English',
                'es': 'Spanish',
                'fr': 'French',
                'de': 'German',
                'zh': 'Chinese',
                'ru': 'Russian',
                'ar': 'Arabic'
            }
        }), 500 