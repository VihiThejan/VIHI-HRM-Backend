# -*- mode: python ; coding: utf-8 -*-
# VIHI Time Tracker PyInstaller Spec File

import sys
from PyInstaller.utils.hooks import collect_all, collect_submodules

# Collect all websocket-client submodules
websocket_datas, websocket_binaries, websocket_hiddenimports = collect_all('websocket')
pynput_datas, pynput_binaries, pynput_hiddenimports = collect_all('pynput')

a = Analysis(
    ['time_tracker.py'],
    pathex=[],
    binaries=websocket_binaries + pynput_binaries,
    datas=[('README.md', '.')] + websocket_datas + pynput_datas,
    hiddenimports=[
        'websocket',
        'websocket._abnf',
        'websocket._app',
        'websocket._core',
        'websocket._exceptions',
        'websocket._handshake',
        'websocket._http',
        'websocket._logging',
        'websocket._socket',
        'websocket._ssl_compat',
        'websocket._url',
        'websocket._utils',
        'pynput',
        'pynput.mouse',
        'pynput.mouse._win32',
        'pynput.keyboard',
        'pynput.keyboard._win32',
        'pynput._util',
        'pynput._util.win32',
    ] + websocket_hiddenimports + pynput_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='VIHI-TimeTracker',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # windowed mode
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
