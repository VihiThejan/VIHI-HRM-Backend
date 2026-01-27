"""
URL Protocol Handler for VIHI Time Tracker
Registers vihi-tracker:// protocol so web app can launch desktop app
"""

import sys
import os
import winreg
import argparse
from urllib.parse import urlparse, parse_qs

def register_protocol(exe_path: str):
    """Register the vihi-tracker:// protocol handler"""
    protocol = "vihi-tracker"
    
    try:
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}")
        winreg.SetValue(key, "", winreg.REG_SZ, f"URL:{protocol}")
        winreg.SetValueEx(key, "URL Protocol", 0, winreg.REG_SZ, "")
        winreg.CloseKey(key)
        
        command_key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}\\shell\\open\\command")
        winreg.SetValue(command_key, "", winreg.REG_SZ, f'"{exe_path}" "%1"')
        winreg.CloseKey(command_key)
        
        print(f"✓ Protocol '{protocol}://' registered successfully!")
        print(f"  Executable: {exe_path}")
        return True
    except Exception as e:
        print(f"✗ Failed to register protocol: {e}")
        return False


def unregister_protocol():
    """Remove the protocol handler"""
    protocol = "vihi-tracker"
    
    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}\\shell\\open\\command")
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}\\shell\\open")
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}\\shell")
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, f"Software\\Classes\\{protocol}")
        print(f"✓ Protocol unregistered successfully!")
        return True
    except FileNotFoundError:
        print("Protocol was not registered.")
        return True
    except Exception as e:
        print(f"✗ Failed: {e}")
        return False


def parse_protocol_url(url: str) -> dict:
    """Parse protocol URL parameters"""
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    
    return {
        'action': parsed.netloc,
        'token': params.get('token', [None])[0],
        'name': params.get('name', ['User'])[0],
        'ws_url': params.get('ws_url', ['ws://localhost:5000'])[0],
        'api_url': params.get('api_url', ['http://localhost:5000/api'])[0],
    }


def main():
    parser = argparse.ArgumentParser(description='VIHI Time Tracker Protocol Handler')
    parser.add_argument('url', nargs='?', help='Protocol URL to handle')
    parser.add_argument('--register', action='store_true', help='Register protocol')
    parser.add_argument('--unregister', action='store_true', help='Unregister protocol')
    parser.add_argument('--exe', help='Path to tracker executable')
    
    args = parser.parse_args()
    
    if args.register:
        if args.exe:
            exe_path = os.path.abspath(args.exe)
        else:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            exe_path = os.path.join(script_dir, 'dist', 'VIHI-TimeTracker.exe')
            if not os.path.exists(exe_path):
                # Use python script as fallback
                exe_path = os.path.join(script_dir, 'time_tracker.py')
                # We need to wrap it with python
                print(f"Warning: Executable not found at dist/VIHI-TimeTracker.exe")
                print(f"Registering with Python script: {exe_path}")
        register_protocol(exe_path)
        return
    
    if args.unregister:
        unregister_protocol()
        return
    
    if args.url:
        params = parse_protocol_url(args.url)
        if params['token']:
            import subprocess
            script_dir = os.path.dirname(os.path.abspath(__file__))
            
            # Try to use the executable first, fallback to Python script
            exe_path = os.path.join(script_dir, 'dist', 'VIHI-TimeTracker.exe')
            
            if os.path.exists(exe_path):
                # Use the executable
                cmd = [
                    exe_path,
                    '--token', params['token'],
                    '--name', params['name'],
                    '--ws-url', params['ws_url'],
                    '--api-url', params['api_url']
                ]
            else:
                # Fallback to Python script
                tracker_script = os.path.join(script_dir, 'time_tracker.py')
                cmd = [
                    sys.executable, tracker_script,
                    '--token', params['token'],
                    '--name', params['name'],
                    '--ws-url', params['ws_url'],
                    '--api-url', params['api_url']
                ]
            
            # Launch without console window for exe, with console for Python
            if exe_path and os.path.exists(exe_path):
                subprocess.Popen(cmd)
            else:
                subprocess.Popen(cmd, creationflags=subprocess.CREATE_NEW_CONSOLE)
    else:
        print("VIHI Time Tracker - Protocol Handler")
        print("\nUsage:")
        print("  Register:   python protocol_handler.py --register [--exe path/to/exe]")
        print("  Unregister: python protocol_handler.py --unregister")


if __name__ == "__main__":
    main()
