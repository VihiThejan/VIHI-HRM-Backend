"""
VIHI HRM Intern Time Tracker - Desktop Application
Tracks mouse movements and working time for interns
Communicates with backend via HTTP
"""

import sys
import time
import json
import threading
import requests
from datetime import datetime, timedelta
from collections import deque

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QSystemTrayIcon, QMenu, QAction, QMessageBox,
    QFrame, QProgressBar, QGroupBox
)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal, QObject
from PyQt5.QtGui import QIcon, QFont, QPalette, QColor, QPixmap

from pynput import mouse

# Configuration
API_BASE_URL = "http://localhost:5000/api"
HEARTBEAT_INTERVAL = 30  # seconds
IDLE_TIMEOUT = 300  # 5 minutes without mouse movement = idle
MOUSE_SAMPLE_INTERVAL = 1  # Check mouse position every second


class WorkerSignals(QObject):
    """Signals for thread communication"""
    update_time = pyqtSignal(int)
    update_status = pyqtSignal(str)
    update_activity = pyqtSignal(int)
    session_ended = pyqtSignal()
    error = pyqtSignal(str)


class MouseTracker:
    """Tracks mouse movements and determines activity status"""
    
    def __init__(self):
        self.last_position = (0, 0)
        self.last_movement_time = time.time()
        self.movement_count = 0
        self.is_active = False
        self.movement_history = deque(maxlen=60)  # Last 60 seconds
        self.listener = None
        self.running = False
    
    def start(self):
        """Start mouse listener"""
        self.running = True
        self.listener = mouse.Listener(
            on_move=self._on_move,
            on_click=self._on_click
        )
        self.listener.start()
    
    def stop(self):
        """Stop mouse listener"""
        self.running = False
        if self.listener:
            self.listener.stop()
    
    def _on_move(self, x, y):
        """Handle mouse movement"""
        if not self.running:
            return
        
        current_pos = (x, y)
        if current_pos != self.last_position:
            self.last_position = current_pos
            self.last_movement_time = time.time()
            self.movement_count += 1
            self.is_active = True
    
    def _on_click(self, x, y, button, pressed):
        """Handle mouse click"""
        if not self.running:
            return
        
        if pressed:
            self.last_movement_time = time.time()
            self.movement_count += 1
            self.is_active = True
    
    def check_activity(self):
        """Check if user is active based on recent mouse movements"""
        current_time = time.time()
        time_since_movement = current_time - self.last_movement_time
        
        # Record activity for this second
        self.movement_history.append(1 if self.is_active else 0)
        
        # Reset active flag
        self.is_active = False
        
        # Calculate activity percentage (last 60 seconds)
        if len(self.movement_history) > 0:
            activity_percent = (sum(self.movement_history) / len(self.movement_history)) * 100
        else:
            activity_percent = 0
        
        # Consider idle if no movement for IDLE_TIMEOUT
        is_idle = time_since_movement > IDLE_TIMEOUT
        
        return {
            'is_idle': is_idle,
            'activity_percent': activity_percent,
            'time_since_movement': time_since_movement,
            'movement_count': self.movement_count
        }
    
    def reset_counts(self):
        """Reset movement counts (called after sending to server)"""
        count = self.movement_count
        self.movement_count = 0
        return count


