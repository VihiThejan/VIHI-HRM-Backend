# Monitor backend for WebSocket activity
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Monitoring Backend for WebSocket Activity" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Looking for backend process..." -ForegroundColor Yellow

$backendProcess = Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
    $_.MainWindowTitle -match "npm start" -or 
    (Get-NetTCPConnection -OwningProcess $_.Id -LocalPort 5000 -ErrorAction SilentlyContinue)
} | Select-Object -First 1

if ($backendProcess) {
    Write-Host "✓ Backend found (PID: $($backendProcess.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now:" -ForegroundColor Yellow
    Write-Host "1. Click 'Start Tracking' in the web interface"
    Write-Host "2. Allow the protocol handler"
    Write-Host "3. Desktop app should open"
    Write-Host "4. Watch this window for WebSocket logs"
    Write-Host ""
    Write-Host "Waiting for activity... (Press Ctrl+C to stop)" -ForegroundColor Cyan
    Write-Host ""
    
    # This won't work well since we can't tail the node process output
    # But we can check the database periodically
    
    $iteration = 0
    while ($true) {
        Start-Sleep -Seconds 5
        $iteration++
        
        # Check for active sessions
        $sessionCheck = & node check-sessions.js 2>&1 | Out-String
        
        if ($sessionCheck -match "Found (\d+) session") {
            $count = $matches[1]
            if ([int]$count -gt 0) {
                Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] ✓ SESSIONS FOUND: $count" -ForegroundColor Green
                Write-Host $sessionCheck
                break
            }
        }
        
        if ($iteration % 6 -eq 0) {
            Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] Still waiting... (checked $iteration times)" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "✗ Backend not running on port 5000" -ForegroundColor Red
    Write-Host ""
    Write-Host "Start the backend first:" -ForegroundColor Yellow
    Write-Host "  cd D:\Projects\HRM\VIHI-HRM-Backend"
    Write-Host "  npm start"
}
