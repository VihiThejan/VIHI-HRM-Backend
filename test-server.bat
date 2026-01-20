@echo off
echo Starting backend server...
cd /d "d:\vihin\Documents\Github\HRM\VIHI-HRM-Backend"

start /B npm start > server-output.txt 2>&1

echo Waiting 6 seconds for server to start...
timeout /t 6 /nobreak > nul

echo Testing API endpoint...
curl http://localhost:3001/api/employees

echo.
echo Checking if server is still running...
tasklist | findstr node.exe

echo.
echo Server output:
type server-output.txt

pause
