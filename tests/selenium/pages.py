"""
PhishGuard Selenium UI Automation Tests
========================================
Page Object Model (POM) Base Classes
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BasePage:
    """Base class for all page objects"""
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)
    
    def find_element(self, by, value):
        """Find element with explicit wait"""
        return self.wait.until(EC.presence_of_element_located((by, value)))
    
    def find_clickable(self, by, value):
        """Find clickable element with explicit wait"""
        return self.wait.until(EC.element_to_be_clickable((by, value)))
    
    def find_elements(self, by, value):
        """Find multiple elements"""
        return self.driver.find_elements(by, value)
    
    def get_title(self):
        """Get page title"""
        return self.driver.title
    
    def get_current_url(self):
        """Get current URL"""
        return self.driver.current_url
    
    def take_screenshot(self, filename):
        """Take screenshot for evidence"""
        self.driver.save_screenshot(f"tests/selenium/screenshots/{filename}.png")
        logger.info(f"Screenshot saved: {filename}.png")
    
    def wait_for_page_load(self, timeout=10):
        """Wait for page to fully load"""
        self.wait.until(lambda d: d.execute_script("return document.readyState") == "complete")


class HomePage(BasePage):
    """Page Object for Home Page"""
    
    # Locators
    SCAN_INPUT = (By.CSS_SELECTOR, "textarea[placeholder*='email'], textarea[id*='email'], input[type='text']")
    SCAN_BUTTON = (By.CSS_SELECTOR, "button[type='submit'], button:contains('Scan')")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "button:contains('Login'), a[href*='login'], button[data-testid='login']")
    SIGNUP_BUTTON = (By.CSS_SELECTOR, "button:contains('Sign'), a[href*='register']")
    NAV_LINKS = (By.CSS_SELECTOR, "nav a, header a")
    HERO_SECTION = (By.CSS_SELECTOR, ".hero, [class*='hero'], main section:first-child")
    
    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.base_url = base_url
    
    def open(self):
        """Navigate to home page"""
        self.driver.get(self.base_url)
        self.wait_for_page_load()
        logger.info(f"Opened home page: {self.base_url}")
        return self
    
    def is_loaded(self):
        """Check if home page is loaded"""
        try:
            self.find_element(*self.HERO_SECTION)
            return True
        except:
            return "PhishGuard" in self.driver.page_source or "phishing" in self.driver.page_source.lower()
    
    def click_login(self):
        """Click login button"""
        try:
            btn = self.find_clickable(By.XPATH, "//button[contains(text(),'Login')] | //a[contains(text(),'Login')]")
            btn.click()
        except:
            # Try alternative selectors
            btn = self.find_clickable(By.CSS_SELECTOR, "[data-testid='login-btn'], .login-btn, button.login")
            btn.click()
        logger.info("Clicked login button")
        return self
    
    def click_signup(self):
        """Click signup button"""
        btn = self.find_clickable(By.XPATH, "//button[contains(text(),'Sign')] | //a[contains(text(),'Register')]")
        btn.click()
        logger.info("Clicked signup button")
        return self
    
    def get_nav_links(self):
        """Get all navigation links"""
        return self.find_elements(*self.NAV_LINKS)


class ScannerPage(BasePage):
    """Page Object for Email Scanner Page"""
    
    # Locators
    EMAIL_INPUT = (By.CSS_SELECTOR, "textarea, input[type='text'][name*='email'], #email-input")
    SCAN_BUTTON = (By.CSS_SELECTOR, "button[type='submit'], button:contains('Scan'), .scan-btn")
    RESULT_CONTAINER = (By.CSS_SELECTOR, ".result, [class*='result'], .scan-result")
    CONFIDENCE_SCORE = (By.CSS_SELECTOR, "[class*='confidence'], .score, [data-testid='confidence']")
    RISK_LEVEL = (By.CSS_SELECTOR, "[class*='risk'], .risk-level, [data-testid='risk-level']")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error, [class*='error'], [role='alert']")
    LOADING_SPINNER = (By.CSS_SELECTOR, ".spinner, [class*='loading'], .loader")
    
    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.base_url = base_url
    
    def open(self):
        """Navigate to scanner page"""
        self.driver.get(f"{self.base_url}/scanner")
        self.wait_for_page_load()
        logger.info("Opened scanner page")
        return self
    
    def open_public_scanner(self):
        """Navigate to public scanner page"""
        self.driver.get(f"{self.base_url}/scan")
        self.wait_for_page_load()
        logger.info("Opened public scanner page")
        return self
    
    def enter_email_text(self, text):
        """Enter email text to scan"""
        input_field = self.find_element(By.CSS_SELECTOR, "textarea")
        input_field.clear()
        input_field.send_keys(text)
        logger.info(f"Entered email text: {text[:50]}...")
        return self
    
    def click_scan(self):
        """Click scan button"""
        btn = self.find_clickable(By.XPATH, "//button[contains(text(),'Scan') or contains(text(),'Analyze')]")
        btn.click()
        logger.info("Clicked scan button")
        return self
    
    def wait_for_result(self, timeout=15):
        """Wait for scan result to appear"""
        try:
            # Wait for loading to disappear
            WebDriverWait(self.driver, timeout).until(
                EC.invisibility_of_element_located(self.LOADING_SPINNER)
            )
            # Wait for result to appear
            self.wait.until(EC.presence_of_element_located(self.RESULT_CONTAINER))
            logger.info("Scan result appeared")
            return True
        except:
            return False
    
    def get_confidence_score(self):
        """Get the confidence score from result"""
        try:
            element = self.find_element(*self.CONFIDENCE_SCORE)
            return element.text
        except:
            return None
    
    def get_risk_level(self):
        """Get the risk level from result"""
        try:
            element = self.find_element(*self.RISK_LEVEL)
            return element.text
        except:
            return None
    
    def get_error_message(self):
        """Get error message if present"""
        try:
            element = self.find_element(*self.ERROR_MESSAGE)
            return element.text
        except:
            return None
    
    def is_result_displayed(self):
        """Check if result is displayed"""
        try:
            self.find_element(*self.RESULT_CONTAINER)
            return True
        except:
            return False


class LoginPage(BasePage):
    """Page Object for Login/Auth Modal"""
    
    # Locators
    EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email'], input[name='email']")
    PASSWORD_INPUT = (By.CSS_SELECTOR, "input[type='password'], input[name='password']")
    LOGIN_SUBMIT = (By.CSS_SELECTOR, "button[type='submit'], button:contains('Login')")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error, [class*='error'], [role='alert']")
    GOOGLE_LOGIN = (By.CSS_SELECTOR, "[class*='google'], button:contains('Google')")
    FORGOT_PASSWORD = (By.CSS_SELECTOR, "a[href*='forgot'], [class*='forgot']")
    REGISTER_LINK = (By.CSS_SELECTOR, "a[href*='register'], [class*='register']")
    
    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.base_url = base_url
    
    def open(self):
        """Navigate to login page"""
        self.driver.get(f"{self.base_url}/login")
        self.wait_for_page_load()
        logger.info("Opened login page")
        return self
    
    def enter_email(self, email):
        """Enter email"""
        input_field = self.find_element(*self.EMAIL_INPUT)
        input_field.clear()
        input_field.send_keys(email)
        logger.info(f"Entered email: {email}")
        return self
    
    def enter_password(self, password):
        """Enter password"""
        input_field = self.find_element(*self.PASSWORD_INPUT)
        input_field.clear()
        input_field.send_keys(password)
        logger.info("Entered password: ****")
        return self
    
    def click_login(self):
        """Click login button"""
        btn = self.find_clickable(*self.LOGIN_SUBMIT)
        btn.click()
        logger.info("Clicked login submit button")
        return self
    
    def login(self, email, password):
        """Complete login flow"""
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()
        return self
    
    def click_google_login(self):
        """Click Google login button"""
        btn = self.find_clickable(*self.GOOGLE_LOGIN)
        btn.click()
        logger.info("Clicked Google login button")
        return self
    
    def get_error_message(self):
        """Get error message"""
        try:
            element = self.find_element(*self.ERROR_MESSAGE)
            return element.text
        except:
            return None
    
    def is_login_form_visible(self):
        """Check if login form is visible"""
        try:
            self.find_element(*self.EMAIL_INPUT)
            self.find_element(*self.PASSWORD_INPUT)
            return True
        except:
            return False


class DashboardPage(BasePage):
    """Page Object for Dashboard Page"""
    
    # Locators
    STATS_CARDS = (By.CSS_SELECTOR, ".stat-card, [class*='stat'], .card")
    SCAN_HISTORY = (By.CSS_SELECTOR, ".history, [class*='history'], table")
    QUICK_SCAN = (By.CSS_SELECTOR, ".quick-scan, [class*='quick']")
    USER_MENU = (By.CSS_SELECTOR, ".user-menu, [class*='avatar'], [class*='profile']")
    LOGOUT_BUTTON = (By.CSS_SELECTOR, "button:contains('Logout'), a[href*='logout']")
    TOTAL_SCANS = (By.CSS_SELECTOR, "[data-testid='total-scans'], .total-scans")
    
    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.base_url = base_url
    
    def open(self):
        """Navigate to dashboard"""
        self.driver.get(f"{self.base_url}/dashboard")
        self.wait_for_page_load()
        logger.info("Opened dashboard page")
        return self
    
    def is_dashboard_loaded(self):
        """Check if dashboard is loaded"""
        try:
            self.find_element(*self.STATS_CARDS)
            return True
        except:
            return "dashboard" in self.driver.current_url.lower()
    
    def get_stats_cards(self):
        """Get all stats cards"""
        return self.find_elements(*self.STATS_CARDS)
    
    def click_logout(self):
        """Click logout button"""
        # First click user menu if needed
        try:
            menu = self.find_clickable(*self.USER_MENU)
            menu.click()
            time.sleep(0.5)
        except:
            pass
        
        btn = self.find_clickable(By.XPATH, "//button[contains(text(),'Logout')] | //a[contains(text(),'Logout')]")
        btn.click()
        logger.info("Clicked logout button")
        return self


class AnalyticsPage(BasePage):
    """Page Object for Analytics Page"""
    
    # Locators
    CHARTS = (By.CSS_SELECTOR, ".chart, canvas, [class*='chart'], svg")
    DATE_FILTER = (By.CSS_SELECTOR, "select[name*='date'], [class*='date-filter']")
    EXPORT_BUTTON = (By.CSS_SELECTOR, "button:contains('Export'), [class*='export']")
    DETECTION_RATE = (By.CSS_SELECTOR, "[class*='detection'], [data-testid='detection-rate']")
    
    def __init__(self, driver, base_url="http://localhost:5173"):
        super().__init__(driver)
        self.base_url = base_url
    
    def open(self):
        """Navigate to analytics page"""
        self.driver.get(f"{self.base_url}/analytics")
        self.wait_for_page_load()
        logger.info("Opened analytics page")
        return self
    
    def is_charts_displayed(self):
        """Check if charts are displayed"""
        try:
            charts = self.find_elements(*self.CHARTS)
            return len(charts) > 0
        except:
            return False
    
    def click_export(self):
        """Click export button"""
        btn = self.find_clickable(*self.EXPORT_BUTTON)
        btn.click()
        logger.info("Clicked export button")
        return self
