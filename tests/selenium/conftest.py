"""
PhishGuard Selenium UI Automation Tests
========================================
Conftest for Selenium test configuration
"""

import pytest
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# Create screenshots directory
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), 'screenshots')
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


@pytest.fixture(scope="session")
def base_url():
    """Base URL for the application"""
    return os.environ.get("BASE_URL", "http://localhost:5173")


@pytest.fixture(scope="function")
def driver():
    """Initialize Chrome WebDriver for each test"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-popup-blocking")
    chrome_options.add_argument("--disable-infobars")
    # Uncomment for headless mode
    # chrome_options.add_argument("--headless")
    # chrome_options.add_argument("--no-sandbox")
    # chrome_options.add_argument("--disable-dev-shm-usage")
    
    # Initialize driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(10)
    
    yield driver
    
    # Cleanup
    driver.quit()


@pytest.fixture(scope="function")
def headless_driver():
    """Initialize headless Chrome WebDriver"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(10)
    
    yield driver
    
    driver.quit()


@pytest.fixture
def screenshot_dir():
    """Return screenshot directory path"""
    return SCREENSHOT_DIR


# Test data fixtures
@pytest.fixture
def phishing_email():
    """Sample phishing email for testing"""
    return """URGENT: Your account has been compromised!
    
Dear Customer,

We have detected suspicious activity on your account. 
Your account will be suspended unless you verify your identity immediately!

Click here to verify: http://bit.ly/secure-verify-now

This is your LAST WARNING. Act now or lose access to your account.

Regards,
Security Team"""


@pytest.fixture
def legitimate_email():
    """Sample legitimate email for testing"""
    return """Hi Team,

Please find attached the meeting notes from yesterday's discussion.

We covered the following topics:
1. Q4 planning
2. Budget review
3. Team updates

Let me know if you have any questions.

Best regards,
John"""


@pytest.fixture
def valid_credentials():
    """Valid test credentials"""
    return {
        "email": "test@example.com",
        "password": "TestPassword123!"
    }


@pytest.fixture
def invalid_credentials():
    """Invalid test credentials"""
    return {
        "email": "invalid@example.com",
        "password": "wrongpassword"
    }
