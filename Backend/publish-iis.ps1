# PowerShell Script to Build and Publish Backend for IIS Deployment
# Run this script from the Backend directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Bulk Import Backend - IIS Publisher  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set error action preference
$ErrorActionPreference = "Stop"

try {
    # Step 1: Clean
    Write-Host "[1/4] Cleaning previous builds..." -ForegroundColor Yellow
    dotnet clean
    if ($LASTEXITCODE -ne 0) {
        throw "Clean failed"
    }
    Write-Host "[OK] Clean completed" -ForegroundColor Green
    Write-Host ""

    # Step 2: Restore packages
    Write-Host "[2/4] Restoring NuGet packages..." -ForegroundColor Yellow
    dotnet restore
    if ($LASTEXITCODE -ne 0) {
        throw "Restore failed"
    }
    Write-Host "[OK] Restore completed" -ForegroundColor Green
    Write-Host ""

    # Step 3: Build
    Write-Host "[3/4] Building in Release mode..." -ForegroundColor Yellow
    dotnet build --configuration Release --no-restore
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed"
    }
    Write-Host "[OK] Build completed" -ForegroundColor Green
    Write-Host ""

    # Step 4: Publish
    Write-Host "[4/4] Publishing to publish folder..." -ForegroundColor Yellow
    dotnet publish --configuration Release --output "publish" --no-build
    if ($LASTEXITCODE -ne 0) {
        throw "Publish failed"
    }
    Write-Host "[OK] Publish completed" -ForegroundColor Green
    Write-Host ""

    # Success message
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  PUBLISH SUCCESSFUL!                  " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Published files location:" -ForegroundColor White
    Write-Host "  $(Resolve-Path 'publish')" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Yellow
    Write-Host "  1. Copy the 'publish' folder to your Windows Server" -ForegroundColor White
    Write-Host "  2. Place it in: C:\inetpub\wwwroot\BulkImportBackend" -ForegroundColor White
    Write-Host "  3. Update appsettings.json with production database credentials" -ForegroundColor White
    Write-Host "  4. Configure IIS (see DEPLOYMENT-GUIDE.md)" -ForegroundColor White
    Write-Host ""
    Write-Host "Production URL: https://exceljet.indusanalytics.co.in" -ForegroundColor Cyan
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  PUBLISH FAILED                       " -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    $errorMessage = $_.Exception.Message
    Write-Host "Error: $errorMessage" -ForegroundColor Red
    Write-Host ""
    exit 1
}
