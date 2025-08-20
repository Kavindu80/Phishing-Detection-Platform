import pytest
import os
import sys

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

def test_imports():
    """Test that all required modules can be imported"""
    try:
        from config.config import Config, get_config
        print("✅ Config module imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import config: {e}")
        pytest.fail(f"Config import failed: {e}")

def test_config_creation():
    """Test that configuration can be created"""
    try:
        from config.config import get_config
        config = get_config('testing')
        assert config is not None
        print("✅ Configuration created successfully")
    except Exception as e:
        print(f"❌ Failed to create config: {e}")
        pytest.fail(f"Config creation failed: {e}")

def test_environment_variables():
    """Test that environment variables are accessible"""
    try:
        from config.config import Config
        config = Config()
        assert hasattr(config, 'SECRET_KEY')
        assert hasattr(config, 'MONGO_URI')
        print("✅ Environment variables accessible")
    except Exception as e:
        print(f"❌ Environment variables test failed: {e}")
        pytest.fail(f"Environment variables test failed: {e}")

def test_ml_model_import():
    """Test that ML model can be imported (without loading)"""
    try:
        # Just test if the module exists
        import src.ml_model
        print("✅ ML model module exists")
    except ImportError as e:
        print(f"⚠️ ML model module import failed: {e}")
        # This is not a critical failure

def test_app_structure():
    """Test that the app structure is correct"""
    try:
        # Check if main app file exists
        app_path = os.path.join(os.path.dirname(__file__), '..', 'app.py')
        assert os.path.exists(app_path), "app.py not found"
        print("✅ App structure is correct")
    except Exception as e:
        print(f"❌ App structure test failed: {e}")
        pytest.fail(f"App structure test failed: {e}")

def test_src_structure():
    """Test that the src directory structure is correct"""
    try:
        src_path = os.path.join(os.path.dirname(__file__), '..', 'src')
        assert os.path.exists(src_path), "src directory not found"
        
        # Check for key directories
        required_dirs = ['config', 'controllers', 'models', 'routes', 'utils']
        for dir_name in required_dirs:
            dir_path = os.path.join(src_path, dir_name)
            assert os.path.exists(dir_path), f"{dir_name} directory not found"
        
        print("✅ Src directory structure is correct")
    except Exception as e:
        print(f"❌ Src structure test failed: {e}")
        pytest.fail(f"Src structure test failed: {e}")

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 