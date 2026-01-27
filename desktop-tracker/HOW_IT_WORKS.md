# 🎯 How "Start Tracking" Button Works

## User Flow

```
┌─────────────────────────────────────────────┐
│  1. User clicks "Start Tracking" button    │
│     in VIHI HRM Web Interface               │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  2. Frontend calls API:                     │
│     GET /api/time-tracking/launch-token     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  3. Backend generates secure token          │
│     Returns:                                │
│     - launchToken (JWT)                     │
│     - internName                            │
│     - internId                              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  4. Frontend builds protocol URL:           │
│     vihi-tracker://start?                   │
│       token=xxx&                            │
│       name=John+Doe&                        │
│       ws_url=ws://localhost:5000&           │
│       api_url=http://localhost:5000/api     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  5. Browser triggers protocol handler       │
│     (Registered in Windows Registry)        │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  6. Protocol handler executes:              │
│     python time_tracker.py                  │
│       --token xxx                           │
│       --name "John Doe"                     │
│       --ws-url ws://localhost:5000          │
│       --api-url http://localhost:5000/api   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  7. Desktop App Launches! 🎉                │
│     - Shows tracking UI                     │
│     - Connects to WebSocket                 │
│     - Starts monitoring mouse activity      │
└─────────────────────────────────────────────┘
```

## One-Time Setup Required

Before the button can launch the app, you need to:

### 1. Install Dependencies
```bash
cd desktop-tracker
.\setup.bat
```

### 2. Build Executable (Optional)
```bash
python build.py
```

### 3. Register Protocol Handler ⚠️ IMPORTANT
```bash
.\install_protocol.bat
```

This registers `vihi-tracker://` as a custom URL protocol in Windows.

## Testing

### Quick Test
```bash
.\test_protocol.bat
```

### Manual Test
1. Press `Win + R`
2. Type: `vihi-tracker://start?token=test&name=Test`
3. Press Enter
4. App should launch

## Files Modified

### Frontend
- `VIHI_HRM_CORE/app/(dashboard)/dashboard/interns/page.tsx`
  - Updated `handleStartTracking()` to automatically launch app
  - Updated modal to show "Launching..." message

### Backend
- Already has `/api/time-tracking/launch-token` endpoint ✓
- Returns secure token for desktop app authentication ✓

### Desktop App
- `desktop-tracker/time_tracker.py` - Main application
- `desktop-tracker/protocol_handler.py` - Protocol registration
- `desktop-tracker/install_protocol.bat` - Setup script

## Troubleshooting

### "Nothing happens when I click Start Tracking"

**Solution:** Run `.\install_protocol.bat` (in desktop-tracker folder)

### "Browser asks for permission"

**Normal!** Click "Allow" or "Open" to let browser launch the app.

### "App launches but shows error"

Check:
- Backend server running? (`http://localhost:5000/health`)
- Logged in to web app?
- Token valid?

## Success Indicators

✅ Click "Start Tracking"
✅ Desktop app window appears
✅ Shows your name and "Ready to track"
✅ Status changes from "Idle" to "Active" when moving mouse
✅ Time counter starts
✅ Backend receives heartbeats every 30 seconds

## Architecture

```
Web Browser              Desktop App              Backend Server
    │                         │                         │
    │──── Click Button ──────►│                         │
    │                         │                         │
    │◄─── Request Token ──────────────────────────────►│
    │                         │                         │
    │──── Launch URL ────────►│                         │
    │                         │                         │
    │                         │──── WebSocket ─────────►│
    │                         │◄──── Connected ─────────│
    │                         │                         │
    │                         │──── Heartbeat ─────────►│
    │                         │   (every 30s)           │
    │                         │                         │
```

## Benefits

✨ **One-Click Launch** - No manual token copying
✨ **Automatic Authentication** - Token passed securely
✨ **Seamless Integration** - Web ↔ Desktop communication
✨ **Real-time Tracking** - Live updates via WebSocket
✨ **Secure** - Time-limited tokens, encrypted connection
