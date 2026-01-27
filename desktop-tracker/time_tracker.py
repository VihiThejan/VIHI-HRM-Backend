"""
VIHI HRM Time Tracker - Desktop Application
Tracks mouse movements and working time
Communicates with backend via WebSocket for real-time updates
"""

import sys
import time
import json
import threading
import argparse
import websocket
import requests
from datetime import datetime, timedelta
from collections import deque
from urllib.parse import urlencode

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QSystemTrayIcon, QMenu, QAction, QMessageBox,
    QFrame, QProgressBar, QGroupBox, QSplashScreen
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject, QThread
from PyQt5.QtGui import QIcon, QFont, QPalette, QColor, QPixmap

try:
    from pynput import mouse
    PYNPUT_AVAILABLE = True
except ImportError:
    PYNPUT_AVAILABLE = False
    print("Warning: pynput not available. Mouse tracking disabled.")

# Default Configuration
DEFAULT_WS_URL = "ws://localhost:5000"
DEFAULT_API_URL = "http://localhost:5000/api"
HEARTBEAT_INTERVAL = 30  # seconds
IDLE_TIMEOUT = 300  # 5 minutes without mouse movement = idle


class WorkerSignals(QObject):
    """Signals for thread communication"""
    update_time = pyqtSignal(int)  # Total active seconds
    update_status = pyqtSignal(str)  # Status message
    update_activity = pyqtSignal(int)  # Activity percentage
    connection_status = pyqtSignal(bool)  # WebSocket connected/disconnected
    session_started = pyqtSignal(str)  # Session ID
    session_ended = pyqtSignal()
    error = pyqtSignal(str)


class MouseTracker:
    """Tracks mouse movements and determines activity status"""
    
    def __init__(self):
        self.last_position = (0, 0)
        self.last_movement_time = time.time()
        self.movement_count = 0
        self.is_active = False
        self.movement_history = deque(maxlen=60)
        self.listener = None
        self.running = False
    
    def start(self):
        if not PYNPUT_AVAILABLE:
            return
        self.running = True
        self.listener = mouse.Listener(
            on_move=self._on_move,
            on_click=self._on_click
        )
        self.listener.start()
    
    def stop(self):
        self.running = False
        if self.listener:
            self.listener.stop()
    
    def _on_move(self, x, y):
        if not self.running:
            return
        current_pos = (x, y)
        if current_pos != self.last_position:
            self.last_position = current_pos
            self.last_movement_time = time.time()
            self.movement_count += 1
            self.is_active = True
    
    def _on_click(self, x, y, button, pressed):
        if not self.running:
            return
        if pressed:
            self.last_movement_time = time.time()
            self.movement_count += 1
            self.is_active = True
    
    def check_activity(self):
        """Returns (is_idle, activity_percent, movements)"""
        current_time = time.time()
        time_since_movement = current_time - self.last_movement_time
        
        self.movement_history.append(1 if self.is_active else 0)
        was_active = self.is_active
        self.is_active = False
        
        is_idle = time_since_movement >= IDLE_TIMEOUT 
        
        if len(self.movement_history) > 0:
            activity_percent = int((sum(self.movement_history) / len(self.movement_history)) * 100)
        else:
            activity_percent = 0
        
        movements = self.movement_count
        self.movement_count = 0
        
        return is_idle, activity_percent, movements


