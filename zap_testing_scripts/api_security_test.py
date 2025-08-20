#!/usr/bin/env python3
"""
PhishGuard API Security Testing Script
Tests API endpoints for common security vulnerabilities
"""

try:
    import requests
except ImportError:
    print("ERROR: requests module not found!")
    print("Install with: pip install requests")
    sys.exit(1)

import json
import time
import sys
from urllib.parse import urljoin
import threading
from concurrent.futures import ThreadPoolExecutor

class APISecurityTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        self.auth_token = None
        
    def log_result(self, test_name, endpoint, status_code, response_text, vulnerability_type, severity):
        """Log test results"""
        result = {
            "test_name": test_name,
            "endpoint": endpoint,
            "status_code": status_code,
            "response": response_text[:200] + "..." if len(response_text) > 200 else response_text,
            "vulnerability_type": vulnerability_type,
            "severity": severity,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        self.results.append(result)
        print(f"[{severity.upper()}] {test_name}: {endpoint} - Status: {status_code}")

    def test_sql_injection(self):
        """Test for SQL injection vulnerabilities"""
        print("\n=== Testing SQL Injection ===")
        
        # SQL injection payloads
        payloads = [
            "' OR 1=1--",
            "'; DROP TABLE users; --",
            "' UNION SELECT * FROM users--",
            "admin'--",
            "1' OR '1'='1",
            "1'; INSERT INTO users VALUES ('hacker','hacked');--"
        ]
        
        endpoints = [
            "/api/auth/login",
            "/api/auth/register",
            "/api/scan"
        ]
        
        for endpoint in endpoints:
            for payload in payloads:
                try:
                    if endpoint in ["/api/auth/login", "/api/auth/register"]:
                        data = {
                            "email": payload,
                            "password": "test123"
                        }
                        response = self.session.post(urljoin(self.base_url, endpoint), 
                                                   json=data, timeout=10)
                    else:
                        data = {
                            "emailText": payload,
                            "language": "auto"
                        }
                        response = self.session.post(urljoin(self.base_url, endpoint), 
                                                   json=data, timeout=10)
                    
                    # Check for SQL error messages
                    error_indicators = [
                        "sql", "mysql", "postgresql", "sqlite", "database", 
                        "syntax error", "mysql_fetch", "ORA-", "SQLSTATE"
                    ]
                    
                    if any(indicator in response.text.lower() for indicator in error_indicators):
                        self.log_result("SQL Injection", endpoint, response.status_code, 
                                      response.text, "SQL Injection", "HIGH")
                    
                except Exception as e:
                    self.log_result("SQL Injection", endpoint, 0, str(e), "SQL Injection", "MEDIUM")

    def test_xss(self):
        """Test for XSS vulnerabilities"""
        print("\n=== Testing XSS ===")
        
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "javascript:alert('XSS')",
            "<svg onload=alert('XSS')>",
            "';alert('XSS');//"
        ]
        
        endpoints = [
            "/api/scan",
            "/api/auth/register"
        ]
        
        for endpoint in endpoints:
            for payload in xss_payloads:
                try:
                    if endpoint == "/api/auth/register":
                        data = {
                            "email": f"test{payload}@test.com",
                            "password": "test123",
                            "name": payload
                        }
                    else:
                        data = {
                            "emailText": payload,
                            "language": "auto"
                        }
                    
                    response = self.session.post(urljoin(self.base_url, endpoint), 
                                               json=data, timeout=10)
                    
                    # Check if payload is reflected in response
                    if payload in response.text:
                        self.log_result("XSS", endpoint, response.status_code, 
                                      response.text, "Cross-Site Scripting", "HIGH")
                    
                except Exception as e:
                    self.log_result("XSS", endpoint, 0, str(e), "Cross-Site Scripting", "MEDIUM")

    def test_authentication_bypass(self):
        """Test for authentication bypass vulnerabilities"""
        print("\n=== Testing Authentication Bypass ===")
        
        protected_endpoints = [
            "/api/auth/me",
            "/api/history",
            "/api/analytics"
        ]
        
        # Test without authentication
        for endpoint in protected_endpoints:
            try:
                response = self.session.get(urljoin(self.base_url, endpoint), timeout=10)
                if response.status_code == 200:
                    self.log_result("Auth Bypass", endpoint, response.status_code, 
                                  response.text, "Authentication Bypass", "CRITICAL")
                elif response.status_code == 401:
                    print(f"[INFO] {endpoint} properly requires authentication")
                    
            except Exception as e:
                self.log_result("Auth Bypass", endpoint, 0, str(e), "Authentication Bypass", "MEDIUM")

    def test_rate_limiting(self):
        """Test for rate limiting vulnerabilities"""
        print("\n=== Testing Rate Limiting ===")
        
        endpoint = "/api/scan"
        requests_made = 0
        
        # Make rapid requests
        for i in range(50):
            try:
                data = {
                    "emailText": f"Test email {i}",
                    "language": "auto"
                }
                response = self.session.post(urljoin(self.base_url, endpoint), 
                                           json=data, timeout=5)
                requests_made += 1
                
                if response.status_code == 429:  # Too Many Requests
                    print(f"[INFO] Rate limiting detected after {requests_made} requests")
                    break
                    
            except Exception as e:
                break
        
        if requests_made >= 50:
            self.log_result("Rate Limiting", endpoint, 200, 
                          f"Made {requests_made} requests without rate limiting", 
                          "Rate Limiting Bypass", "MEDIUM")

    def test_cors_misconfiguration(self):
        """Test for CORS misconfiguration"""
        print("\n=== Testing CORS Configuration ===")
        
        endpoints = [
            "/api/scan",
            "/api/auth/login",
            "/api/health"
        ]
        
        for endpoint in endpoints:
            try:
                headers = {
                    "Origin": "https://malicious-site.com",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                }
                
                response = self.session.options(urljoin(self.base_url, endpoint), 
                                              headers=headers, timeout=10)
                
                # Check if CORS headers allow malicious origin
                cors_headers = response.headers.get("Access-Control-Allow-Origin", "")
                if cors_headers == "*" or "malicious-site.com" in cors_headers:
                    self.log_result("CORS Misconfig", endpoint, response.status_code, 
                                  str(response.headers), "CORS Misconfiguration", "HIGH")
                    
            except Exception as e:
                self.log_result("CORS Misconfig", endpoint, 0, str(e), "CORS Misconfiguration", "MEDIUM")

    def test_information_disclosure(self):
        """Test for information disclosure"""
        print("\n=== Testing Information Disclosure ===")
        
        # Test for common information disclosure endpoints
        info_endpoints = [
            "/api/health",
            "/robots.txt",
            "/sitemap.xml",
            "/.env",
            "/config",
            "/debug",
            "/phpinfo.php",
            "/server-status"
        ]
        
        for endpoint in info_endpoints:
            try:
                response = self.session.get(urljoin(self.base_url, endpoint), timeout=10)
                
                if response.status_code == 200:
                    # Check for sensitive information
                    sensitive_info = [
                        "password", "secret", "key", "token", "database", 
                        "connection", "config", "environment"
                    ]
                    
                    if any(info in response.text.lower() for info in sensitive_info):
                        self.log_result("Info Disclosure", endpoint, response.status_code, 
                                      response.text, "Information Disclosure", "MEDIUM")
                        
            except Exception as e:
                pass

    def test_input_validation(self):
        """Test for input validation vulnerabilities"""
        print("\n=== Testing Input Validation ===")
        
        malicious_inputs = [
            "../../../etc/passwd",  # Path traversal
            "a" * 10000,  # Buffer overflow attempt
            "null",  # Null byte injection
            "javascript:alert(1)",  # JavaScript injection
            "<script>",  # HTML injection
            "SELECT * FROM users",  # SQL injection
            "{{7*7}}",  # Template injection
            "{{config}}",  # Template injection
        ]
        
        endpoints = [
            "/api/scan",
            "/api/auth/register"
        ]
        
        for endpoint in endpoints:
            for malicious_input in malicious_inputs:
                try:
                    if endpoint == "/api/auth/register":
                        data = {
                            "email": f"{malicious_input}@test.com",
                            "password": malicious_input,
                            "name": malicious_input
                        }
                    else:
                        data = {
                            "emailText": malicious_input,
                            "language": malicious_input
                        }
                    
                    response = self.session.post(urljoin(self.base_url, endpoint), 
                                               json=data, timeout=10)
                    
                    # Check for error handling
                    if response.status_code == 500:
                        self.log_result("Input Validation", endpoint, response.status_code, 
                                      response.text, "Input Validation Failure", "MEDIUM")
                        
                except Exception as e:
                    self.log_result("Input Validation", endpoint, 0, str(e), "Input Validation Failure", "LOW")

    def test_jwt_vulnerabilities(self):
        """Test for JWT vulnerabilities"""
        print("\n=== Testing JWT Vulnerabilities ===")
        
        # Test with invalid JWT tokens
        invalid_tokens = [
            "invalid.token.here",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
            "none.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.signature",
            "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ."
        ]
        
        protected_endpoints = [
            "/api/auth/me",
            "/api/history",
            "/api/analytics"
        ]
        
        for endpoint in protected_endpoints:
            for token in invalid_tokens:
                try:
                    headers = {"Authorization": f"Bearer {token}"}
                    response = self.session.get(urljoin(self.base_url, endpoint), 
                                              headers=headers, timeout=10)
                    
                    if response.status_code == 200:
                        self.log_result("JWT Vulnerability", endpoint, response.status_code, 
                                      response.text, "JWT Bypass", "CRITICAL")
                        
                except Exception as e:
                    self.log_result("JWT Vulnerability", endpoint, 0, str(e), "JWT Bypass", "MEDIUM")

    def run_all_tests(self):
        """Run all security tests"""
        print("Starting PhishGuard API Security Testing...")
        print("=" * 50)
        
        # Run all tests
        self.test_sql_injection()
        self.test_xss()
        self.test_authentication_bypass()
        self.test_rate_limiting()
        self.test_cors_misconfiguration()
        self.test_information_disclosure()
        self.test_input_validation()
        self.test_jwt_vulnerabilities()
        
        # Generate report
        self.generate_report()

    def generate_report(self):
        """Generate security testing report"""
        print("\n" + "=" * 50)
        print("SECURITY TESTING REPORT")
        print("=" * 50)
        
        # Count vulnerabilities by severity
        critical = len([r for r in self.results if r["severity"] == "CRITICAL"])
        high = len([r for r in self.results if r["severity"] == "HIGH"])
        medium = len([r for r in self.results if r["severity"] == "MEDIUM"])
        low = len([r for r in self.results if r["severity"] == "LOW"])
        
        print(f"Critical Vulnerabilities: {critical}")
        print(f"High Risk Vulnerabilities: {high}")
        print(f"Medium Risk Vulnerabilities: {medium}")
        print(f"Low Risk Vulnerabilities: {low}")
        print(f"Total Issues Found: {len(self.results)}")
        
        # Save detailed report
        with open("api_security_report.json", "w") as f:
            json.dump(self.results, f, indent=2)
        
        # Save summary report
        with open("api_security_summary.txt", "w") as f:
            f.write("PhishGuard API Security Testing Summary\n")
            f.write("=" * 40 + "\n\n")
            f.write(f"Critical: {critical}\n")
            f.write(f"High: {high}\n")
            f.write(f"Medium: {medium}\n")
            f.write(f"Low: {low}\n")
            f.write(f"Total: {len(self.results)}\n\n")
            
            for result in self.results:
                f.write(f"[{result['severity']}] {result['test_name']}: {result['endpoint']}\n")
        
        print(f"\nDetailed report saved to: api_security_report.json")
        print(f"Summary report saved to: api_security_summary.txt")

def main():
    """Main function"""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = "http://localhost:5000"
    
    tester = APISecurityTester(base_url)
    tester.run_all_tests()

if __name__ == "__main__":
    main() 