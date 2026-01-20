"""
Build script for VIHI Intern Tracker Desktop Application
Creates standalone executable for Windows
"""

import subprocess
import sys
import os
import shutil

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    print("=" * 50)
    print("VIHI Intern Tracker - Build Script")
    print("=" * 50)
    
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
    
    # Build the executable
    print("\nBuilding executable...")
    
    pyinstaller_args = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",
        "--windowed",
        "--name", "VIHI-InternTracker",
        "intern_tracker.py"
    ]
    
    result = subprocess.run(pyinstaller_args)
    
    if result.returncode == 0:
        print("\n" + "=" * 50)
        print("BUILD SUCCESSFUL!")
        print("=" * 50)
        print(f"\nExecutable: {os.path.join(script_dir, 'dist', 'VIHI-InternTracker.exe')}")
    else:
        print("\nBUILD FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()
