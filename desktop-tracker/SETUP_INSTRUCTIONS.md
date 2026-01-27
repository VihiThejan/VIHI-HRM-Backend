# Desktop Time Tracker Setup Instructions

This guide will help you set up the VIHI Time Tracker desktop application so it can be launched directly from the web interface.

## Prerequisites

- Python 3.8 or higher installed
- Windows OS (for protocol handler)

## One-Time Setup (5 minutes)

### Step 1: Install Dependencies

Open PowerShell or Command Prompt in the `desktop-tracker` folder and run:

```bash
# On Windows, double-click or run:
.\setup.bat

# Or manually:
pip install -r requirements.txt
```

### Step 2: Build the Executable (Optional but Recommended)

```bash
python build.py
```

This creates a standalone `VIHI-TimeTracker.exe` in the `dist` folder that doesn't require Python to run.

### Step 3: Register the Protocol Handler

This allows the web app to launch the desktop app via `vihi-tracker://` URLs:

```bash
# Double-click or run:
.\install_protocol.bat
```

You should see:
```
✓ Protocol 'vihi-tracker://' registered successfully!
```

## How to Use

### From the Web Interface (Easiest)

1. Log in to VIHI HRM
2. Navigate to the **Interns** page
3. Click the **"Start Tracking"** button
4. The desktop app will launch automatically! 🎉

### Manual Launch (Alternative)

If the automatic launch doesn't work:

```bash
# Using the executable
dist\VIHI-TimeTracker.exe --token YOUR_TOKEN --name "Your Name"

# Using Python
python time_tracker.py --token YOUR_TOKEN --name "Your Name"
```

## Troubleshooting

### "vihi-tracker:// protocol not found"

**Solution:** Run `.\install_protocol.bat` again

### App doesn't launch when clicking "Start Tracking"

**Possible causes:**

1. **Protocol not registered**
   - Run `install_protocol.bat` again
   - Restart your browser

2. **Browser blocked the protocol**
   - Some browsers show a confirmation dialog
   - Click "Allow" or "Open" when prompted

3. **Executable not found**
   - Build the app first: `python build.py`
   - Or use the Python script version (will be registered automatically)

### "Failed to connect to server"

**Solution:** Make sure the backend server is running on `localhost:5000`

```bash
cd ..\
npm run dev
```

### Mouse tracking not working

**Solution:** Install pynput:
```bash
pip install pynput
```

## Testing the Setup

### Test Protocol Registration

1. Open Windows Run dialog (Win + R)
2. Type: `vihi-tracker://start?token=test&name=TestUser`
3. Press Enter
4. The app should launch (will fail to connect without a real token)

### Test from Web Browser

1. Open browser console (F12)
2. Run: `window.location.href = 'vihi-tracker://start?token=test&name=TestUser'`
3. The app should launch

## Uninstalling

To remove the protocol handler:

```bash
python protocol_handler.py --unregister
```

## Architecture

```
Web App (Click "Start Tracking")
    ↓
Backend API (/api/time-tracking/launch-token)
    ↓
Returns: vihi-tracker://start?token=xxx&name=yyy&ws_url=...&api_url=...
    ↓
Browser launches: protocol_handler.py
    ↓
Starts: time_tracker.py with parameters
    ↓
Desktop App Connects via WebSocket
```

## Support

For issues, check:
- Backend server is running (`http://localhost:5000/health`)
- You're logged in to the web app
- Protocol is registered (run `install_protocol.bat`)
- Python dependencies are installed (`pip install -r requirements.txt`)
