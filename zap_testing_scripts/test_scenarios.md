# 🛡️ PhishGuard OWASP ZAP Test Scenarios

## 📋 Overview

This document provides detailed test scenarios for using OWASP ZAP to test the PhishGuard phishing detection platform. Each scenario includes specific test cases, expected results, and vulnerability assessment criteria.

## 🎯 Test Environment Setup

### Prerequisites
- OWASP ZAP installed and configured
- PhishGuard backend running on `http://localhost:5000`
- PhishGuard frontend running on `http://localhost:5173`
- MongoDB running on `localhost:27017`
- Test user account created

### Test Data
```json
{
  "test_user": {
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  },
  "test_emails": {
    "legitimate": "Hello, this is a legitimate email from your bank.",
    "phishing": "URGENT: Your account has been suspended. Click here to verify: http://fake-bank.com/verify",
    "malicious": "<script>alert('XSS')</script>Your account needs verification."
  }
}
```

## 🔍 Test Scenarios

### Scenario 1: Authentication Security Testing

#### 1.1 Registration Endpoint Testing

**Objective**: Test user registration for security vulnerabilities

**Test Cases**:

| Test Case | Input | Expected Result | Risk Level |
|-----------|-------|-----------------|------------|
| TC1.1.1 | Valid registration data | 201 Created | Low |
| TC1.1.2 | Duplicate email | 409 Conflict | Low |
| TC1.1.3 | Invalid email format | 400 Bad Request | Low |
| TC1.1.4 | Weak password | 400 Bad Request | Medium |
| TC1.1.5 | SQL injection in email | 400 Bad Request | High |
| TC1.1.6 | XSS in name field | 400 Bad Request | High |
| TC1.1.7 | Very long input | 400 Bad Request | Medium |
| TC1.1.8 | Null values | 400 Bad Request | Low |

**ZAP Configuration**:
```bash
# Active Scan Policy
- SQL Injection
- XSS (Reflected)
- XSS (Stored)
- Path Traversal
- Command Injection
```

#### 1.2 Login Endpoint Testing

**Objective**: Test authentication mechanism for vulnerabilities

**Test Cases**:

| Test Case | Input | Expected Result | Risk Level |
|-----------|-------|-----------------|------------|
| TC1.2.1 | Valid credentials | 200 OK + JWT | Low |
| TC1.2.2 | Invalid credentials | 401 Unauthorized | Low |
| TC1.2.3 | SQL injection in email | 400 Bad Request | High |
| TC1.2.4 | Brute force attack | 429 Too Many Requests | Medium |
| TC1.2.5 | Account enumeration | 401 Unauthorized | Medium |
| TC1.2.6 | JWT manipulation | 401 Unauthorized | High |

**ZAP Configuration**:
```bash
# Fuzzing Payloads
- SQL Injection: [' OR 1=1--', '; DROP TABLE users; --']
- Brute Force: Common passwords list
- JWT Testing: Invalid tokens, expired tokens
```

#### 1.3 Session Management Testing

**Objective**: Test session handling and JWT security

**Test Cases**:

| Test Case | Action | Expected Result | Risk Level |
|-----------|--------|-----------------|------------|
| TC1.3.1 | Valid JWT token | 200 OK | Low |
| TC1.3.2 | Expired JWT token | 401 Unauthorized | Medium |
| TC1.3.3 | Modified JWT payload | 401 Unauthorized | High |
| TC1.3.4 | No JWT token | 401 Unauthorized | Low |
| TC1.3.5 | JWT token replay | 401 Unauthorized | Medium |

### Scenario 2: Email Scanning Security Testing

#### 2.1 Public Scanning Endpoint

**Objective**: Test public email scanning for vulnerabilities

**Test Cases**:

