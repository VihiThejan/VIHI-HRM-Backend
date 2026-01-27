@echo off
echo Protocol URL received: %1 > debug_launch.log
echo Time: %date% %time% >> debug_launch.log
echo. >> debug_launch.log

"%~dp0dist\VIHI-TimeTracker.exe" %1

echo Exit code: %ERRORLEVEL% >> debug_launch.log
