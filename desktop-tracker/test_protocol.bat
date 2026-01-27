@echo off
echo ========================================
echo VIHI Time Tracker - Test Protocol
echo ========================================
echo.
echo This will test if the vihi-tracker:// protocol is registered correctly
echo.

echo Testing protocol registration...
echo.

:: Try to launch with test parameters
start "" "vihi-tracker://start?token=test_token_12345&name=Test%%20User&ws_url=ws://localhost:5000&api_url=http://localhost:5000/api"

echo.
echo If the Time Tracker app launched, the protocol is working!
echo If nothing happened, please run: .\install_protocol.bat
echo.
pause
