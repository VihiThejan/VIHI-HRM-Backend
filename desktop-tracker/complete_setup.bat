@echo off
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║         VIHI Time Tracker - Complete Setup                    ║
echo ║         This will set up everything needed                    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

echo [Step 1/3] Installing Python dependencies...
echo.
call setup.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [Step 2/3] Building standalone executable...
echo.
python build.py
if %errorlevel% neq 0 (
    echo WARNING: Build failed, will use Python script instead
)

echo.
echo [Step 3/3] Registering protocol handler...
echo.
call install_protocol.bat
if %errorlevel% neq 0 (
    echo ERROR: Failed to register protocol
    pause
    exit /b 1
)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                   SETUP COMPLETE! ✓                           ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo Next steps:
echo   1. Make sure the backend server is running
echo   2. Log in to VIHI HRM web interface
echo   3. Go to Interns page
echo   4. Click "Start Tracking" button
echo   5. The desktop app will launch automatically! 🎉
echo.
echo To test the protocol, run: test_protocol.bat
echo.
pause