class WebSocketClient(QThread):
    """WebSocket client for real-time communication with backend"""
    
    def __init__(self, ws_url: str, token: str, signals: WorkerSignals):
        super().__init__()
        self.ws_url = ws_url
        self.token = token
        self.signals = signals
        self.ws = None
        self.running = False
        self.session_id = None
        self.connected = False
    
    def run(self):
        self.running = True
        self._connect()
    
    def _connect(self):
        """Establish WebSocket connection"""
        try:
            ws_url_with_token = f"{self.ws_url}/ws/time-tracking?token={self.token}"
            
            self.ws = websocket.WebSocketApp(
                ws_url_with_token,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close
            )
            
            self.ws.run_forever(ping_interval=30, ping_timeout=10)
            
        except Exception as e:
            self.signals.error.emit(f"WebSocket connection failed: {str(e)}")
            self.signals.connection_status.emit(False)
    
    def _on_open(self, ws):
        """Handle WebSocket connection opened"""
        self.connected = True
        self.signals.connection_status.emit(True)
        self.signals.update_status.emit("Connected to server")
        
        # Send start session message
        self.send_message({
            "type": "start_session",
            "timestamp": datetime.now().isoformat(),
            "deviceInfo": {
                "platform": sys.platform,
                "version": "1.0.0"
            }
        })
    
    def _on_message(self, ws, message):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "session_started":
                self.session_id = data.get("sessionId")
                self.signals.session_started.emit(self.session_id)
                self.signals.update_status.emit("Session started")
            
            elif msg_type == "session_ended":
                self.signals.session_ended.emit()
                self.signals.update_status.emit("Session ended")
            
            elif msg_type == "heartbeat_ack":
                # Server acknowledged heartbeat
                total_seconds = data.get("totalActiveSeconds", 0)
                self.signals.update_time.emit(total_seconds)
            
            elif msg_type == "error":
                self.signals.error.emit(data.get("message", "Unknown error"))
            
            elif msg_type == "sync":
                # Sync current session state
                self.signals.update_time.emit(data.get("totalActiveSeconds", 0))
                self.signals.update_activity.emit(data.get("averageActivity", 0))
                
        except json.JSONDecodeError:
            self.signals.error.emit("Invalid message from server")
    
    def _on_error(self, ws, error):
        """Handle WebSocket errors"""
        self.signals.error.emit(f"Connection error: {str(error)}")
        self.signals.connection_status.emit(False)
    
    def _on_close(self, ws, close_status_code, close_msg):
        """Handle WebSocket connection closed"""
        self.connected = False
        self.signals.connection_status.emit(False)
        
        if self.running:
            self.signals.update_status.emit("Disconnected. Reconnecting...")
            time.sleep(5)
            if self.running:
                self._connect()
    
    def send_message(self, data: dict):
        """Send message to server"""
        if self.ws and self.connected:
            try:
                self.ws.send(json.dumps(data))
            except Exception as e:
                self.signals.error.emit(f"Failed to send message: {str(e)}")

    
    def send_heartbeat(self, active_seconds: int, activity_percent: int, is_idle: bool, movements: int):
        """Send heartbeat with activity data"""
        self.send_message({
            "type": "heartbeat",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat(),
            "activeSeconds": active_seconds,
            "activityPercent": activity_percent,
            "isIdle": is_idle,
            "mouseMovements": movements
        })
    
    def end_session(self):
        """End the current session"""
        self.send_message({
            "type": "end_session",
            "sessionId": self.session_id,
            "timestamp": datetime.now().isoformat()
        })
    
    def stop(self):
        """Stop the WebSocket client"""
        self.running = False
        if self.session_id:
            self.end_session()
        if self.ws:
            self.ws.close()


class TimeTracker:
    """Manages time tracking logic"""
    
    def __init__(self, signals: WorkerSignals):
        self.signals = signals
        self.mouse_tracker = MouseTracker()
        self.is_tracking = False
        self.total_active_seconds = 0
        self.session_start_time = None
        self.last_heartbeat_time = None
        self.heartbeat_active_seconds = 0
    
    def start(self):
        self.is_tracking = True
        self.session_start_time = datetime.now()
        self.last_heartbeat_time = time.time()
        self.heartbeat_active_seconds = 0
        self.mouse_tracker.start()
    
    def stop(self):
        self.is_tracking = False
        self.mouse_tracker.stop()
    
    def tick(self):
        """Called every second to update tracking"""
        if not self.is_tracking:
            return None
        
        is_idle, activity_percent, movements = self.mouse_tracker.check_activity()
        
        # Only count time if not idle
        if not is_idle:
            self.total_active_seconds += 1
            self.heartbeat_active_seconds += 1
        
        self.signals.update_time.emit(self.total_active_seconds)
        self.signals.update_activity.emit(activity_percent)
        
        if is_idle:
            self.signals.update_status.emit("Idle - Time paused")
        else:
            self.signals.update_status.emit("Tracking active")
        
        # Check if it's time to send heartbeat
        current_time = time.time()
        if current_time - self.last_heartbeat_time >= HEARTBEAT_INTERVAL:
            heartbeat_data = {
                "active_seconds": self.heartbeat_active_seconds,
                "activity_percent": activity_percent,
                "is_idle": is_idle,
                "movements": movements
            }
            self.heartbeat_active_seconds = 0
            self.last_heartbeat_time = current_time
            return heartbeat_data
        
        return None


