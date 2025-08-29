# Test Docker build process locally
Write-Host "🐳 Testing Docker build process locally..." -ForegroundColor Cyan

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "client/build") { Remove-Item -Recurse -Force "client/build" }

# Install dependencies (simulating Docker npm ci)
Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
npm ci

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install server dependencies" -ForegroundColor Red
    exit 1
}

# Install client dependencies
Write-Host "📦 Installing client dependencies..." -ForegroundColor Yellow
Set-Location client
npm ci

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install client dependencies" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Build server (simulating Docker build)
Write-Host "🔨 Building server..." -ForegroundColor Yellow
npm run build:server

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Server build failed" -ForegroundColor Red
    exit 1
}

# Build client (simulating Docker build)
Write-Host "🔨 Building client..." -ForegroundColor Yellow
Set-Location client
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Client build failed" -ForegroundColor Red
    exit 1
}

Set-Location ..

Write-Host "✅ Docker build simulation completed successfully!" -ForegroundColor Green
Write-Host "📊 Build artifacts:" -ForegroundColor Cyan
Write-Host "  - Server: dist/" -ForegroundColor White
Write-Host "  - Client: client/build/" -ForegroundColor White
