# 🛡️ OWASP ZAP Testing Scripts for PhishGuard

This directory contains automated scripts and tools for comprehensive security testing of the PhishGuard phishing detection platform using OWASP ZAP.

## 📁 Directory Structure

```
zap_testing_scripts/
├── README.md                           # This file
├── install_zap_windows.ps1            # PowerShell script for ZAP installation
├── run_security_tests.bat             # Batch script for automated testing
├── api_security_test.py               # Python script for API security testing
├── performance_test.py                # Python script for performance testing
└── test_scenarios.md                  # Detailed test scenarios documentation
```

## 🚀 Quick Start

### 1. Install OWASP ZAP

**Option A: Automated Installation (Recommended)**
```powershell
# Run PowerShell as Administrator
.\install_zap_windows.ps1
```

**Option B: Manual Installation**
1. Download Java JDK from https://adoptium.net/
2. Download OWASP ZAP from https://www.zaproxy.org/download/
3. Extract to `C:\Program Files\OWASP ZAP\`
4. Create desktop shortcut

### 2. Start Your Application

```bash
# Terminal 1: Start Backend
cd backend
python app.py

# Terminal 2: Start Frontend
cd frontend
npm run dev
```

### 3. Run Automated Security Tests

```bash
# Run the automated testing script
.\run_security_tests.bat
```

### 4. Run API Security Tests

```bash
# Test API endpoints for vulnerabilities
python api_security_test.py

# Test with custom base URL
python api_security_test.py http://localhost:5000
```

### 5. Run Performance Tests

```bash
# Test application performance
python performance_test.py

# Test with custom base URL
python performance_test.py http://localhost:5000
```

## 📋 Prerequisites

### System Requirements
- **Windows 10/11** (64-bit)
- **Java 8 or higher**
- **Python 3.8+**
- **4GB RAM minimum** (8GB recommended)
- **2GB free disk space**

### Python Dependencies
```bash
pip install requests psutil
```

### Application Requirements
- **Backend running** on `http://localhost:5000`
- **Frontend running** on `http://localhost:5173`
- **MongoDB running** on `localhost:27017`

## 🔧 Script Descriptions

### `install_zap_windows.ps1`
PowerShell script that automates the complete installation of OWASP ZAP on Windows:
- Downloads and installs ZAP
- Creates desktop shortcuts
- Configures system PATH
- Sets up configuration files
- Tests installation

**Usage:**
```powershell
# Run as Administrator
.\install_zap_windows.ps1

# Custom version and path
.\install_zap_windows.ps1 -ZapVersion "2.14.0" -InstallPath "D:\Security Tools\ZAP"
```

### `run_security_tests.bat`
Batch script that automates the entire security testing process:
- Starts your application
- Runs OWASP ZAP automated scans
- Generates HTML reports
- Opens results automatically

**Usage:**
```cmd
# Run from project root
.\zap_testing_scripts\run_security_tests.bat
```

### `api_security_test.py`
Python script that performs comprehensive API security testing:
- SQL injection testing
- XSS testing
- Authentication bypass testing
- Rate limiting testing
- CORS misconfiguration testing
- Input validation testing
- JWT vulnerability testing

**Usage:**
```bash
# Basic testing
python api_security_test.py

# Custom base URL
python api_security_test.py http://localhost:5000

# Output files generated:
# - api_security_report.json (detailed results)
# - api_security_summary.txt (summary)
```

### `performance_test.py`
Python script that tests application performance and identifies bottlenecks:
- Response time testing
- Concurrent user testing
- Memory usage monitoring
- Load testing
- Stress testing
- Performance recommendations

**Usage:**
```bash
# Basic performance testing
python performance_test.py

# Custom base URL
python performance_test.py http://localhost:5000

# Output files generated:
# - performance_report.json (detailed results)
# - performance_summary.txt (summary)
```

## 📊 Test Results

### Security Testing Results
After running the security tests, you'll find:

1. **OWASP ZAP Reports:**
   - `zap_report.html` - Main security report
   - `zap_alerts.json` - Detailed alerts

2. **API Security Reports:**
   - `api_security_report.json` - Detailed API test results
   - `api_security_summary.txt` - Summary of findings

3. **Performance Reports:**
   - `performance_report.json` - Detailed performance metrics
   - `performance_summary.txt` - Performance summary

### Understanding Results

#### Security Risk Levels
- **CRITICAL**: Immediate attention required
- **HIGH**: Address in next sprint
- **MEDIUM**: Plan for future release
- **LOW**: Monitor and document

