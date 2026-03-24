# PowerShell Script to Build and Deploy Frontend to Vercel
# Run this script from the Frontend directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Bulk Import Frontend - Vercel Deploy  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set error action preference
$ErrorActionPreference = "Stop"

try {
    # Step 1: Check if .env.production exists
    Write-Host "[1/5] Checking environment configuration..." -ForegroundColor Yellow
    if (-Not (Test-Path ".env.production")) {
        Write-Host "✗ .env.production file not found!" -ForegroundColor Red
        throw "Please create .env.production file first"
    }
    Write-Host "✓ Environment configuration found" -ForegroundColor Green
    Write-Host ""

    # Step 2: Install dependencies
    Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
    Write-Host ""

    # Step 3: Build for production
    Write-Host "[3/5] Building for production..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "✓ Build completed" -ForegroundColor Green
    Write-Host ""

    # Step 4: Check if Vercel CLI is installed
    Write-Host "[4/5] Checking Vercel CLI..." -ForegroundColor Yellow
    $vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue
    if (-Not $vercelInstalled) {
        Write-Host "⚠ Vercel CLI not found. Installing..." -ForegroundColor Yellow
        npm install -g vercel
        if ($LASTEXITCODE -ne 0) {
            throw "Failed to install Vercel CLI"
        }
    }
    Write-Host "✓ Vercel CLI ready" -ForegroundColor Green
    Write-Host ""

    # Step 5: Deploy to Vercel
    Write-Host "[5/5] Deploying to Vercel..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Note: You may need to login to Vercel if this is your first time" -ForegroundColor Cyan
    Write-Host ""

    vercel --prod
    if ($LASTEXITCODE -ne 0) {
        throw "Vercel deployment failed"
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ✓ DEPLOYMENT SUCCESSFUL!             " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Production URL: https://bulkimport.vercel.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Open https://bulkimport.vercel.app in browser" -ForegroundColor White
    Write-Host "  2. Test login functionality" -ForegroundColor White
    Write-Host "  3. Verify no CORS errors in browser console" -ForegroundColor White
    Write-Host "  4. Check all features are working" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ✗ DEPLOYMENT FAILED                  " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""

    if ($_ -like "*Vercel CLI*") {
        Write-Host "Tip: Try installing Vercel CLI manually:" -ForegroundColor Yellow
        Write-Host "  npm install -g vercel" -ForegroundColor Cyan
        Write-Host ""
    }

    exit 1
}
