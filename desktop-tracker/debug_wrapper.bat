@echo off
REM This wrapper will help debug the desktop app launch
REM It will log all arguments and keep the window open to see errors

echo ========================================
echo VIHI TimeTracker Debug Launcher
echo ========================================
echo.
echo Launch Time: %date% %time%
echo.
echo Arguments received:
echo %*
echo.
echo ========================================
echo.

REM Launch the actual executable
"D:\Projects\HRM\VIHI-HRM-Backend\desktop-tracker\dist\VIHI-TimeTracker.exe" %*

REM Check the exit code
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo ERROR: App exited with code %ERRORLEVEL%
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo App exited normally
    echo ========================================
    echo.
)

REM Keep window open to see any errors
echo.
echo Press any key to close this window...
pause >nul
