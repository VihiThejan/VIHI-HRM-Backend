@echo off
echo ========================================
echo VIHI Intern Tracker - Install Protocol
echo ========================================
echo.
echo This will register the vihi-intern-tracker:// URL protocol
echo.

set SCRIPT_DIR=%~dp0

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    pause
    exit /b 1
)

if exist "%SCRIPT_DIR%dist\VIHI-InternTracker.exe" (
    echo Found executable: %SCRIPT_DIR%dist\VIHI-InternTracker.exe
    python "%SCRIPT_DIR%protocol_handler.py" --register --exe "%SCRIPT_DIR%dist\VIHI-InternTracker.exe"
) else (
    echo No executable found. Using Python script.
    python "%SCRIPT_DIR%protocol_handler.py" --register
)

echo.
echo Protocol registration complete!
pause
