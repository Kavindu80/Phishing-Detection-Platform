from locust import HttpUser, task, between
import json
import random

class PhishGuardUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Initialize user session."""
        self.test_emails = [
            "This is a legitimate email from your bank.",
            "URGENT: Your account has been compromised! Click here to verify.",
            "You have won $1,000,000! Claim your prize now!",
            "Please update your password for security reasons.",
            "Your package has been delivered. Track it here."
        ]
    
    @task(3)
    def health_check(self):
        """Test health check endpoint."""
        self.client.get("/api/health")
    
    @task(5)
    def public_scan(self):
        """Test public email scanning."""
        email_text = random.choice(self.test_emails)
        payload = {
            "emailText": email_text,
            "language": "auto"
        }
        headers = {"Content-Type": "application/json"}
        self.client.post("/api/scan", 
                        data=json.dumps(payload), 
                        headers=headers)
    
    @task(2)
    def get_analytics(self):
        """Test analytics endpoint."""
        self.client.get("/api/analytics")
    
    @task(1)
    def model_status(self):
        """Test model status endpoint."""
        self.client.get("/api/model/status")

class AuthenticatedUser(PhishGuardUser):
    """User that performs authenticated operations."""
    
    def on_start(self):
        """Login and get authentication token."""
        super().on_start()
        
        # Register user
        register_data = {
            "email": f"test{random.randint(1000, 9999)}@example.com",
            "password": "testpassword123",
            "name": "Test User"
        }
        self.client.post("/api/auth/register",
                        data=json.dumps(register_data),
                        headers={"Content-Type": "application/json"})
        
        # Login to get token
        login_data = {
            "email": register_data["email"],
            "password": register_data["password"]
        }
        response = self.client.post("/api/auth/login",
                                  data=json.dumps(login_data),
                                  headers={"Content-Type": "application/json"})
        
        if response.status_code == 200:
            self.token = json.loads(response.text)["token"]
            self.headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.token}"
            }
        else:
            self.token = None
            self.headers = {"Content-Type": "application/json"}
    
    @task(3)
    def authenticated_scan(self):
        """Test authenticated email scanning."""
        if self.token:
            email_text = random.choice(self.test_emails)
            payload = {
                "emailText": email_text,
                "language": "auto"
            }
            self.client.post("/api/scan/auth",
                           data=json.dumps(payload),
                           headers=self.headers)
    
    @task(1)
    def get_scan_history(self):
        """Test getting scan history."""
        if self.token:
            self.client.get("/api/history", headers=self.headers) 