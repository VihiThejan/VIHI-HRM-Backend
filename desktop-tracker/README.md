# VIHI HRM Intern Time Tracker - Desktop Application

A Python desktop application that tracks mouse movements and working time for interns.

## Features

- **Mouse Movement Tracking**: Monitors mouse movements and clicks to detect user activity
- **Automatic Idle Detection**: Pauses time tracking after 5 minutes of inactivity
- **Real-time Activity Monitoring**: Shows activity percentage based on recent mouse movements
- **Session Management**: Start/stop work sessions with data synced to the server
- **System Tray Support**: Minimizes to system tray for unobtrusive operation
- **Heartbeat System**: Sends activity data to the server every 30 seconds

## Installation

### Option 1: Run from Source (Development)

1. **Install Python 3.8+** (if not already installed)

2. **Create a virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python intern_tracker.py --token YOUR_JWT_TOKEN --name "John Doe" --api-url http://localhost:5000/api
   ```

### Option 2: Build Standalone Executable

1. **Install PyInstaller:**
   ```bash
   pip install pyinstaller
   ```

2. **Build the executable:**
   ```bash
   pyinstaller --onefile --windowed --name "VIHI-InternTracker" intern_tracker.py
   ```

3. The executable will be in the `dist` folder.

## Command Line Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `--token` | Yes | - | JWT authentication token from login |
| `--name` | No | "Intern" | Intern's display name |
| `--api-url` | No | `http://localhost:5000/api` | Backend API URL |

## How It Works

1. **Start Session**: When you click "Start Working", the app:
   - Sends a request to the server to start a new tracking session
   - Begins monitoring mouse movements
   - Starts counting active working time

2. **Activity Monitoring**: Every second, the app:
   - Checks for mouse movement
   - Updates the activity percentage (based on last 60 seconds)
   - Detects idle state (no movement for 5+ minutes)

3. **Idle Detection**: When idle is detected:
   - Active time counter pauses
   - Status changes to "Idle"
   - Resumes automatically when mouse movement is detected

4. **Heartbeat**: Every 30 seconds, the app sends:
   - Activity percentage
   - Mouse movement count
   - Current active time
   - Idle status

5. **End Session**: When you click "Stop":
   - Final statistics are calculated
   - Data is sent to the server
   - Session is recorded for the day

## Integration with HRM System

This desktop app is designed to work with the VIHI HRM backend. It requires:

1. A valid JWT token (obtained after login)
2. The backend API endpoints:
   - `POST /api/time-tracking/start` - Start session
   - `POST /api/time-tracking/heartbeat` - Send activity data
   - `POST /api/time-tracking/end` - End session

## Troubleshooting

### "Failed to start session"
- Check if the backend server is running
- Verify your authentication token is valid
- Check the API URL is correct

### Low Activity Percentage
- Move your mouse regularly
- The app needs mouse movement to detect activity
- Keyboard activity alone is not tracked (mouse only)

### Application Crashes
- Make sure Python 3.8+ is installed
- All dependencies are installed correctly
- Check the console for error messages
