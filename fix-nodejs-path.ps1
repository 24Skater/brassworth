# Fix Node.js PATH Script
# Run this script in PowerShell (may require Administrator privileges)

Write-Host "Node.js PATH Fix Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js exists in common locations
$nodePaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs"
)

$foundPath = $null
foreach ($path in $nodePaths) {
    if (Test-Path "$path\node.exe") {
        $foundPath = $path
        Write-Host "✓ Found Node.js at: $path" -ForegroundColor Green
        break
    }
}

if (-not $foundPath) {
    Write-Host "✗ Node.js not found in common locations." -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check current PATH
$currentUserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$currentSystemPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

# Check if already in PATH
if ($currentUserPath -like "*$foundPath*" -or $currentSystemPath -like "*$foundPath*") {
    Write-Host "✓ Node.js path already in PATH" -ForegroundColor Green
    Write-Host ""
    Write-Host "If npm still doesn't work, try:" -ForegroundColor Yellow
    Write-Host "  1. Restart your terminal/IDE" -ForegroundColor Yellow
    Write-Host "  2. Restart your computer" -ForegroundColor Yellow
    exit 0
}

# Add to User PATH (doesn't require admin)
Write-Host ""
Write-Host "Adding Node.js to User PATH..." -ForegroundColor Yellow

try {
    $newPath = if ($currentUserPath) { "$currentUserPath;$foundPath" } else { $foundPath }
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    
    # Update current session PATH
    $env:Path = "$env:Path;$foundPath"
    
    Write-Host "✓ Successfully added to PATH!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Please restart your terminal/IDE for changes to take effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restarting, verify with:" -ForegroundColor Cyan
    Write-Host "  node --version" -ForegroundColor White
    Write-Host "  npm --version" -ForegroundColor White
} catch {
    Write-Host "✗ Failed to add to PATH: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "  1. Press Win + X, select 'System'" -ForegroundColor White
    Write-Host "  2. Click 'Advanced system settings'" -ForegroundColor White
    Write-Host "  3. Click 'Environment Variables'" -ForegroundColor White
    Write-Host "  4. Under 'User variables', edit 'Path'" -ForegroundColor White
    Write-Host "  5. Add: $foundPath" -ForegroundColor White
    exit 1
}

# Verify npm exists
$npmPath = Join-Path $foundPath "npm.cmd"
if (Test-Path $npmPath) {
    Write-Host ""
    Write-Host "✓ npm found at: $npmPath" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠ npm.cmd not found. Node.js installation may be incomplete." -ForegroundColor Yellow
    Write-Host "  Try reinstalling Node.js from https://nodejs.org/" -ForegroundColor Yellow
}
