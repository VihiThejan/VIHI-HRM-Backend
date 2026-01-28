@echo off
echo ================================================
echo VIHI Time Tracker Debug Wrapper
echo ================================================
echo.
echo Date/Time: %date% %time%
echo Arguments received: %*
echo.
echo Full command line:
echo %*
echo.
echo ================================================
echo Launching time tracker...
echo ================================================
echo.

REM Launch the actual executable
"D:\Projects\HRM\VIHI-HRM-Backend\desktop-tracker\dist\VIHI-TimeTracker.exe" %*

echo.
echo ================================================
echo Time tracker exited with code: %ERRORLEVEL%
echo ================================================
echo.
echo Press any key to close this window...
pause >nul
