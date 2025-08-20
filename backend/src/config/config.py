import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

class Config:
    """Base configuration class"""
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-for-development')
    DEBUG = False
    TESTING = False
    
    # JWT settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-for-development')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # MongoDB settings
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/phishguard')
    
    # ML Model settings
    ML_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'ML_MODEL')
    
    # Google OAuth settings
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI', 'http://localhost:5000/api/inbox/oauth2callback')
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

    # Gemini settings
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    GEMINI_MODEL_NAME = os.environ.get('GEMINI_MODEL_NAME', 'gemini-1.5-pro')
    
    # Google Translate settings
    GOOGLE_TRANSLATE_API_KEY = os.environ.get('GOOGLE_TRANSLATE_API_KEY')
    GOOGLE_TRANSLATE_PROJECT_ID = os.environ.get('GOOGLE_TRANSLATE_PROJECT_ID')
    GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    MONGO_URI = os.environ.get('TEST_MONGO_URI', 'mongodb://localhost:27017/phishguard_test')
    
class ProductionConfig(Config):
    """Production configuration"""
    # In production, ensure these are set as environment variables
    SECRET_KEY = os.environ.get('SECRET_KEY')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    MONGO_URI = os.environ.get('MONGO_URI')
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    GOOGLE_REDIRECT_URI = os.environ.get('GOOGLE_REDIRECT_URI')
    FRONTEND_URL = os.environ.get('FRONTEND_URL')

# Dictionary with different configuration environments
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Get the current configuration
def get_config(config_name=None):
    """
    Get the configuration based on the environment or specified config_name.
    
    Args:
        config_name (str, optional): The configuration to use. If None, uses FLASK_ENV.
        
    Returns:
        Config: The configuration class
    """
    if config_name is not None:
        return config.get(config_name, config['default'])
    
    env = os.environ.get('FLASK_ENV', 'default')
    return config.get(env, config['default']) 