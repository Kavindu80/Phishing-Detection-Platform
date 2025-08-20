import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
import logging

# Add the current directory to the path so imports work correctly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from src.extensions import bcrypt, jwt
    from src.config.config import get_config
    from src.routes.auth_routes import auth_bp
    from src.routes.scan_routes import scan_bp
    from src.routes.analytics_routes import analytics_bp
    from src.routes.inbox_routes import inbox_bp
except ModuleNotFoundError:
    # Alternative import path when running from the backend directory
    from src.extensions import bcrypt, jwt
    from src.config.config import get_config
    from src.routes.auth_routes import auth_bp
    from src.routes.scan_routes import scan_bp
    from src.routes.analytics_routes import analytics_bp
    from src.routes.inbox_routes import inbox_bp

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app(config_name=None):
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    config = get_config(config_name)
    app.config.from_object(config)
    
    # Initialize extensions with app
    # Configure CORS with more detailed settings
    CORS(app, resources={r"/api/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], 
                                    "allow_headers": ["Content-Type", "Authorization"]}})
    bcrypt.init_app(app)
    jwt.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(scan_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(inbox_bp, url_prefix='/api/inbox')
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({"status": "healthy", "message": "API is running"}), 200
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server error: {error}")
        return jsonify({"error": "Internal server error"}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 