class TimeTracker:
    """Tracks working time with pause for idle periods"""
    
    def __init__(self):
        self.session_start = None
        self.total_active_seconds = 0
        self.current_active_start = None
        self.is_tracking = False
        self.is_idle = False
        self.idle_start = None
        self.total_idle_seconds = 0
    
    def start_session(self):
        """Start a new tracking session"""
        self.session_start = datetime.now()
        self.current_active_start = time.time()
        self.is_tracking = True
        self.is_idle = False
        self.total_active_seconds = 0
        self.total_idle_seconds = 0
    
    def pause_for_idle(self):
        """Pause tracking when user becomes idle"""
        if self.is_tracking and not self.is_idle:
            # Add current active period to total
            if self.current_active_start:
                self.total_active_seconds += time.time() - self.current_active_start
                self.current_active_start = None
            self.is_idle = True
            self.idle_start = time.time()
    
    def resume_from_idle(self):
        """Resume tracking when user becomes active"""
        if self.is_tracking and self.is_idle:
            if self.idle_start:
                self.total_idle_seconds += time.time() - self.idle_start
                self.idle_start = None
            self.is_idle = False
            self.current_active_start = time.time()
    
    def stop_session(self):
        """Stop tracking and return final statistics"""
        if not self.is_tracking:
            return None
        
        # Finalize current period
        if not self.is_idle and self.current_active_start:
            self.total_active_seconds += time.time() - self.current_active_start
        elif self.is_idle and self.idle_start:
            self.total_idle_seconds += time.time() - self.idle_start
        
        self.is_tracking = False
        session_end = datetime.now()
        
        return {
            'session_start': self.session_start.isoformat(),
            'session_end': session_end.isoformat(),
            'total_active_seconds': int(self.total_active_seconds),
            'total_idle_seconds': int(self.total_idle_seconds),
            'total_session_seconds': int((session_end - self.session_start).total_seconds())
        }
    
    def get_active_time(self):
        """Get current active time in seconds"""
        if not self.is_tracking:
            return 0
        
        total = self.total_active_seconds
        if not self.is_idle and self.current_active_start:
            total += time.time() - self.current_active_start
        
        return int(total)
    
    def get_session_time(self):
        """Get total session time in seconds"""
        if not self.session_start:
            return 0
        return int((datetime.now() - self.session_start).total_seconds())


class APIClient:
    """Handles communication with the backend"""
    
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.session_id = None
    
    def _headers(self):
        return {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }
    
    def start_session(self) -> dict:
        """Start a new tracking session on the server"""
        try:
            response = requests.post(
                f'{self.base_url}/time-tracking/start',
                headers=self._headers(),
                timeout=10
            )
            data = response.json()
            if response.status_code == 200 or response.status_code == 201:
                self.session_id = data.get('data', {}).get('sessionId')
                return {'success': True, 'data': data}
            return {'success': False, 'error': data.get('message', 'Failed to start session')}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def send_heartbeat(self, activity_data: dict) -> dict:
        """Send activity heartbeat to the server"""
        if not self.session_id:
            return {'success': False, 'error': 'No active session'}
        
        try:
            response = requests.post(
                f'{self.base_url}/time-tracking/heartbeat',
                headers=self._headers(),
                json={
                    'sessionId': self.session_id,
                    'activityPercent': activity_data['activity_percent'],
                    'mouseMovements': activity_data['movement_count'],
                    'isIdle': activity_data['is_idle'],
                    'activeSeconds': activity_data['active_seconds']
                },
                timeout=10
            )
            return {'success': response.status_code == 200}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def end_session(self, final_data: dict) -> dict:
        """End the tracking session"""
        if not self.session_id:
            return {'success': False, 'error': 'No active session'}
        
        try:
            response = requests.post(
                f'{self.base_url}/time-tracking/end',
                headers=self._headers(),
                json={
                    'sessionId': self.session_id,
                    **final_data
                },
                timeout=10
            )
            data = response.json()
            self.session_id = None
            return {'success': response.status_code == 200, 'data': data}
        except Exception as e:
            return {'success': False, 'error': str(e)}


