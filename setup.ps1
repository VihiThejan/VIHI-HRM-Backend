# Create required directories
New-Item -ItemType Directory -Path logs -Force
New-Item -ItemType Directory -Path uploads -Force

# Copy environment file
Copy-Item .env.example .env

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env file with your configuration"
Write-Host "2. Run 'npm install' to install dependencies"
Write-Host "3. Run 'npm run dev' to start development server"