#### Performance Metrics
- **Response Time**: < 2s (good), < 5s (acceptable), > 5s (needs optimization)
- **Success Rate**: > 95% (good), > 90% (acceptable), < 90% (needs investigation)
- **Concurrent Users**: Test with 10, 50, 100, 200 users

## 🎯 Testing Scenarios

### 1. Authentication Testing
- Registration bypass attempts
- Login brute force attacks
- JWT token manipulation
- Session management testing

### 2. Input Validation Testing
- SQL injection attempts
- XSS payload testing
- Path traversal attempts
- Command injection testing

### 3. API Security Testing
- CORS misconfiguration
- Rate limiting bypass
- Information disclosure
- Authorization testing

### 4. Performance Testing
- Load testing (10-200 concurrent users)
- Stress testing (extreme load)
- Memory usage monitoring
- Response time analysis

### 5. Frontend Security Testing
- XSS vulnerability testing
- CSRF protection testing
- Clickjacking prevention
- Content Security Policy

## 🔍 Manual Testing with OWASP ZAP

### 1. Start ZAP
```bash
# Desktop shortcut or
"C:\Program Files\OWASP ZAP\zap.bat"
```

### 2. Configure Browser Proxy
- Set proxy to `127.0.0.1:8080`
- Install ZAP certificate if prompted

### 3. Spider Scan
1. Add target: `http://localhost:5173`
2. Right-click → Attack → Spider
3. Monitor progress in Spider tab

### 4. Active Scan
1. Select URLs from spider results
2. Right-click → Attack → Active Scan
3. Monitor progress in Active Scan tab

### 5. Manual Testing
1. Use intercepting proxy
2. Modify requests in real-time
3. Test parameter manipulation
4. Use fuzzer for input testing

## 🛠️ Troubleshooting

### Common Issues

#### ZAP Won't Start
```bash
# Check Java installation
java -version

# Check ZAP installation
dir "C:\Program Files\OWASP ZAP"
```

#### Connection Refused
```bash
# Check if application is running
curl http://localhost:5000/api/health
curl http://localhost:5173
```

#### Certificate Issues
1. Open ZAP
2. Tools → Options → Dynamic SSL Certificates
3. Save certificate
4. Install in browser

#### Performance Issues
```bash
# Check system resources
tasklist | findstr java
tasklist | findstr python
```

### Error Messages

#### "Java not found"
- Install Java JDK 8 or higher
- Add Java to system PATH
- Restart PowerShell

#### "ZAP not found"
- Run installation script as Administrator
- Check installation path
- Verify file permissions

#### "Connection timeout"
- Check if application is running
- Verify ports (5000, 5173)
- Check firewall settings

## 📈 Continuous Integration

### GitHub Actions Example
```yaml
name: Security Testing
on: [push, pull_request]
jobs:
  zap-test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install Java
        uses: actions/setup-java@v2
        with:
          java-version: '11'
      - name: Install OWASP ZAP
        run: |
          # Download and install ZAP
      - name: Start Application
        run: |
          # Start your application
      - name: Run Security Tests
        run: |
          python zap_testing_scripts/api_security_test.py
      - name: Upload Results
        uses: actions/upload-artifact@v2
        with:
          name: security-results
          path: api_security_report.json
```

## 📚 Additional Resources

### Documentation
- [OWASP ZAP User Guide](https://www.zaproxy.org/docs/desktop/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tools
- [Burp Suite](https://portswigger.net/burp) - Alternative to ZAP
- [Nessus](https://www.tenable.com/products/nessus) - Vulnerability scanner
- [Metasploit](https://www.metasploit.com/) - Penetration testing framework

### Communities
- [OWASP Community](https://owasp.org/www-community/)
- [ZAP Users Group](https://groups.google.com/group/zaproxy-users)
- [Security Stack Exchange](https://security.stackexchange.com/)

## 🤝 Contributing

### Adding New Tests
1. Create new test script in this directory
2. Follow naming convention: `*_test.py`
3. Include comprehensive documentation
4. Add to this README

### Improving Existing Tests
1. Fork the repository
2. Create feature branch
3. Make improvements
4. Submit pull request

### Reporting Issues
1. Check troubleshooting section
2. Search existing issues
3. Create detailed bug report
4. Include logs and screenshots

## 📄 License

This testing suite is part of the PhishGuard project and follows the same license terms.

---

## 🎯 Next Steps

1. **Install OWASP ZAP** using the provided script
2. **Run automated tests** to get baseline results
3. **Review findings** and prioritize remediation
4. **Implement fixes** based on test results
5. **Re-run tests** to verify improvements
6. **Set up continuous testing** for ongoing security

Remember: Security testing is an ongoing process, not a one-time activity. Regular testing helps maintain a strong security posture and protects your users from potential threats. 