import os
import sys
import time
from flask import Flask, jsonify, request, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from src.extensions import bcrypt, jwt
    from src.config.config import get_config
    from src.routes.auth_routes import auth_bp
    from src.routes.scan_routes import scan_bp
    from src.routes.analytics_routes import analytics_bp
    from src.routes.inbox_routes import inbox_bp
except ModuleNotFoundError:

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
    
    # Initialize rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"
    )
    
    # Make limiter available globally
    app.limiter = limiter

    # Configure CORS with secure settings
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5173", "http://127.0.0.1:5173"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "expose_headers": ["Content-Type"],
            "supports_credentials": True
        }
    })
    bcrypt.init_app(app)
    jwt.init_app(app)
    

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(scan_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    app.register_blueprint(inbox_bp, url_prefix='/api/inbox')
    
    # Health check endpoint with caching
    @app.route('/api/health')
    @app.limiter.limit("100 per minute")
    def health_check():
        return jsonify({
            "status": "healthy", 
            "message": "API is running",
            "timestamp": "2025-01-20T00:00:00Z"
        }), 200
    
    # Security headers middleware
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        
        # Add performance header
        if hasattr(g, 'start_time'):
            response_time = (time.time() - g.start_time) * 1000
            response.headers['X-Response-Time'] = f'{response_time:.2f}ms'
        
        return response
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404
    
    @app.errorhandler(500)
    def server_error(error):
        logger.error(f"Server error: {error}")
        return jsonify({"error": "Internal server error"}), 500
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({"error": "Rate limit exceeded", "retry_after": 60}), 429
    
    return app

if __name__ == '__main__':
    app = create_app()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True) 
