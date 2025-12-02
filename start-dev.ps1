# Add Node.js to PATH for this session
$env:Path += ";C:\Program Files\nodejs"

# Ensure we're in the correct directory
Set-Location $PSScriptRoot

# Start development server
npm run dev