| Test Case | Input | Expected Result | Risk Level |
|-----------|-------|-----------------|------------|
| TC2.1.1 | Valid email content | 200 OK + Analysis | Low |
| TC2.1.2 | SQL injection in email | 400 Bad Request | High |
| TC2.1.3 | XSS in email content | 400 Bad Request | High |
| TC2.1.4 | Very large email | 413 Payload Too Large | Medium |
| TC2.1.5 | Malicious URLs | 200 OK + Warning | Medium |
| TC2.1.6 | File upload attack | 400 Bad Request | High |
| TC2.1.7 | Path traversal | 400 Bad Request | High |
| TC2.1.8 | Command injection | 400 Bad Request | High |

**ZAP Configuration**:
```bash
# Active Scan Policy
- SQL Injection
- XSS (Reflected)
- Path Traversal
- Command Injection
- File Upload
- SSRF
```

#### 2.2 Authenticated Scanning Endpoint

**Objective**: Test authenticated email scanning

**Test Cases**:

| Test Case | Input | Expected Result | Risk Level |
|-----------|-------|-----------------|------------|
| TC2.2.1 | Valid authenticated scan | 200 OK + Analysis | Low |
| TC2.2.2 | Unauthorized access | 401 Unauthorized | Medium |
| TC2.2.3 | Token manipulation | 401 Unauthorized | High |
| TC2.2.4 | Rate limiting | 429 Too Many Requests | Medium |
| TC2.2.5 | Concurrent requests | 200 OK (all) | Low |

### Scenario 3: API Security Testing

#### 3.1 CORS Configuration Testing

**Objective**: Test Cross-Origin Resource Sharing settings

**Test Cases**:

| Test Case | Origin Header | Expected Result | Risk Level |
|-----------|---------------|-----------------|------------|
| TC3.1.1 | Same origin | 200 OK | Low |
| TC3.1.2 | Allowed origin | 200 OK | Low |
| TC3.1.3 | Malicious origin | 403 Forbidden | Medium |
| TC3.1.4 | Wildcard origin | 200 OK | High |
| TC3.1.5 | Null origin | 403 Forbidden | Medium |

**ZAP Configuration**:
```bash
# Manual Testing
- Set Origin header to malicious domains
- Test preflight requests
- Check CORS headers in responses
```

#### 3.2 Rate Limiting Testing

**Objective**: Test rate limiting implementation

**Test Cases**:

| Test Case | Request Pattern | Expected Result | Risk Level |
|-----------|-----------------|-----------------|------------|
| TC3.2.1 | Normal usage | 200 OK | Low |
| TC3.2.2 | Rapid requests | 429 Too Many Requests | Medium |
| TC3.2.3 | Distributed requests | 429 Too Many Requests | Medium |
| TC3.2.4 | Bypass attempts | 429 Too Many Requests | High |

**ZAP Configuration**:
```bash
# Load Testing
- Concurrent users: 10, 50, 100
- Request rate: 100 requests/second
- Duration: 5 minutes
```

#### 3.3 Input Validation Testing

**Objective**: Test input validation and sanitization

**Test Cases**:

| Test Case | Input Type | Test Data | Expected Result | Risk Level |
|-----------|------------|-----------|-----------------|------------|
| TC3.3.1 | Email content | Normal text | 200 OK | Low |
| TC3.3.2 | Email content | SQL injection | 400 Bad Request | High |
| TC3.3.3 | Email content | XSS payload | 400 Bad Request | High |
| TC3.3.4 | Language field | Valid language | 200 OK | Low |
| TC3.3.5 | Language field | Invalid language | 400 Bad Request | Low |
| TC3.3.6 | File upload | Valid file | 200 OK | Low |
| TC3.3.7 | File upload | Malicious file | 400 Bad Request | High |

### Scenario 4: Frontend Security Testing

#### 4.1 XSS Testing

**Objective**: Test for Cross-Site Scripting vulnerabilities

**Test Cases**:

| Test Case | Input Location | Payload | Expected Result | Risk Level |
|-----------|----------------|---------|-----------------|------------|
| TC4.1.1 | Email input | `<script>alert('XSS')</script>` | Sanitized | High |
| TC4.1.2 | Search field | `javascript:alert('XSS')` | Sanitized | High |
| TC4.1.3 | URL parameter | `<img src=x onerror=alert('XSS')>` | Sanitized | High |
| TC4.1.4 | Form field | `<svg onload=alert('XSS')>` | Sanitized | High |

