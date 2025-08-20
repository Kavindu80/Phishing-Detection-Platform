from flask import Blueprint, jsonify

inbox_bp = Blueprint('inbox', __name__)

@inbox_bp.route('/emails', methods=['GET'])
def get_emails():
    """Get emails from inbox"""
    try:
        # For testing purposes, return mock emails
        emails = [
            {
                "id": "1",
                "subject": "Test Email",
                "from": "test@example.com",
                "is_phishing": False,
                "timestamp": "2025-01-20T10:00:00Z"
            }
        ]
        return jsonify({"emails": emails}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@inbox_bp.route('/oauth2callback', methods=['GET'])
def oauth2callback():
    """OAuth2 callback for Gmail integration"""
    try:
        return jsonify({"message": "OAuth2 callback received"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500 