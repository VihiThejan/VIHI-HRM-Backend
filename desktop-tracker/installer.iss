; VIHI Time Tracker - Inno Setup Installer Script
; This script creates a professional Windows installer

#define MyAppName "VIHI Time Tracker"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "VIHI Solutions"
#define MyAppURL "https://vihi.lk"
#define MyAppExeName "VIHI-TimeTracker.exe"

[Setup]
; Basic installer info
AppId={{E8F4A2B1-C6D3-4E5F-9A2B-7C8D9E0F1A2B}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation settings
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
DisableProgramGroupPage=yes

; Output settings
OutputDir=installer_output
OutputBaseFilename=VIHI-TimeTracker-Setup-{#MyAppVersion}

; Compression
Compression=lzma2/ultra64
SolidCompression=yes

; Privileges (requires admin for protocol registration)
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Appearance
WizardStyle=modern

; Version info
VersionInfoVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoProductName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"
Name: "registerprotocol"; Description: "Register protocol handler for web launch"

[Files]
; Main executable
Source: "dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; Documentation
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "SETUP_INSTRUCTIONS.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Desktop shortcut
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

; Start Menu
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"

[Registry]
; Register vihi-tracker:// protocol handler
Root: HKCR; Subkey: "vihi-tracker"; ValueType: string; ValueName: ""; ValueData: "URL:VIHI Time Tracker Protocol"; Flags: uninsdeletekey; Tasks: registerprotocol
Root: HKCR; Subkey: "vihi-tracker"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""; Tasks: registerprotocol
Root: HKCR; Subkey: "vihi-tracker\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName},0"; Tasks: registerprotocol
Root: HKCR; Subkey: "vihi-tracker\shell"; ValueType: string; ValueName: ""; ValueData: "open"; Tasks: registerprotocol
Root: HKCR; Subkey: "vihi-tracker\shell\open"; ValueType: string; ValueName: ""; ValueData: ""; Tasks: registerprotocol
Root: HKCR; Subkey: "vihi-tracker\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#MyAppExeName}"" ""%1"""; Tasks: registerprotocol

[Run]
; Option to launch app after installation
Filename: "{app}\{#MyAppExeName}"; Description: "Launch VIHI Time Tracker"; Flags: nowait postinstall skipifsilent