**ZAP Configuration**:
```bash
# XSS Testing
- Reflected XSS
- Stored XSS
- DOM-based XSS
- Blind XSS
```

#### 4.2 CSRF Testing

**Objective**: Test for Cross-Site Request Forgery vulnerabilities

**Test Cases**:

| Test Case | Action | Expected Result | Risk Level |
|-----------|--------|-----------------|------------|
| TC4.2.1 | Valid CSRF token | 200 OK | Low |
| TC4.2.2 | Missing CSRF token | 403 Forbidden | Medium |
| TC4.2.3 | Invalid CSRF token | 403 Forbidden | Medium |
| TC4.2.4 | Reused CSRF token | 403 Forbidden | Medium |

#### 4.3 Clickjacking Testing

**Objective**: Test for clickjacking vulnerabilities

**Test Cases**:

| Test Case | Frame Configuration | Expected Result | Risk Level |
|-----------|-------------------|-----------------|------------|
| TC4.3.1 | X-Frame-Options set | Frame blocked | Low |
| TC4.3.2 | No X-Frame-Options | Frame allowed | High |
| TC4.3.3 | CSP frame-ancestors | Frame blocked | Low |

### Scenario 5: Database Security Testing

#### 5.1 SQL Injection Testing

**Objective**: Test for SQL injection vulnerabilities

**Test Cases**:

| Test Case | Input Field | Payload | Expected Result | Risk Level |
|-----------|-------------|---------|-----------------|------------|
| TC5.1.1 | Email field | `' OR 1=1--` | 400 Bad Request | High |
| TC5.1.2 | Email field | `'; DROP TABLE users; --` | 400 Bad Request | High |
| TC5.1.3 | Email field | `' UNION SELECT * FROM users--` | 400 Bad Request | High |
| TC5.1.4 | Email field | `admin'--` | 400 Bad Request | High |

**ZAP Configuration**:
```bash
# SQL Injection Testing
- Boolean-based
- Time-based
- Error-based
- Union-based
```

#### 5.2 NoSQL Injection Testing

**Objective**: Test for NoSQL injection vulnerabilities

**Test Cases**:

| Test Case | Input Field | Payload | Expected Result | Risk Level |
|-----------|-------------|---------|-----------------|------------|
| TC5.2.1 | Email field | `{"$ne": ""}` | 400 Bad Request | High |
| TC5.2.2 | Email field | `{"$gt": ""}` | 400 Bad Request | High |
| TC5.2.3 | Email field | `{"$regex": ".*"}` | 400 Bad Request | High |

### Scenario 6: File Upload Security Testing

#### 6.1 File Upload Validation

**Objective**: Test file upload security

**Test Cases**:

| Test Case | File Type | Content | Expected Result | Risk Level |
|-----------|-----------|---------|-----------------|------------|
| TC6.1.1 | Valid email file | Normal content | 200 OK | Low |
| TC6.1.2 | PHP file | `<?php system($_GET['cmd']); ?>` | 400 Bad Request | High |
| TC6.1.3 | Executable file | Binary executable | 400 Bad Request | High |
| TC6.1.4 | Large file | >10MB | 413 Payload Too Large | Medium |
| TC6.1.5 | Double extension | `file.php.txt` | 400 Bad Request | High |

### Scenario 7: Performance and Load Testing

#### 7.1 Load Testing

**Objective**: Test application performance under load

**Test Cases**:

| Test Case | Load | Duration | Expected Result | Risk Level |
|-----------|------|----------|-----------------|------------|
| TC7.1.1 | 10 concurrent users | 5 minutes | <2s response time | Low |
| TC7.1.2 | 50 concurrent users | 5 minutes | <5s response time | Medium |
| TC7.1.3 | 100 concurrent users | 5 minutes | <10s response time | High |
| TC7.1.4 | 200 concurrent users | 5 minutes | Graceful degradation | Critical |

