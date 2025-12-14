# Troubleshooting Guide

## Node.js and npm Not Recognized in Terminal

### Problem

Node.js is installed but `node` or `npm` commands are not recognized in the terminal.

### Solutions

#### Solution 1: Add Node.js to PATH (Recommended)

1. **Find Node.js Installation Location**
   - Common locations:
     - `C:\Program Files\nodejs\`
     - `C:\Program Files (x86)\nodejs\`
     - `%LOCALAPPDATA%\Programs\nodejs\` (User installation)

2. **Add to PATH (Windows 10/11)**
   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "System variables" (or "User variables"), find "Path" and click "Edit"
   - Click "New" and add the Node.js installation path (e.g., `C:\Program Files\nodejs`)
   - Click "OK" on all dialogs
   - **Restart your terminal/IDE** for changes to take effect

3. **Verify Installation**
   ```powershell
   node --version
   npm --version
   ```

#### Solution 2: Reinstall Node.js

1. **Download Node.js**
   - Visit https://nodejs.org/
   - Download the LTS version
   - During installation, make sure "Add to PATH" is checked

2. **Verify Installation**
   ```powershell
   node --version
   npm --version
   ```

#### Solution 3: Use Full Path (Temporary)

If you need to use npm immediately without fixing PATH:

```powershell
# Find your Node.js installation
# Then use full path:
& "C:\Program Files\nodejs\npm.cmd" install
```

#### Solution 4: Use nvm-windows (Node Version Manager)

If you want to manage multiple Node.js versions:

1. **Install nvm-windows**
   - Download from: https://github.com/coreybutler/nvm-windows/releases
   - Install the `nvm-setup.exe`

2. **Install Node.js via nvm**

   ```powershell
   nvm install lts
   nvm use lts
   ```

3. **Verify**
   ```powershell
   node --version
   npm --version
   ```

### Quick PowerShell Script to Fix PATH

Run this in PowerShell as Administrator:

```powershell
# Check common Node.js locations
$nodePaths = @(
    "C:\Program Files\nodejs",
    "C:\Program Files (x86)\nodejs",
    "$env:LOCALAPPDATA\Programs\nodejs"
)

$foundPath = $null
foreach ($path in $nodePaths) {
    if (Test-Path "$path\node.exe") {
        $foundPath = $path
        Write-Host "Found Node.js at: $path" -ForegroundColor Green
        break
    }
}

if ($foundPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($currentPath -notlike "*$foundPath*") {
        [Environment]::SetEnvironmentVariable("Path", "$currentPath;$foundPath", "User")
        Write-Host "Added $foundPath to PATH. Please restart your terminal." -ForegroundColor Yellow
    } else {
        Write-Host "Node.js path already in PATH" -ForegroundColor Green
    }
} else {
    Write-Host "Node.js not found in common locations. Please install Node.js first." -ForegroundColor Red
}
```

### Alternative: Use Package Managers

#### Using Chocolatey

```powershell
# Install Chocolatey first (if not installed)
# Then:
choco install nodejs
```

#### Using Winget

```powershell
winget install OpenJS.NodeJS.LTS
```

### Verify After Fix

After fixing PATH or reinstalling:

```powershell
# Check Node.js version
node --version

# Check npm version
npm --version

# Check installation location
where.exe node
where.exe npm
```

### Common Issues

1. **Terminal Not Restarted**: After adding to PATH, you must restart your terminal/IDE
2. **Wrong Installation**: Make sure you installed Node.js (not just a runtime)
3. **Multiple Installations**: Remove old installations to avoid conflicts
4. **Permissions**: Some operations may require Administrator privileges

### Still Having Issues?

1. Check if Node.js is actually installed:

   ```powershell
   Get-Command node -ErrorAction SilentlyContinue
   Get-Command npm -ErrorAction SilentlyContinue
   ```

2. Check your PATH variable:

   ```powershell
   $env:PATH -split ';' | Select-String -Pattern 'node'
   ```

3. Try using the full path to verify Node.js works:
   ```powershell
   & "C:\Program Files\nodejs\node.exe" --version
   ```

---

## Other Common Issues

### Issue: npm Commands Fail with Permission Errors

**Solution**: Run terminal as Administrator or configure npm to use a different directory:

```powershell
npm config set prefix "$env:APPDATA\npm"
```

### Issue: npm is Outdated

**Solution**: Update npm:

```powershell
npm install -g npm@latest
```

### Issue: Package Installation Fails

**Solution**: Clear npm cache:

```powershell
npm cache clean --force
```

---

_Last Updated: December 2024_