class InternTrackerWindow(QMainWindow):
    """Main application window"""
    
    def __init__(self, token: str, intern_name: str = "Intern"):
        super().__init__()
        self.token = token
        self.intern_name = intern_name
        
        # Initialize trackers
        self.mouse_tracker = MouseTracker()
        self.time_tracker = TimeTracker()
        self.api_client = APIClient(API_BASE_URL, token)
        self.signals = WorkerSignals()
        
        # State
        self.is_running = False
        self.heartbeat_timer = None
        self.update_timer = None
        
        # Setup UI
        self.init_ui()
        self.setup_system_tray()
        self.connect_signals()
    
    def init_ui(self):
        """Initialize the user interface"""
        self.setWindowTitle("VIHI HRM - Intern Time Tracker")
        self.setFixedSize(400, 500)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f4f8;
            }
            QLabel {
                color: #1e3a5f;
            }
            QPushButton {
                border-radius: 8px;
                padding: 10px 20px;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:hover {
                opacity: 0.9;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #3b82f6;
                border-radius: 10px;
                margin-top: 10px;
                padding-top: 10px;
                background-color: white;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px;
                color: #3b82f6;
            }
        """)
        
        # Central widget
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Header
        header = QLabel(f"Welcome, {self.intern_name}")
        header.setFont(QFont("Segoe UI", 18, QFont.Bold))
        header.setAlignment(Qt.AlignCenter)
        header.setStyleSheet("color: #3b82f6;")
        layout.addWidget(header)
        
        # Status Group
        status_group = QGroupBox("Session Status")
        status_layout = QVBoxLayout(status_group)
        
        self.status_label = QLabel("⏸ Not Started")
        self.status_label.setFont(QFont("Segoe UI", 14))
        self.status_label.setAlignment(Qt.AlignCenter)
        status_layout.addWidget(self.status_label)
        
        layout.addWidget(status_group)
        
        # Time Display Group
        time_group = QGroupBox("Working Time")
        time_layout = QVBoxLayout(time_group)
        
        self.time_display = QLabel("00:00:00")
        self.time_display.setFont(QFont("Segoe UI", 48, QFont.Bold))
        self.time_display.setAlignment(Qt.AlignCenter)
        self.time_display.setStyleSheet("color: #1e3a5f;")
        time_layout.addWidget(self.time_display)
        
        # Session time (total time including idle)
        self.session_time_label = QLabel("Session: 00:00:00")
        self.session_time_label.setFont(QFont("Segoe UI", 12))
        self.session_time_label.setAlignment(Qt.AlignCenter)
        self.session_time_label.setStyleSheet("color: #6b7280;")
        time_layout.addWidget(self.session_time_label)
        
        layout.addWidget(time_group)
        
        # Activity Group
        activity_group = QGroupBox("Activity Monitor")
        activity_layout = QVBoxLayout(activity_group)
        
        self.activity_bar = QProgressBar()
        self.activity_bar.setRange(0, 100)
        self.activity_bar.setValue(0)
        self.activity_bar.setStyleSheet("""
            QProgressBar {
                border: 2px solid #e5e7eb;
                border-radius: 5px;
                text-align: center;
                height: 25px;
            }
            QProgressBar::chunk {
                background-color: #22c55e;
                border-radius: 3px;
            }
        """)
        activity_layout.addWidget(self.activity_bar)
        
        self.activity_label = QLabel("Activity: 0%")
        self.activity_label.setAlignment(Qt.AlignCenter)
        activity_layout.addWidget(self.activity_label)
        
        layout.addWidget(activity_group)
        
        # Buttons
        button_layout = QHBoxLayout()
        
        self.start_button = QPushButton("▶ Start Working")
        self.start_button.setStyleSheet("""
            QPushButton {
                background-color: #22c55e;
                color: white;
            }
            QPushButton:hover {
                background-color: #16a34a;
            }
        """)
        self.start_button.clicked.connect(self.start_tracking)
        button_layout.addWidget(self.start_button)
        
        self.stop_button = QPushButton("⏹ Stop")
        self.stop_button.setStyleSheet("""
            QPushButton {
                background-color: #ef4444;
                color: white;
            }
            QPushButton:hover {
                background-color: #dc2626;
            }
        """)
        self.stop_button.clicked.connect(self.stop_tracking)
        self.stop_button.setEnabled(False)
        button_layout.addWidget(self.stop_button)
        
        layout.addWidget(QWidget())  # Spacer
        layout.addLayout(button_layout)
        
        # Info label
        info = QLabel("Your mouse activity is being monitored.\nStay active to track your working time!")
        info.setFont(QFont("Segoe UI", 9))
        info.setAlignment(Qt.AlignCenter)
        info.setStyleSheet("color: #6b7280;")
        layout.addWidget(info)
    
    def setup_system_tray(self):
        """Setup system tray icon"""
        self.tray_icon = QSystemTrayIcon(self)
        
        # Create tray menu
        tray_menu = QMenu()
        
        show_action = QAction("Show", self)
        show_action.triggered.connect(self.show)
        tray_menu.addAction(show_action)
        
        quit_action = QAction("Quit", self)
        quit_action.triggered.connect(self.close_application)
        tray_menu.addAction(quit_action)
        
        self.tray_icon.setContextMenu(tray_menu)
        self.tray_icon.activated.connect(self.tray_activated)
        
        # Set icon (using a simple colored pixmap)
        pixmap = QPixmap(32, 32)
        pixmap.fill(QColor("#3b82f6"))
        self.tray_icon.setIcon(QIcon(pixmap))
        self.tray_icon.show()
    
    def connect_signals(self):
        """Connect signals to slots"""
        self.signals.update_status.connect(self.update_status_display)
        self.signals.update_activity.connect(self.update_activity_display)
        self.signals.error.connect(self.show_error)
    
    def start_tracking(self):
        """Start time tracking"""
        # Start session on server
        result = self.api_client.start_session()
        if not result['success']:
            QMessageBox.warning(self, "Error", f"Failed to start session: {result.get('error', 'Unknown error')}")
            return
        
        # Start local tracking
        self.mouse_tracker.start()
        self.time_tracker.start_session()
        self.is_running = True
        
        # Update UI
        self.start_button.setEnabled(False)
        self.stop_button.setEnabled(True)
        self.status_label.setText("🟢 Working")
        self.status_label.setStyleSheet("color: #22c55e;")
        
        # Start timers
        self.start_timers()
    
    def stop_tracking(self):
        """Stop time tracking"""
        if not self.is_running:
            return
        
        # Stop timers first
        self.stop_timers()
        
        # Stop local tracking
        self.mouse_tracker.stop()
        final_data = self.time_tracker.stop_session()
        self.is_running = False
        
        # Send final data to server
        if final_data:
            result = self.api_client.end_session(final_data)
            if result['success']:
                hours = final_data['total_active_seconds'] // 3600
                minutes = (final_data['total_active_seconds'] % 3600) // 60
                QMessageBox.information(
                    self,
                    "Session Ended",
                    f"Great work! Your session has been recorded.\n\n"
                    f"Active Time: {hours}h {minutes}m\n"
                    f"Session Duration: {final_data['total_session_seconds'] // 3600}h "
                    f"{(final_data['total_session_seconds'] % 3600) // 60}m"
                )
            else:
                QMessageBox.warning(self, "Warning", "Session ended but failed to sync with server.")
        
        # Update UI
        self.start_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.status_label.setText("⏸ Not Started")
        self.status_label.setStyleSheet("color: #6b7280;")
    
    def start_timers(self):
        """Start update timers"""
        # UI update timer (every second)
        self.update_timer = QTimer(self)
        self.update_timer.timeout.connect(self.update_ui)
        self.update_timer.start(1000)
        
        # Heartbeat timer
        self.heartbeat_timer = QTimer(self)
        self.heartbeat_timer.timeout.connect(self.send_heartbeat)
        self.heartbeat_timer.start(HEARTBEAT_INTERVAL * 1000)
    
    def stop_timers(self):
        """Stop all timers"""
        if self.update_timer:
            self.update_timer.stop()
        if self.heartbeat_timer:
            self.heartbeat_timer.stop()
    
    def update_ui(self):
        """Update UI with current tracking data"""
        if not self.is_running:
            return
        
        # Check mouse activity
        activity = self.mouse_tracker.check_activity()
        
        # Handle idle state
        if activity['is_idle'] and not self.time_tracker.is_idle:
            self.time_tracker.pause_for_idle()
            self.status_label.setText("😴 Idle")
            self.status_label.setStyleSheet("color: #f59e0b;")
        elif not activity['is_idle'] and self.time_tracker.is_idle:
            self.time_tracker.resume_from_idle()
            self.status_label.setText("🟢 Working")
            self.status_label.setStyleSheet("color: #22c55e;")
        
        # Update time display
        active_seconds = self.time_tracker.get_active_time()
        hours = active_seconds // 3600
        minutes = (active_seconds % 3600) // 60
        seconds = active_seconds % 60
        self.time_display.setText(f"{hours:02d}:{minutes:02d}:{seconds:02d}")
        
        # Update session time
        session_seconds = self.time_tracker.get_session_time()
        s_hours = session_seconds // 3600
        s_minutes = (session_seconds % 3600) // 60
        s_seconds = session_seconds % 60
        self.session_time_label.setText(f"Session: {s_hours:02d}:{s_minutes:02d}:{s_seconds:02d}")
        
        # Update activity display
        activity_percent = int(activity['activity_percent'])
        self.activity_bar.setValue(activity_percent)
        self.activity_label.setText(f"Activity: {activity_percent}%")
        
        # Update tray tooltip
        self.tray_icon.setToolTip(f"Working: {hours:02d}:{minutes:02d} | Activity: {activity_percent}%")
    
    def send_heartbeat(self):
        """Send heartbeat to server"""
        if not self.is_running:
            return
        
        activity = self.mouse_tracker.check_activity()
        movement_count = self.mouse_tracker.reset_counts()
        
        activity_data = {
            'activity_percent': activity['activity_percent'],
            'movement_count': movement_count,
            'is_idle': activity['is_idle'],
            'active_seconds': self.time_tracker.get_active_time()
        }
        
        # Send in background thread
        threading.Thread(
            target=self._send_heartbeat_async,
            args=(activity_data,),
            daemon=True
        ).start()
    
    def _send_heartbeat_async(self, activity_data):
        """Send heartbeat asynchronously"""
        result = self.api_client.send_heartbeat(activity_data)
        if not result['success']:
            print(f"Heartbeat failed: {result.get('error', 'Unknown error')}")
    
    def update_status_display(self, status: str):
        """Update status label"""
        self.status_label.setText(status)
    
    def update_activity_display(self, percent: int):
        """Update activity display"""
        self.activity_bar.setValue(percent)
        self.activity_label.setText(f"Activity: {percent}%")
    
    def show_error(self, message: str):
        """Show error message"""
        QMessageBox.critical(self, "Error", message)
    
    def tray_activated(self, reason):
        """Handle tray icon activation"""
        if reason == QSystemTrayIcon.DoubleClick:
            self.show()
            self.activateWindow()
    
    def closeEvent(self, event):
        """Handle window close"""
        if self.is_running:
            reply = QMessageBox.question(
                self,
                "Confirm Exit",
                "You have an active tracking session. Do you want to stop tracking and exit?",
                QMessageBox.Yes | QMessageBox.No,
                QMessageBox.No
            )
            if reply == QMessageBox.Yes:
                self.stop_tracking()
                event.accept()
            else:
                event.ignore()
                self.hide()
        else:
            event.accept()
    
    def close_application(self):
        """Close the application completely"""
        if self.is_running:
            self.stop_tracking()
        self.tray_icon.hide()
        QApplication.quit()


def main():
    """Main entry point"""
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='VIHI HRM Intern Time Tracker')
    parser.add_argument('--token', required=True, help='Authentication token')
    parser.add_argument('--name', default='Intern', help='Intern name')
    parser.add_argument('--api-url', default=API_BASE_URL, help='API base URL')
    
    args = parser.parse_args()
    
    # Update global config
    global API_BASE_URL
    API_BASE_URL = args.api_url
    
    # Create application
    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)
    
    # Create and show main window
    window = InternTrackerWindow(token=args.token, intern_name=args.name)
    window.show()
    
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()
