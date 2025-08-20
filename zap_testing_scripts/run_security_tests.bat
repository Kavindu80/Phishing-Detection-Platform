@echo off
echo ========================================
echo PhishGuard OWASP ZAP Security Testing
echo ========================================
echo.

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java JDK 8 or higher
    pause
    exit /b 1
)

REM Check if ZAP is installed
if not exist "C:\Program Files\OWASP ZAP\zap.bat" (
    echo ERROR: OWASP ZAP not found in C:\Program Files\OWASP ZAP\
    echo Please install OWASP ZAP first
    pause
    exit /b 1
)

echo Starting PhishGuard application...
echo.

REM Start backend (in background)
echo Starting Backend...
start "PhishGuard Backend" cmd /k "cd backend && python app.py"

REM Wait for backend to start
timeout /t 10 /nobreak >nul

REM Start frontend (in background)
echo Starting Frontend...
start "PhishGuard Frontend" cmd /k "cd frontend && npm run dev"

REM Wait for frontend to start
timeout /t 15 /nobreak >nul

echo.
echo Applications started. Starting OWASP ZAP...
echo.

REM Start OWASP ZAP with automated testing
echo Starting OWASP ZAP automated scan...
"C:\Program Files\OWASP ZAP\zap.bat" -cmd -quickurl http://localhost:5173 -quickout zap_report.html -quickprogress

echo.
echo ========================================
echo Security Testing Complete!
echo ========================================
echo.
echo Reports generated:
echo - zap_report.html (Main security report)
echo - zap_alerts.json (Detailed alerts)
echo.
echo Press any key to open the report...
pause >nul

REM Open the report
start zap_report.html

echo.
echo Testing completed. Press any key to exit...
pause >nul 