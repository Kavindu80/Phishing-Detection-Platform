from flask import Blueprint, request, jsonify

scan_bp = Blueprint('scan', __name__)

@scan_bp.route('/scan', methods=['POST'])
def scan_url():
    """Scan a URL for phishing"""
    try:
        data = request.get_json()
        if not data or not data.get('url'):
            return jsonify({"error": "URL is required"}), 400
        
        # For testing purposes, return mock result
        result = {
            "url": data.get('url'),
            "is_phishing": False,
            "confidence": 0.85,
            "features": {
                "suspicious_domain": False,
                "suspicious_path": False,
                "suspicious_parameters": False
            }
        }
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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