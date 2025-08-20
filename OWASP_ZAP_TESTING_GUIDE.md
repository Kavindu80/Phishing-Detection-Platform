# 🛡️ OWASP ZAP Security Testing Guide for PhishGuard

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation on Windows](#installation-on-windows)
- [Project Setup for Testing](#project-setup-for-testing)
- [OWASP ZAP Testing Procedures](#owasp-zap-testing-procedures)
- [Security Test Scenarios](#security-test-scenarios)
- [Performance Testing](#performance-testing)
- [Vulnerability Assessment](#vulnerability-assessment)
- [Test Reports and Analysis](#test-reports-and-analysis)
- [Remediation Guidelines](#remediation-guidelines)

## 🎯 Overview

This guide provides comprehensive instructions for using OWASP ZAP (Zed Attack Proxy) to test the PhishGuard phishing detection platform for security vulnerabilities, performance bottlenecks, and potential attack vectors.

### What is OWASP ZAP?

OWASP ZAP is a free, open-source web application security scanner designed to find vulnerabilities in web applications while they are in development and testing. It's designed to be used by people with a wide range of security experience and as such is ideal for developers and functional testers who are new to penetration testing.

### Key Features for Testing PhishGuard:

- **Automated Scanning**: Spider and active scanning capabilities
- **Manual Testing Tools**: Intercepting proxy, fuzzer, and manual request editor
- **API Testing**: REST API testing capabilities
- **Authentication Testing**: Session management and authentication bypass testing
- **Performance Analysis**: Response time and throughput analysis
- **Vulnerability Detection**: SQL injection, XSS, CSRF, and other OWASP Top 10 vulnerabilities

## 🔧 Prerequisites

### System Requirements
- **Windows 10/11** (64-bit)
- **Java 8 or higher** (required for OWASP ZAP)
- **Minimum 4GB RAM** (8GB recommended)
- **2GB free disk space**
- **Internet connection** for downloading and updates

### Project Requirements
- **Backend running** on `http://localhost:5000`
- **Frontend running** on `http://localhost:5173`
- **MongoDB running** on `localhost:27017`
- **Chrome Extension** loaded and configured

## 💻 Installation on Windows

### Step 1: Install Java

1. **Download Java JDK**
   - Visit: https://adoptium.net/
   - Download Eclipse Temurin JDK 17 (LTS) for Windows x64
   - Run the installer and follow the setup wizard

2. **Verify Java Installation**
   ```cmd
   java -version
   javac -version
   ```

### Step 2: Download OWASP ZAP

1. **Download ZAP**
   - Visit: https://www.zaproxy.org/download/
   - Download "ZAP 2.14.0 Windows 64 Bit" (or latest version)
   - Extract to `C:\Program Files\OWASP ZAP\`

2. **Create Desktop Shortcut**
   - Right-click on `zap.bat` in the extracted folder
   - Select "Create shortcut"
   - Move shortcut to Desktop

### Step 3: Initial Setup

1. **Launch ZAP**
   - Double-click the desktop shortcut
   - Accept the license agreement
   - Choose "No, I don't want to persist this session" for testing

2. **Configure Proxy Settings**
   - Go to Tools → Options → Local Proxies
   - Note the proxy address: `127.0.0.1:8080`
   - This will be used for intercepting requests

## 🚀 Project Setup for Testing

### Step 1: Start Your Application

1. **Start Backend**
   ```cmd
   cd backend
   python app.py
   ```
   - Verify: http://localhost:5000/api/health

2. **Start Frontend**
   ```cmd
   cd frontend
   npm run dev
   ```
   - Verify: http://localhost:5173

3. **Start MongoDB**
   ```cmd
   mongod
   ```

### Step 2: Configure Test Data

1. **Create Test User**
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123!",
       "name": "Test User"
     }'
   ```

2. **Login and Get JWT Token**
   ```bash
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPassword123!"
     }'
   ```

## 🔍 OWASP ZAP Testing Procedures

### Phase 1: Information Gathering

#### 1.1 Spider Scan
1. **Open ZAP** and create a new session
2. **Add Target**: Enter `http://localhost:5173` (frontend)
3. **Start Spider**:
   - Right-click on target → Attack → Spider
   - Set scope to "In Scope"
   - Click "Start Scan"
4. **Monitor Progress** in the Spider tab
5. **Review Results** in the Sites tree

#### 1.2 AJAX Spider (for React App)
1. **Configure AJAX Spider**:
   - Tools → Options → Spider → AJAX Spider
   - Set browser to Chrome
   - Set maximum crawl depth to 10
2. **Start AJAX Spider**:
   - Right-click on target → Attack → AJAX Spider
   - Click "Start Scan"

### Phase 2: Active Scanning

#### 2.1 Automated Active Scan
1. **Select Target URLs** from spider results
2. **Start Active Scan**:
   - Right-click on selected URLs → Attack → Active Scan
   - Configure scan policy:
     - **Default Policy**: Standard security tests
     - **Custom Policy**: Focus on specific vulnerabilities
3. **Monitor Scan Progress** in the Active Scan tab
4. **Review Alerts** in the Alerts tab

#### 2.2 API Endpoint Testing
1. **Add API Base URL**: `http://localhost:5000/api`
2. **Test Authentication Endpoints**:
   - POST `/api/auth/register`
   - POST `/api/auth/login`
   - GET `/api/auth/me`
3. **Test Scanning Endpoints**:
   - POST `/api/scan`
   - POST `/api/scan/auth`
   - GET `/api/history`
4. **Test Analytics Endpoints**:
   - GET `/api/analytics`
   - GET `/api/analytics/export`

### Phase 3: Manual Testing

#### 3.1 Intercepting Proxy
1. **Enable Intercept**:
   - Tools → Options → Local Proxies → Intercept
   - Check "Enable intercept"
2. **Configure Browser**:
   - Set proxy to `127.0.0.1:8080`
   - Install ZAP certificate (if prompted)
3. **Intercept Requests**:
   - Browse the application
   - Modify requests in real-time
   - Test parameter manipulation

#### 3.2 Fuzzing
1. **Select Target Request** from History tab
2. **Start Fuzzer**:
   - Right-click → Attack → Fuzzer
   - Select parameters to fuzz
   - Choose payload types:
     - SQL Injection
     - XSS
     - Path Traversal
     - Command Injection
3. **Analyze Results** for successful attacks

## 🎯 Security Test Scenarios

### Scenario 1: Authentication Testing

#### 1.1 Registration Bypass
```bash
# Test with invalid email formats
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": "test"}'

# Test with weak passwords
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com", "password": "123"}'
```

#### 1.2 Login Attacks
```bash
# SQL Injection in email field
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com\' OR 1=1--", "password": "test"}'

# Brute force attack simulation
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"test@test.com\", \"password\": \"password$i\"}"
done
```

#### 1.3 JWT Token Testing
```bash
# Test expired tokens
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer expired_token_here"

# Test malformed tokens
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer invalid_token_format"
```

### Scenario 2: Input Validation Testing

#### 2.1 Email Content Injection
```bash
# XSS in email content
curl -X POST http://localhost:5000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "emailText": "<script>alert(\"XSS\")</script>",
    "language": "auto"
  }'

# SQL Injection in email content
curl -X POST http://localhost:5000/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "emailText": "test\'; DROP TABLE users; --",
    "language": "auto"
  }'
```

#### 2.2 File Upload Testing
```bash
# Test with malicious file types
curl -X POST http://localhost:5000/api/scan \
  -F "file=@malicious.php" \
  -F "language=auto"

# Test with oversized files
curl -X POST http://localhost:5000/api/scan \
  -F "file=@large_file.txt" \
  -F "language=auto"
```

### Scenario 3: Authorization Testing

#### 3.1 Horizontal Privilege Escalation
```bash
# Try to access another user's scan history
curl -X GET http://localhost:5000/api/history/other_user_id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3.2 Vertical Privilege Escalation
```bash
# Try to access admin endpoints
curl -X GET http://localhost:5000/api/admin/users \
  -H "Authorization: Bearer USER_TOKEN"
```

### Scenario 4: API Security Testing

#### 4.1 CORS Testing
```bash
# Test CORS headers
curl -X OPTIONS http://localhost:5000/api/scan \
  -H "Origin: https://malicious-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

#### 4.2 Rate Limiting Testing
```bash
# Test rate limiting
for i in {1..100}; do
  curl -X POST http://localhost:5000/api/scan \
    -H "Content-Type: application/json" \
    -d '{"emailText": "test", "language": "auto"}'
done
```

## ⚡ Performance Testing

### Load Testing with ZAP

#### 1.1 Baseline Performance
1. **Record Baseline**:
   - Use ZAP to record normal user interactions
   - Note response times for key operations
2. **Measure Key Metrics**:
   - Page load times
   - API response times
   - Database query performance

#### 1.2 Stress Testing
1. **Configure Load Test**:
   - Tools → Options → Load Testing
   - Set concurrent users: 10, 50, 100
   - Set test duration: 5 minutes
2. **Run Load Tests**:
   - Select target URLs
   - Start load testing
   - Monitor performance degradation

#### 1.3 Bottleneck Identification
1. **Analyze Response Times**:
   - Identify slow endpoints
   - Check database query performance
   - Monitor memory usage
2. **Resource Monitoring**:
   - CPU usage during tests
   - Memory consumption
   - Network bandwidth

### Performance Test Scenarios

#### Scenario 1: Concurrent User Testing
```bash
# Simulate multiple users scanning emails
for i in {1..20}; do
  curl -X POST http://localhost:5000/api/scan \
    -H "Content-Type: application/json" \
    -d "{\"emailText\": \"Test email $i\", \"language\": \"auto\"}" &
done
wait
```

#### Scenario 2: Large File Processing
```bash
# Test with large email files
curl -X POST http://localhost:5000/api/scan \
  -F "file=@large_email.eml" \
  -F "language=auto"
```

#### Scenario 3: Database Performance
```bash
# Test analytics queries with large datasets
curl -X GET http://localhost:5000/api/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔍 Vulnerability Assessment

### OWASP Top 10 Testing

#### 1. Broken Access Control
- [ ] Test unauthorized access to user data
- [ ] Test horizontal privilege escalation
- [ ] Test vertical privilege escalation
- [ ] Test direct object references

#### 2. Cryptographic Failures
- [ ] Test JWT token security
- [ ] Test password hashing
- [ ] Test HTTPS enforcement
- [ ] Test sensitive data exposure

#### 3. Injection
- [ ] Test SQL injection in all input fields
- [ ] Test NoSQL injection
- [ ] Test command injection
- [ ] Test LDAP injection

#### 4. Insecure Design
- [ ] Test business logic flaws
- [ ] Test authentication bypass
- [ ] Test session management
- [ ] Test authorization flaws

#### 5. Security Misconfiguration
- [ ] Test default configurations
- [ ] Test error handling
- [ ] Test security headers
- [ ] Test CORS configuration

#### 6. Vulnerable Components
- [ ] Test outdated dependencies
- [ ] Test known vulnerabilities
- [ ] Test component security
- [ ] Test library security

#### 7. Authentication Failures
- [ ] Test weak authentication
- [ ] Test session fixation
- [ ] Test brute force attacks
- [ ] Test password policies

#### 8. Software and Data Integrity
- [ ] Test integrity checks
- [ ] Test supply chain security
- [ ] Test update mechanisms
- [ ] Test data validation

#### 9. Security Logging Failures
- [ ] Test audit logging
- [ ] Test log integrity
- [ ] Test log monitoring
- [ ] Test incident response

#### 10. Server-Side Request Forgery
- [ ] Test SSRF vulnerabilities
- [ ] Test URL validation
- [ ] Test network access
- [ ] Test internal service access

## 📊 Test Reports and Analysis

### Generating ZAP Reports

#### 1. HTML Report
1. **Generate Report**:
   - Report → Generate HTML Report
   - Save as `zap_security_report.html`
2. **Include Sections**:
   - Executive Summary
   - Risk Summary
   - Technical Details
   - Recommendations

#### 2. XML Report
1. **Generate XML Report**:
   - Report → Generate XML Report
   - Save as `zap_security_report.xml`
2. **Use for Integration**:
   - CI/CD pipelines
   - Automated analysis
   - Custom reporting

#### 3. JSON Report
1. **Generate JSON Report**:
   - Report → Generate JSON Report
   - Save as `zap_security_report.json`
2. **API Integration**:
   - Custom dashboards
   - Automated alerts
   - Trend analysis

### Report Analysis

#### 1. Risk Assessment
- **High Risk**: Immediate attention required
- **Medium Risk**: Address in next sprint
- **Low Risk**: Monitor and plan fixes
- **Informational**: Best practices and recommendations

#### 2. Trend Analysis
- Compare with previous scans
- Track vulnerability reduction
- Monitor new vulnerabilities
- Assess security posture improvement

#### 3. Compliance Mapping
- Map to OWASP Top 10
- Map to industry standards
- Map to regulatory requirements
- Map to security frameworks

## 🛠️ Remediation Guidelines

### High Priority Fixes

#### 1. SQL Injection
```python
# Before (Vulnerable)
query = f"SELECT * FROM users WHERE email = '{email}'"

# After (Secure)
query = "SELECT * FROM users WHERE email = %s"
cursor.execute(query, (email,))
```

#### 2. XSS Prevention
```python
# Before (Vulnerable)
return f"<div>{user_input}</div>"

# After (Secure)
from markupsafe import escape
return f"<div>{escape(user_input)}</div>"
```

#### 3. JWT Security
```python
# Before (Vulnerable)
app.config['JWT_SECRET_KEY'] = 'weak_secret'

# After (Secure)
import secrets
app.config['JWT_SECRET_KEY'] = secrets.token_urlsafe(32)
```

### Medium Priority Fixes

#### 1. CORS Configuration
```python
# Before (Vulnerable)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# After (Secure)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}})
```

#### 2. Rate Limiting
```python
# Add rate limiting
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)
```

#### 3. Input Validation
```python
# Add comprehensive validation
from marshmallow import Schema, fields, validate

class ScanSchema(Schema):
    emailText = fields.Str(required=True, validate=validate.Length(min=1, max=10000))
    language = fields.Str(validate=validate.OneOf(['auto', 'en', 'si', 'ta', 'hi', 'es', 'fr']))
```

### Low Priority Fixes

#### 1. Security Headers
```python
# Add security headers
from flask_talisman import Talisman

Talisman(app, 
    content_security_policy={
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline'",
        'style-src': "'self' 'unsafe-inline'"
    }
)
```

#### 2. Error Handling
```python
# Secure error handling
@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal error: {error}")
    return jsonify({"error": "An internal error occurred"}), 500
```

#### 3. Logging
```python
# Secure logging
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
app.logger.addHandler(handler)
```

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] OWASP ZAP installed and configured
- [ ] Application running on localhost
- [ ] Test data prepared
- [ ] Browser proxy configured
- [ ] ZAP certificate installed

### Information Gathering
- [ ] Spider scan completed
- [ ] AJAX spider scan completed
- [ ] Site map generated
- [ ] Endpoints identified
- [ ] Technology stack identified

### Vulnerability Scanning
- [ ] Active scan completed
- [ ] Manual testing performed
- [ ] Authentication testing done
- [ ] Authorization testing done
- [ ] Input validation testing done

### Performance Testing
- [ ] Baseline performance measured
- [ ] Load testing completed
- [ ] Stress testing completed
- [ ] Bottlenecks identified
- [ ] Performance recommendations documented

### Reporting
- [ ] HTML report generated
- [ ] XML report generated
- [ ] JSON report generated
- [ ] Risk assessment completed
- [ ] Remediation plan created

## 🔄 Continuous Security Testing

### Automated Testing Setup

#### 1. CI/CD Integration
```yaml
# .github/workflows/security-test.yml
name: Security Testing
on: [push, pull_request]
jobs:
  zap-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run OWASP ZAP
        uses: zaproxy/action-full-scan@v0.4.0
        with:
          target: 'http://localhost:3000'
```

#### 2. Scheduled Scans
```bash
# Weekly security scan script
#!/bin/bash
zap-cli quick-scan --self-contained \
  --start-options "-config api.disablekey=true" \
  http://localhost:5173 \
  --spider \
  --ajax-spider \
  --scan \
  --alert-level High \
  --auto
```

#### 3. Monitoring and Alerting
```python
# Security monitoring script
import requests
import json
from datetime import datetime

def check_security_status():
    zap_api = "http://localhost:8080/JSON/"
    
    # Check for high-risk alerts
    alerts = requests.get(f"{zap_api}core/view/alerts/").json()
    high_risk = [a for a in alerts if a['risk'] == 'High']
    
    if high_risk:
        send_alert(f"High-risk vulnerabilities detected: {len(high_risk)}")
```

## 📞 Support and Resources

### OWASP ZAP Resources
- **Official Documentation**: https://www.zaproxy.org/docs/
- **User Guide**: https://www.zaproxy.org/docs/desktop/
- **API Documentation**: https://www.zaproxy.org/docs/api/
- **Community Forum**: https://groups.google.com/group/zaproxy-users

### Security Testing Resources
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/ssltest/

### PhishGuard Specific
- **Project Repository**: Your GitHub repo
- **API Documentation**: http://localhost:5000/api/docs (if available)
- **Issue Tracking**: GitHub Issues
- **Security Policy**: SECURITY.md

---

## 🎯 Next Steps

1. **Install OWASP ZAP** following the installation guide
2. **Set up your application** for testing
3. **Run initial spider scan** to map the application
4. **Perform active scanning** to identify vulnerabilities
5. **Conduct manual testing** for complex scenarios
6. **Generate comprehensive reports** with findings
7. **Implement remediation** based on priority
8. **Set up continuous testing** for ongoing security

Remember: Security testing is an ongoing process, not a one-time activity. Regular testing helps maintain a strong security posture and protects your users from potential threats. 