class MainWindow(QMainWindow):
    """Main application window"""
    
    def __init__(self, token: str, user_name: str, ws_url: str, api_url: str):
        super().__init__()
        
        self.token = token
        self.user_name = user_name
        self.ws_url = ws_url
        self.api_url = api_url
        
        self.signals = WorkerSignals()
        self.time_tracker = TimeTracker(self.signals)
        self.ws_client = None
        self.is_connected = False
        self.session_active = False
        
        self.setup_ui()
        self.setup_signals()
        self.setup_tray()
        self.setup_timer()
        
        # Auto-start connection
        self.start_tracking()
    
    def setup_ui(self):
        """Setup the user interface"""
        self.setWindowTitle("VIHI Time Tracker")
        self.setFixedSize(450, 400)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f8fafc;
            }
            QLabel {
                color: #334155;
            }
            QPushButton {
                border-radius: 8px;
                padding: 12px 24px;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:hover {
                opacity: 0.9;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 12px;
                background-color: white;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 12px;
                padding: 0 8px;
                color: #6366f1;
            }
        """)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        layout = QVBoxLayout(central_widget)
        layout.setSpacing(16)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header = QFrame()
        header.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, 
                    stop:0 #6366f1, stop:1 #8b5cf6);
                border-radius: 12px;
                padding: 16px;
            }
            QLabel {
                color: white;
            }
        """)
        header_layout = QVBoxLayout(header)
        
        title_label = QLabel("VIHI Time Tracker")
        title_label.setFont(QFont("Segoe UI", 18, QFont.Bold))
        title_label.setAlignment(Qt.AlignCenter)
        header_layout.addWidget(title_label)
        
        self.user_label = QLabel(f"Welcome, {self.user_name}")
        self.user_label.setFont(QFont("Segoe UI", 11))
        self.user_label.setAlignment(Qt.AlignCenter)
        header_layout.addWidget(self.user_label)
        
        layout.addWidget(header)
        
        # Connection Status
        self.connection_label = QLabel("● Connecting...")
        self.connection_label.setStyleSheet("color: #f59e0b; font-weight: bold;")
        self.connection_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.connection_label)
        
        # Time Display Group
        time_group = QGroupBox("Session Time")
        time_layout = QVBoxLayout(time_group)
        
        self.time_label = QLabel("00:00:00")
        self.time_label.setFont(QFont("Segoe UI", 48, QFont.Bold))
        self.time_label.setAlignment(Qt.AlignCenter)
        self.time_label.setStyleSheet("color: #6366f1;")
        time_layout.addWidget(self.time_label)
        
        self.status_label = QLabel("Ready to track")
        self.status_label.setAlignment(Qt.AlignCenter)
        self.status_label.setStyleSheet("color: #64748b; font-size: 13px;")
        time_layout.addWidget(self.status_label)
        
        layout.addWidget(time_group)
        
        # Activity Group
        activity_group = QGroupBox("Activity Level")
        activity_layout = QVBoxLayout(activity_group)
        
        self.activity_bar = QProgressBar()
        self.activity_bar.setRange(0, 100)
        self.activity_bar.setValue(0)
        self.activity_bar.setTextVisible(True)
        self.activity_bar.setFormat("%p%")
        self.activity_bar.setStyleSheet("""
            QProgressBar {
                border: none;
                border-radius: 8px;
                background-color: #e2e8f0;
                height: 24px;
                text-align: center;
                font-weight: bold;
            }
            QProgressBar::chunk {
                border-radius: 8px;
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, 
                    stop:0 #22c55e, stop:1 #10b981);
            }
        """)
        activity_layout.addWidget(self.activity_bar)
        
        layout.addWidget(activity_group)
        
        # Control Buttons
        button_layout = QHBoxLayout()
        
        self.stop_btn = QPushButton("⏹ Stop Tracking")
        self.stop_btn.setStyleSheet("""
            QPushButton {
                background-color: #ef4444;
                color: white;
                border: none;
            }
            QPushButton:hover {
                background-color: #dc2626;
            }
            QPushButton:disabled {
                background-color: #cbd5e1;
            }
        """)
        self.stop_btn.clicked.connect(self.stop_tracking)
        button_layout.addWidget(self.stop_btn)
        
        self.minimize_btn = QPushButton("▼ Minimize")
        self.minimize_btn.setStyleSheet("""
            QPushButton {
                background-color: #64748b;
                color: white;
                border: none;
            }
            QPushButton:hover {
                background-color: #475569;
            }
        """)
        self.minimize_btn.clicked.connect(self.hide)
        button_layout.addWidget(self.minimize_btn)
        
        layout.addWidget(QWidget())  # Spacer
        layout.addLayout(button_layout)
    
    def setup_signals(self):
        """Connect signals to slots"""
        self.signals.update_time.connect(self.update_time_display)
        self.signals.update_status.connect(self.update_status)
        self.signals.update_activity.connect(self.update_activity)
        self.signals.connection_status.connect(self.update_connection_status)
        self.signals.session_started.connect(self.on_session_started)
        self.signals.session_ended.connect(self.on_session_ended)
        self.signals.error.connect(self.show_error)
    
    def setup_tray(self):
        """Setup system tray icon"""
        self.tray_icon = QSystemTrayIcon(self)
        
        # Create a simple colored icon
        pixmap = QPixmap(32, 32)
        pixmap.fill(QColor("#6366f1"))
        self.tray_icon.setIcon(QIcon(pixmap))
        
        tray_menu = QMenu()
        
        show_action = QAction("Show", self)
        show_action.triggered.connect(self.show)
        tray_menu.addAction(show_action)
        
        tray_menu.addSeparator()
        
        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.quit_app)
        tray_menu.addAction(quit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self.tray_activated)
        self.tray_icon.show()
    
    def setup_timer(self):
        """Setup the main tick timer"""
        self.timer = QTimer()
        self.timer.timeout.connect(self.tick)
        self.timer.start(1000)  # Every second
    
    def start_tracking(self):
        """Start tracking session"""
        # Start WebSocket connection
        self.ws_client = WebSocketClient(self.ws_url, self.token, self.signals)
        self.ws_client.start()
        
        # Start time tracker
        self.time_tracker.start()
        self.session_active = True
        
        self.stop_btn.setEnabled(True)
        self.status_label.setText("Starting session...")
    
    def stop_tracking(self):
        """Stop tracking session"""
        reply = QMessageBox.question(
            self, "Stop Tracking",
            "Are you sure you want to stop tracking?",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            self.session_active = False
            self.time_tracker.stop()
            
            if self.ws_client:
                self.ws_client.stop()
            
            self.status_label.setText("Session ended")
            self.stop_btn.setEnabled(False)
            
            # Close application after brief delay
            QTimer.singleShot(2000, self.quit_app)
    
    def tick(self):
        """Main tick - called every second"""
        if not self.session_active:
            return
        
        heartbeat_data = self.time_tracker.tick()
        
        # Send heartbeat if needed
        if heartbeat_data and self.ws_client and self.ws_client.connected:
            self.ws_client.send_heartbeat(
                heartbeat_data["active_seconds"],
                heartbeat_data["activity_percent"],
                heartbeat_data["is_idle"],
                heartbeat_data["movements"]
            )
    
    def update_time_display(self, total_seconds: int):
        """Update the time display"""
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        self.time_label.setText(f"{hours:02d}:{minutes:02d}:{seconds:02d}")
        
        # Update tray tooltip
        self.tray_icon.setToolTip(f"VIHI Tracker - {hours:02d}:{minutes:02d}:{seconds:02d}")
    
    def update_status(self, status: str):
        """Update status label"""
        self.status_label.setText(status)
    
    def update_activity(self, percent: int):
        """Update activity bar"""
        self.activity_bar.setValue(percent)
    
    def update_connection_status(self, connected: bool):
        """Update connection status indicator"""
        self.is_connected = connected
        if connected:
            self.connection_label.setText("● Connected")
            self.connection_label.setStyleSheet("color: #22c55e; font-weight: bold;")
        else:
            self.connection_label.setText("● Disconnected")
            self.connection_label.setStyleSheet("color: #ef4444; font-weight: bold;")
    
    def on_session_started(self, session_id: str):
        """Handle session started"""
        self.status_label.setText("Tracking active")
    
    def on_session_ended(self):
        """Handle session ended"""
        self.session_active = False
        self.status_label.setText("Session ended by server")
    
    def show_error(self, message: str):
        """Show error message"""
        self.tray_icon.showMessage("Error", message, QSystemTrayIcon.Critical, 3000)
    
    def tray_activated(self, reason):
        """Handle tray icon activation"""
        if reason == QSystemTrayIcon.DoubleClick:
            self.show()
            self.activateWindow()
    
    def closeEvent(self, event):
        """Handle window close - minimize to tray instead"""
        event.ignore()
        self.hide()
        self.tray_icon.showMessage(
            "VIHI Time Tracker",
            "Application minimized to tray. Double-click to open.",
            QSystemTrayIcon.Information,
            2000
        )
    
    def quit_app(self):
        """Quit the application"""
        self.session_active = False
        self.time_tracker.stop()
        
        if self.ws_client:
            self.ws_client.stop()
            self.ws_client.wait(2000)
        
        self.tray_icon.hide()
        QApplication.quit()


def get_token_from_web(api_url: str, launch_token: str) -> dict:
    """Exchange launch token for session token"""
    try:
        response = requests.post(
            f"{api_url}/time-tracking/validate-launch-token",
            json={"launchToken": launch_token},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "success":
                return data.get("data", {})
        
        return None
    except Exception as e:
        print(f"Failed to validate launch token: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="VIHI Time Tracker Desktop Application")
    parser.add_argument("--token", "-t", help="Authentication token")
    parser.add_argument("--launch-token", "-l", help="Launch token from web app")
    parser.add_argument("--name", "-n", default="User", help="User name")
    parser.add_argument("--ws-url", default=DEFAULT_WS_URL, help="WebSocket server URL")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="API server URL")
    
    # Handle protocol URL (vihi-tracker://start?token=xxx&name=yyy) BEFORE parsing args
    if len(sys.argv) > 1 and sys.argv[1].startswith("vihi-"):
        from urllib.parse import urlparse, parse_qs
        url = sys.argv[1]
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        
        # Extract parameters from URL
        token = params.get("token", [None])[0]
        name = params.get("name", ["User"])[0]
        ws_url = params.get("ws_url", [DEFAULT_WS_URL])[0]
        api_url = params.get("api_url", [DEFAULT_API_URL])[0]
        
        # Replace sys.argv with parsed arguments so argparse works correctly
        sys.argv = [sys.argv[0]]
        if token:
            sys.argv.extend(["--token", token])
        if name:
            sys.argv.extend(["--name", name])
        if ws_url:
            sys.argv.extend(["--ws-url", ws_url])
        if api_url:
            sys.argv.extend(["--api-url", api_url])
    
    args = parser.parse_args()
    
    # If we have a launch token, exchange it for a session token
    if args.launch_token and not args.token:
        print("Validating launch token...")
        session_data = get_token_from_web(args.api_url, args.launch_token)
        if session_data:
            args.token = session_data.get("sessionToken")
            args.name = session_data.get("userName", args.name)
        else:
            print("Failed to validate launch token")
            sys.exit(1)
    
    if not args.token:
        print("Error: No authentication token provided")
        print("Usage: python time_tracker.py --token YOUR_TOKEN --name 'Your Name'")
        print("   or: python time_tracker.py --launch-token LAUNCH_TOKEN")
        sys.exit(1)
    
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    
    # Set application info
    app.setApplicationName("VIHI Time Tracker")
    app.setOrganizationName("VIHI")
    
    window = MainWindow(
        token=args.token,
        user_name=args.name,
        ws_url=args.ws_url,
        api_url=args.api_url
    )
    window.show()
    
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
