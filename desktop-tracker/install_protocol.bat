@echo off
echo ========================================
echo VIHI Time Tracker - Install Protocol
echo ========================================
echo.
echo This will register the vihi-tracker:// URL protocol
echo.

set SCRIPT_DIR=%~dp0

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    pause
    exit /b 1
)

if exist "%SCRIPT_DIR%dist\VIHI-TimeTracker.exe" (
    echo Found executable: %SCRIPT_DIR%dist\VIHI-TimeTracker.exe
    python "%SCRIPT_DIR%protocol_handler.py" --register --exe "%SCRIPT_DIR%dist\VIHI-TimeTracker.exe"
) else (
    echo No executable found. Using Python script.
    python "%SCRIPT_DIR%protocol_handler.py" --register
)

echo.
echo Protocol registration complete!
echo.
echo You can now launch the app from the web using vihi-tracker:// links
pause
