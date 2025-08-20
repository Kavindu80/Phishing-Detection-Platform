@echo off
echo ========================================
echo PhishGuard Testing Environment Setup
echo ========================================
echo.

echo Installing testing dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo Testing Environment Setup Complete!
echo ========================================
echo.
echo You can now run:
echo - api_security_test.py
echo - performance_test.py
echo - run_security_tests.bat
echo.
pause 