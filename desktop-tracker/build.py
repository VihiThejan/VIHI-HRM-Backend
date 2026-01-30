"""
Build script for VIHI Time Tracker Desktop Application
Creates standalone executable for Windows

Usage:
    python build.py              # Build executable only
    python build.py --installer  # Build executable and create installer
"""

import subprocess
import sys
import os
import shutil
import argparse

def main():
    parser = argparse.ArgumentParser(description='Build VIHI Time Tracker')
    parser.add_argument('--installer', action='store_true', 
                        help='Also create the Windows installer')
    args = parser.parse_args()
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    print("=" * 60)
    print("VIHI Time Tracker - Build Script")
    print("=" * 60)
    
    # Check if PyInstaller is installed
    try:
        import PyInstaller
        print("✓ PyInstaller found")
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    # Install dependencies
    print("\nInstalling dependencies...")
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Clean previous builds
    print("\nCleaning previous builds...")
    for folder in ['build', 'dist']:
        if os.path.exists(folder):
            shutil.rmtree(folder)
    
    # Build the executable using spec file
    print("\nBuilding executable...")
    
    # Check if spec file exists
    spec_file = "VIHI-TimeTracker.spec"
    if os.path.exists(spec_file):
        print(f"✓ Using spec file: {spec_file}")
        pyinstaller_args = [
            sys.executable, "-m", "PyInstaller",
            "--clean",
            spec_file
        ]
    else:
        print("⚠ Spec file not found, using command line arguments")
        pyinstaller_args = [
            sys.executable, "-m", "PyInstaller",
            "--onefile",
            "--windowed",
            "--name", "VIHI-TimeTracker",
            "--add-data", "README.md;.",
            "--hidden-import", "websocket",
            "--hidden-import", "websocket._abnf",
            "--hidden-import", "websocket._core",
            "--hidden-import", "websocket._exceptions",
            "--hidden-import", "websocket._handshake",
            "--hidden-import", "websocket._http",
            "--hidden-import", "websocket._logging",
            "--hidden-import", "websocket._socket",
            "--hidden-import", "websocket._ssl_compat",
            "--hidden-import", "websocket._url",
            "--hidden-import", "websocket._utils",
            "--hidden-import", "pynput",
            "--hidden-import", "pynput.mouse",
            "--hidden-import", "pynput.mouse._win32",
            "--hidden-import", "pynput.keyboard",
            "--hidden-import", "pynput.keyboard._win32",
            "--collect-all", "websocket",
            "--collect-all", "pynput",
        ]
        
        # Add icon if it exists
        if os.path.exists("app_icon.ico"):
            pyinstaller_args.extend(["--icon", "app_icon.ico"])
            print("✓ Using custom icon: app_icon.ico")
        else:
            print("⚠ No app_icon.ico found, using default icon")
        
        pyinstaller_args.append("time_tracker.py")
    
    result = subprocess.run(pyinstaller_args)
    
    if result.returncode == 0:
        print("\n" + "=" * 60)
        print("BUILD SUCCESSFUL!")
        print("=" * 60)
        exe_path = os.path.join(script_dir, 'dist', 'VIHI-TimeTracker.exe')
        print(f"\n📁 Executable: {exe_path}")
        
        if os.path.exists(exe_path):
            file_size = os.path.getsize(exe_path) / (1024 * 1024)
            print(f"📏 Size: {file_size:.2f} MB")
        
        # Create installer if requested
        if args.installer:
            print("\n" + "-" * 60)
            print("Creating installer...")
            print("-" * 60)
            
            installer_script = os.path.join(script_dir, "create_installer.py")
            if os.path.exists(installer_script):
                subprocess.run([sys.executable, installer_script])
            else:
                print("❌ create_installer.py not found")
                print("   To create installer, run: python create_installer.py")
        else:
            print(f"\n📦 To create installer, run:")
            print(f"   python create_installer.py")
            print(f"\n   Or build with: python build.py --installer")
    else:
        print("\n❌ BUILD FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()

