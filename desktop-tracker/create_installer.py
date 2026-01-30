"""
Create Installer Script for VIHI Time Tracker
Builds the complete installer using Inno Setup

Prerequisites:
1. Run build.py first to create the executable
2. Install Inno Setup from https://jrsoftware.org/isinfo.php

Usage:
    python create_installer.py
"""

import subprocess
import sys
import os
import shutil
from pathlib import Path

# Common Inno Setup installation paths
INNO_SETUP_PATHS = [
    r"C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    r"C:\Program Files\Inno Setup 6\ISCC.exe",
    r"C:\Program Files (x86)\Inno Setup 5\ISCC.exe",
    r"C:\Program Files\Inno Setup 5\ISCC.exe",
]

def find_inno_setup():
    """Find Inno Setup compiler (ISCC.exe)"""
    for path in INNO_SETUP_PATHS:
        if os.path.exists(path):
            return path
    
    # Check PATH environment
    try:
        result = subprocess.run(["where", "ISCC.exe"], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip().split('\n')[0]
    except:
        pass
    
    return None

def create_default_icon():
    """Create a default icon file if one doesn't exist"""
    icon_path = Path("app_icon.ico")
    if not icon_path.exists():
        print("⚠ No app_icon.ico found. Using default Windows icon.")
        # We'll skip the icon for now - Inno Setup will use default
        return False
    return True

def create_installer_images():
    """Create placeholder installer images if they don't exist"""
    # These are optional - Inno Setup works without them
    pass

def check_executable():
    """Check if the executable has been built"""
    exe_path = Path("dist/VIHI-TimeTracker.exe")
    if not exe_path.exists():
        print("❌ Executable not found at dist/VIHI-TimeTracker.exe")
        print("   Run 'python build.py' first to create the executable")
        return False
    return True

def build_installer():
    """Build the installer using Inno Setup"""
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    print("=" * 60)
    print("VIHI Time Tracker - Installer Builder")
    print("=" * 60)
    
    # Check prerequisites
    if not check_executable():
        sys.exit(1)
    
    # Find Inno Setup
    iscc_path = find_inno_setup()
    if not iscc_path:
        print("\n❌ Inno Setup not found!")
        print("\nPlease install Inno Setup:")
        print("  1. Download from: https://jrsoftware.org/isinfo.php")
        print("  2. Install with default settings")
        print("  3. Run this script again")
        sys.exit(1)
    
    print(f"✓ Found Inno Setup: {iscc_path}")
    
    # Check for ISS file
    iss_file = Path("installer.iss")
    if not iss_file.exists():
        print(f"❌ Installer script not found: {iss_file}")
        sys.exit(1)
    
    # Create output directory
    output_dir = Path("installer_output")
    output_dir.mkdir(exist_ok=True)
    
    # Modify ISS file if icon doesn't exist
    has_icon = create_default_icon()
    
    # Build the installer
    print("\n📦 Building installer...")
    
    try:
        # Create a temporary modified ISS if no icon
        iss_to_use = str(iss_file)
        
        if not has_icon:
            # Create modified version without icon requirement
            temp_iss = Path("installer_temp.iss")
            content = iss_file.read_text()
            content = content.replace("SetupIconFile=app_icon.ico", "; SetupIconFile=app_icon.ico  ; Commented - no icon")
            content = content.replace("WizardImageFile=installer_banner.bmp", "; WizardImageFile=installer_banner.bmp")
            content = content.replace("WizardSmallImageFile=installer_icon.bmp", "; WizardSmallImageFile=installer_icon.bmp")
            temp_iss.write_text(content)
            iss_to_use = str(temp_iss)
        
        result = subprocess.run(
            [iscc_path, iss_to_use],
            capture_output=True,
            text=True
        )
        
        # Clean up temp file
        if not has_icon and Path("installer_temp.iss").exists():
            Path("installer_temp.iss").unlink()
        
        if result.returncode != 0:
            print("❌ Installer build failed!")
            print(result.stdout)
            print(result.stderr)
            sys.exit(1)
        
        print(result.stdout)
        
    except Exception as e:
        print(f"❌ Error building installer: {e}")
        sys.exit(1)
    
    # Find the output file
    installer_files = list(output_dir.glob("*.exe"))
    if installer_files:
        installer_path = installer_files[0]
        print("\n" + "=" * 60)
        print("✅ INSTALLER CREATED SUCCESSFULLY!")
        print("=" * 60)
        print(f"\n📁 Installer: {installer_path.absolute()}")
        print(f"📏 Size: {installer_path.stat().st_size / 1024 / 1024:.2f} MB")
        print("\nTo distribute:")
        print("  1. Copy the installer to your server's downloads folder")
        print("  2. Users can download and run it to install the app")
        
        return str(installer_path)
    else:
        print("❌ Installer file not found in output directory")
        sys.exit(1)

def copy_to_backend_downloads(installer_path: str):
    """Copy installer to backend downloads folder"""
    downloads_dir = Path(__file__).parent.parent / "downloads"
    downloads_dir.mkdir(exist_ok=True)
    
    dest_path = downloads_dir / "VIHI-TimeTracker-Setup.exe"
    shutil.copy2(installer_path, dest_path)
    
    print(f"\n✓ Copied to: {dest_path}")
    print("  Ready for download via /api/downloads/time-tracker")

if __name__ == "__main__":
    installer = build_installer()
    
    # Ask if user wants to copy to backend
    response = input("\nCopy to backend downloads folder? (y/n): ")
    if response.lower() == 'y':
        copy_to_backend_downloads(installer)
