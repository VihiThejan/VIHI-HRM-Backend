"""
VIHI IT Solutions - HR Time Tracking Client
Python Desktop Activity Tracker

This script monitors:
- Active window title
- Mouse movements
- Keyboard presses
- Idle time detection

Sends data to backend API every 60 seconds.

Requirements:
    pip install pywin32 pynput requests python-dotenv

Usage:
    python tracker_client.py
"""

import time
import json
import requests
import socket
import platform
from datetime import datetime
from collections import deque
from threading import Thread, Lock
import os
from dotenv import load_dotenv

try:
    # Windows-specific imports
    import win32gui
    import win32process
    import psutil
except ImportError:
    print("⚠️  Windows-specific modules not found. Install: pip install pywin32 psutil")
    exit(1)

try:
    from pynput import mouse, keyboard
except ImportError:
    print("⚠️  pynput not found. Install: pip install pynput")
    exit(1)

# Load environment variables
load_dotenv()

# ============================================
# CONFIGURATION
# ============================================
API_URL = os.getenv('API_URL', 'http://localhost:5000/api/activity/log')
API_KEY = os.getenv('ACTIVITY_API_KEY', 'your-api-key-here')
EMPLOYEE_ID = os.getenv('EMPLOYEE_ID', 'EMP001')
TRACKING_INTERVAL = int(os.getenv('TRACKING_INTERVAL', '60'))  # seconds
IDLE_THRESHOLD = int(os.getenv('IDLE_THRESHOLD', '300'))  # seconds (5 minutes)

# ============================================
# ACTIVITY TRACKER CLASS
# ============================================
class ActivityTracker:
    def __init__(self):
        self.mouse_moves = 0
        self.keyboard_presses = 0
        self.last_activity_time = time.time()
        self.current_window = "Unknown"
        self.lock = Lock()
        self.is_running = True
        
        # Get device info
        self.device_info = {
            'hostname': socket.gethostname(),
            'os': f"{platform.system()} {platform.release()}",
            'ipAddress': self.get_local_ip()
        }
        
        print(f"🖥️  Device: {self.device_info['hostname']}")
        print(f"💻 OS: {self.device_info['os']}")
        print(f"👤 Employee ID: {EMPLOYEE_ID}")
        print(f"📡 API URL: {API_URL}")
        print("="*60)
    
    def get_local_ip(self):
        """Get local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def get_active_window(self):
        """Get the title of the currently active window"""
        try:
            window = win32gui.GetForegroundWindow()
            window_title = win32gui.GetWindowText(window)
            
            # Get process name
            try:
                _, pid = win32process.GetWindowThreadProcessId(window)
                process = psutil.Process(pid)
                process_name = process.name()
                return f"{process_name} - {window_title}" if window_title else process_name
            except:
                return window_title or "Unknown"
        except:
            return "Unknown"
    
    def on_mouse_move(self, x, y):
        """Callback for mouse movement"""
        with self.lock:
            self.mouse_moves += 1
            self.last_activity_time = time.time()
    
    def on_keyboard_press(self, key):
        """Callback for keyboard press"""
        with self.lock:
            self.keyboard_presses += 1
            self.last_activity_time = time.time()
    
    def is_idle(self):
        """Check if user is idle"""
        idle_time = time.time() - self.last_activity_time
        return idle_time > IDLE_THRESHOLD
    
    def get_activity_data(self):
        """Collect current activity data"""
        with self.lock:
            data = {
                'employeeId': EMPLOYEE_ID,
                'activeWindow': self.current_window,
                'mouseMoves': self.mouse_moves,
                'keyboardPresses': self.keyboard_presses,
                'idle': self.is_idle(),
                'duration': TRACKING_INTERVAL,
                'deviceInfo': self.device_info
            }
            
            # Reset counters
            self.mouse_moves = 0
            self.keyboard_presses = 0
            
            return data
    
    def send_activity_to_api(self, data):
        """Send activity data to backend API"""
        headers = {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        }
        
        try:
            response = requests.post(
                API_URL,
                json=data,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 201:
                print(f"✅ [{datetime.now().strftime('%H:%M:%S')}] Activity sent successfully")
                return True
            else:
                print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] Error: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] Connection error: {str(e)}")
            return False
    
    def track_window(self):
        """Continuously track active window"""
        while self.is_running:
            self.current_window = self.get_active_window()
            time.sleep(1)  # Check every second
    
    def start_tracking(self):
        """Start the activity tracking"""
        print(f"🚀 Starting activity tracker...")
        print(f"⏱️  Tracking interval: {TRACKING_INTERVAL} seconds")
        print(f"💤 Idle threshold: {IDLE_THRESHOLD} seconds")
        print("="*60)
        
        # Start window tracking thread
        window_thread = Thread(target=self.track_window, daemon=True)
        window_thread.start()
        
        # Start mouse listener
        mouse_listener = mouse.Listener(on_move=self.on_mouse_move)
        mouse_listener.start()
        
        # Start keyboard listener
        keyboard_listener = keyboard.Listener(on_press=self.on_keyboard_press)
        keyboard_listener.start()
        
        # Main tracking loop
        try:
            while self.is_running:
                time.sleep(TRACKING_INTERVAL)
                
                # Collect and send activity data
                activity_data = self.get_activity_data()
                
                # Display activity info
                idle_status = "💤 IDLE" if activity_data['idle'] else "✅ ACTIVE"
                print(f"\n{idle_status} | Window: {activity_data['activeWindow'][:50]}")
                print(f"🖱️  Mouse: {activity_data['mouseMoves']} | ⌨️  Keyboard: {activity_data['keyboardPresses']}")
                
                # Send to API
                self.send_activity_to_api(activity_data)
                
        except KeyboardInterrupt:
            print("\n\n⏹️  Stopping tracker...")
            self.is_running = False
            mouse_listener.stop()
            keyboard_listener.stop()
            print("✅ Tracker stopped successfully")

# ============================================
# MAIN EXECUTION
# ============================================
if __name__ == "__main__":
    print("\n" + "="*60)
    print("  VIHI IT SOLUTIONS - HR TIME TRACKING CLIENT")
    print("="*60 + "\n")
    
    # Validate configuration
    if API_KEY == 'your-api-key-here':
        print("⚠️  WARNING: Using default API key. Please set ACTIVITY_API_KEY in .env file")
    
    if EMPLOYEE_ID == 'EMP001':
        print("⚠️  WARNING: Using default Employee ID. Please set EMPLOYEE_ID in .env file")
    
    # Create and start tracker
    tracker = ActivityTracker()
    tracker.start_tracking()
