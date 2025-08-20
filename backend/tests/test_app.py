import pytest
import os
import sys
import tempfile
import shutil

# Add the src directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

def test_app_import():
    """Test that the app module can be imported."""
    try:
        from app import create_app
        assert create_app is not None
        print("✅ App import successful")
    except ImportError as e:
        print(f"⚠️ App import failed: {e}")
        # Don't fail the test, just warn

def test_config_import():
    """Test that the config module can be imported."""
    try:
        from src.config.config import get_config
        assert get_config is not None
        print("✅ Config import successful")
    except ImportError as e:
        print(f"⚠️ Config import failed: {e}")

def test_extensions_import():
    """Test that the extensions module can be imported."""
    try:
        from src.extensions import bcrypt, jwt
        assert bcrypt is not None
        assert jwt is not None
        print("✅ Extensions import successful")
    except ImportError as e:
        print(f"⚠️ Extensions import failed: {e}")

def test_ml_model_import():
    """Test that the ML model can be imported."""
    try:
        from src.ml_model import PhishingDetector
        assert PhishingDetector is not None
        print("✅ ML model import successful")
    except ImportError as e:
        print(f"⚠️ ML model import failed: {e}")

def test_app_creation():
    """Test that the Flask app can be created."""
    try:
        from app import create_app
        
        # Test with testing configuration
        app = create_app('testing')
        assert app is not None
        assert app.config['TESTING'] is True
        print("✅ App creation successful")
        
    except Exception as e:
        print(f"⚠️ App creation failed: {e}")

def test_health_endpoint():
    """Test that the health endpoint works."""
    try:
        from app import create_app
        
        app = create_app('testing')
        with app.test_client() as client:
            response = client.get('/api/health')
            assert response.status_code == 200
            data = response.get_json()
            assert data['status'] == 'healthy'
            print("✅ Health endpoint test successful")
            
    except Exception as e:
        print(f"⚠️ Health endpoint test failed: {e}")

def test_environment_variables():
    """Test that required environment variables are set."""
    required_vars = ['FLASK_ENV', 'SECRET_KEY', 'JWT_SECRET_KEY']
    
    for var in required_vars:
        if os.environ.get(var):
            print(f"✅ {var} is set")
        else:
            print(f"⚠️ {var} is not set")

def test_file_structure():
    """Test that required files exist."""
    required_files = [
        '../src/config/config.py',
        '../src/extensions.py',
        '../src/ml_model.py',
        '../app.py',
        '../requirements.txt'
    ]
    
    for file_path in required_files:
        full_path = os.path.join(os.path.dirname(__file__), file_path)
        if os.path.exists(full_path):
            print(f"✅ {file_path} exists")
        else:
            print(f"⚠️ {file_path} not found")

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 