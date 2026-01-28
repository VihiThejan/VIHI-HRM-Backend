@echo off
echo ====================================
echo VIHI Desktop Tracker - Manual Test
echo ====================================
echo.
echo This will launch the desktop app with your current user token.
echo Watch for:
echo  1. Desktop app window appears
echo  2. "Connected" status in the app  
echo  3. Time starts counting
echo  4. After 30+ seconds, backend should log "heartbeat"
echo.
pause
echo.
echo Launching desktop app...
echo.

cd /d "D:\Projects\HRM\VIHI-HRM-Backend\desktop-tracker"
call venv\Scripts\activate.bat

REM Generate fresh token and launch
node ..\generate-test-launch.js > launch_command.txt

REM Extract the command
for /f "tokens=*" %%i in ('findstr /C:"python.exe" launch_command.txt') do set LAUNCH_CMD=%%i

echo Command: %LAUNCH_CMD%
echo.

REM Launch Python directly so we can see errors
python time_tracker.py --token "PASTE_TOKEN_HERE" --name "Test User" --ws-url "ws://localhost:5000" --api-url "http://localhost:5000/api"

pause
