# VIHI Time Tracker - Complete Setup (PowerShell)
# Run this script: .\setup-all.ps1

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "         VIHI Time Tracker - Complete Setup                    " -ForegroundColor Cyan
Write-Host "         This will set up everything needed                    " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[Step 1/3] Installing Python dependencies..." -ForegroundColor Yellow
Write-Host ""
.\setup.bat
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[Step 2/3] Building standalone executable..." -ForegroundColor Yellow
Write-Host ""
python build.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Build failed, will use Python script instead" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[Step 3/3] Registering protocol handler..." -ForegroundColor Yellow
Write-Host ""
.\install_protocol.bat
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to register protocol" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "                   SETUP COMPLETE!                             " -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Make sure the backend server is running" -ForegroundColor White
Write-Host "  2. Log in to VIHI HRM web interface" -ForegroundColor White
Write-Host "  3. Go to Interns page" -ForegroundColor White
Write-Host "  4. Click Start Tracking button" -ForegroundColor White
Write-Host "  5. The desktop app will launch automatically!" -ForegroundColor Green
Write-Host ""
Write-Host "To test the protocol, run: .\test_protocol.bat" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"
