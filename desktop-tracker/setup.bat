@echo off
echo ========================================
echo VIHI Time Tracker - Windows Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found!
echo.

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To run the application:
echo 1. Run: venv\Scripts\activate.bat
echo 2. Run: python time_tracker.py --token YOUR_TOKEN --name "Your Name"
echo.
echo Or build the executable:
echo   python build.py
echo.
echo Then register the URL protocol:
echo   python protocol_handler.py --register
echo.
pause
