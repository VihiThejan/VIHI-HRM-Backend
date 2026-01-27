@echo off
echo Testing desktop app manual launch...
echo.
echo This will launch the desktop app with test parameters
echo.
pause

start "" "D:\Projects\HRM\VIHI-HRM-Backend\desktop-tracker\dist\VIHI-TimeTracker.exe" "vihi-tracker://start?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MmVhNDBjZWIwOTQ5NTBjMDdiNGVhMiIsImlhdCI6MTczNzk5MzU3NiwiZXhwIjoxNzM4MDc5OTc2fQ.PutBiLmxdVlgCrLe7cF9iMgqh3fCXL9qN0HQINhHmjk&name=Test%20User&ws_url=ws://localhost:5000&api_url=http://localhost:5000/api"

echo.
echo Desktop app should have launched.
echo Check your taskbar or system tray for the app window.
echo.
pause