**ZAP Configuration**:
```bash
# Load Testing Parameters
- Threads: 10, 50, 100, 200
- Ramp-up period: 30 seconds
- Hold time: 5 minutes
- Monitor: Response time, throughput, error rate
```

#### 7.2 Stress Testing

**Objective**: Test application behavior under extreme load

**Test Cases**:

| Test Case | Load | Expected Result | Risk Level |
|-----------|------|-----------------|------------|
| TC7.2.1 | Maximum concurrent users | Graceful degradation | Medium |
| TC7.2.2 | Memory exhaustion | Error handling | High |
| TC7.2.3 | CPU exhaustion | Throttling | Medium |
| TC7.2.4 | Database connection limit | Connection pooling | High |

### Scenario 8: Information Disclosure Testing

#### 8.1 Error Handling Testing

**Objective**: Test for information disclosure in error messages

**Test Cases**:

| Test Case | Action | Expected Result | Risk Level |
|-----------|--------|-----------------|------------|
| TC8.1.1 | Invalid input | Generic error message | Low |
| TC8.1.2 | Database error | Generic error message | High |
| TC8.1.3 | File not found | Generic error message | Medium |
| TC8.1.4 | Server error | Generic error message | Medium |

#### 8.2 Directory Traversal Testing

**Objective**: Test for directory traversal vulnerabilities

**Test Cases**:

| Test Case | Input | Expected Result | Risk Level |
|-----------|-------|-----------------|------------|
| TC8.2.1 | Normal path | 200 OK | Low |
| TC8.2.2 | `../../../etc/passwd` | 400 Bad Request | High |
| TC8.2.3 | `..\..\..\windows\system32\config\sam` | 400 Bad Request | High |
| TC8.2.4 | URL encoding bypass | 400 Bad Request | High |

## 📊 Test Execution Checklist

### Pre-Testing Setup
- [ ] OWASP ZAP installed and configured
- [ ] Application running and accessible
- [ ] Test data prepared
- [ ] Browser proxy configured
- [ ] ZAP certificate installed
- [ ] Test user account created

### Test Execution
- [ ] Spider scan completed
- [ ] Active scan completed
- [ ] Manual testing performed
- [ ] Authentication testing completed
- [ ] API testing completed
- [ ] Frontend testing completed
- [ ] Performance testing completed

### Post-Testing
- [ ] Results documented
- [ ] Vulnerabilities categorized
- [ ] Risk assessment completed
- [ ] Remediation plan created
- [ ] Report generated

## 🎯 Expected Results

### Security Baseline
- No critical vulnerabilities
- No high-risk vulnerabilities
- Medium-risk vulnerabilities documented
- Low-risk findings noted

### Performance Baseline
- Response time < 2 seconds for normal operations
- Response time < 5 seconds under load
- Error rate < 1%
- Memory usage stable
- CPU usage reasonable

### Compliance Requirements
- OWASP Top 10 compliance
- GDPR compliance (if applicable)
- Industry security standards
- Best practices implementation

## 📈 Success Metrics

### Security Metrics
- Zero critical vulnerabilities
- < 5 high-risk vulnerabilities
- < 10 medium-risk vulnerabilities
- 100% of vulnerabilities remediated

### Performance Metrics
- 95% of requests < 2 seconds
- 99% uptime
- < 1% error rate
- Scalable to 100+ concurrent users

### Quality Metrics
- 100% test coverage
- All test cases executed
- Comprehensive documentation
- Actionable recommendations

## 🔄 Continuous Testing

### Automated Testing
- Daily security scans
- Weekly performance tests
- Monthly comprehensive assessments
- Quarterly penetration testing

### Monitoring
- Real-time security monitoring
- Performance monitoring
- Error tracking
- User feedback analysis

### Updates
- Regular security updates
- Performance optimizations
- Feature enhancements
- Documentation updates 