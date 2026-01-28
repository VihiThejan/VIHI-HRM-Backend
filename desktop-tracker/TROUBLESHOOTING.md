# Time Tracking Troubleshooting Guide

## Issue: Sessions not being saved / Today's Work not updating

### Step 1: Verify Backend is Running
```powershell
Get-Process -Name node | Select-Object Id, ProcessName, StartTime
```
✅ Should show node processes running

### Step 2: Verify Protocol Handler Registration
```powershell
Get-ItemProperty -Path "HKCU:\Software\Classes\vihi-tracker\shell\open\command" -Name "(default)"
```
✅ Should point to debug_wrapper_new.bat

### Step 3: Test Protocol Handler Manually
1. Open browser (Chrome/Edge)
2. Type in address bar: `vihi-tracker://start?token=test&name=Test&ws_url=ws://localhost:5000&api_url=http://localhost:5000/api`
3. Press Enter
4. Browser should ask: "Open debug_wrapper_new.bat?"
5. Click "Open debug_wrapper_new.bat" or "Always allow"
6. A black command window should appear showing arguments

### Step 4: Check if Desktop App Can Launch
```powershell
cd D:\Projects\HRM\VIHI-HRM-Backend\desktop-tracker\dist
.\VIHI-TimeTracker.exe --token test --name "Test User" --ws-url ws://localhost:5000 --api-url http://localhost:5000/api
```
✅ App window should appear (might show connection error with fake token, but should start)

### Step 5: Full Test from Web Interface
1. **IMPORTANT**: Log out and log back in to refresh your token
2. Go to Time Tracker page: http://localhost:3000/dashboard/interns
3. Click "Start Tracking" button
4. Browser asks: "Open debug_wrapper_new.bat?" - Click "Open" or "Always allow"
5. Debug window appears showing the protocol URL
6. Desktop app window should appear
7. After 30 seconds, stop tracking
8. Check "Today's Work" - should show time tracked

### Step 6: Check Backend Logs for WebSocket Connection
```powershell
# In the terminal where backend is running, you should see:
# - "WebSocket client connected: [Your Name]"
# - "Time tracking session started via WebSocket"
# - "Heartbeat received" (every 30 seconds)
# - "Time tracking session ended via WebSocket"
```

### Step 7: Verify Session in Database
```powershell
cd D:\Projects\HRM\VIHI-HRM-Backend
node check-sessions.js
```
✅ Should show at least 1 session for today

## Common Issues and Solutions

### Issue: Browser doesn't ask to open protocol handler
**Solution**: Browser might be blocking it. Try:
- Chrome: chrome://settings/content/protocolHandlers
- Edge: edge://settings/content/protocolHandlers
- Make sure vihi-tracker is allowed

### Issue: Desktop app launches but closes immediately
**Solution**: Check the debug_wrapper window for error messages. Common errors:
- "No module named 'websocket'" - Rebuild exe: `python build.py`
- "Connection refused" - Backend not running
- "Invalid token" - Token expired, log out and log back in

### Issue: "Intern" role has permissionCount: 6 but should have more
**Solution**: User needs to log out and log back in to refresh JWT token with new permissions

### Issue: WebSocket connects but no session created
**Solution**: Check backend logs for errors. MongoDB might not be connected yet.

### Issue: Session created but not showing in "Today's Work"
**Solution**: 
1. Check if frontend is calling correct API endpoint
2. Verify date filtering in database query
3. Check browser console for API errors

## Quick Fix Commands

### Restart Everything
```powershell
# Kill backend
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Kill frontend  
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Kill time tracker
Stop-Process -Name "VIHI-TimeTracker" -Force -ErrorAction SilentlyContinue

# Start backend
cd D:\Projects\HRM\VIHI-HRM-Backend
npm start

# Start frontend (in new terminal)
cd D:\Projects\HRM\VIHI_HRM_CORE
npm run dev
```

### Check Database Sessions
```powershell
cd D:\Projects\HRM\VIHI-HRM-Backend
node check-sessions.js
```

### Verify Permissions
```powershell
cd D:\Projects\HRM\VIHI-HRM-Backend
node check-intern-permissions.js
```
