# Fix npm Not Recognized Issue

## Quick Fix

Node.js is installed at `C:\Program Files\nodejs\` but it's not in your PATH. Here's how to fix it:

### Option 1: Manual PATH Fix (Recommended)

1. **Open Environment Variables:**
   - Press `Win + X` and select **"System"**
   - Click **"Advanced system settings"** (on the right)
   - Click **"Environment Variables"** button at the bottom

2. **Add Node.js to PATH:**
   - Under **"User variables"** (top section), find **"Path"** and click **"Edit"**
   - Click **"New"**
   - Add: `C:\Program Files\nodejs`
   - Click **"OK"** on all dialogs

3. **Restart Your Terminal/IDE:**
   - Close and reopen your terminal/IDE
   - The PATH changes only take effect in new terminal sessions

4. **Verify:**
   ```powershell
   node --version
   npm --version
   ```

### Option 2: Use Full Path (Temporary)

If you need to use npm right now without fixing PATH:

```powershell
# Use full path to npm
& "C:\Program Files\nodejs\npm.cmd" install

# Or add to current session only:
$env:Path += ";C:\Program Files\nodejs"
npm install
```

### Option 3: Reinstall Node.js

If the above doesn't work, reinstall Node.js:

1. Download from: https://nodejs.org/ (LTS version)
2. During installation, make sure **"Add to PATH"** is checked
3. Restart your computer after installation

## Verify Installation

After fixing, verify everything works:

```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Check where they're installed
where.exe node
where.exe npm
```

## Still Not Working?

1. **Check if Node.js is actually installed:**

   ```powershell
   Test-Path "C:\Program Files\nodejs\node.exe"
   ```

2. **Check your current PATH:**

   ```powershell
   $env:PATH -split ';' | Select-String -Pattern 'node'
   ```

3. **Try restarting your computer** - sometimes Windows needs a full restart for PATH changes

4. **Check if npm.cmd exists:**
   ```powershell
   Test-Path "C:\Program Files\nodejs\npm.cmd"
   ```

## After Fixing

Once npm works, you can continue with Phase 1 setup:

```powershell
# Install dependencies
npm install

# Initialize Husky
npm run prepare

# Format code
npm run format

# Run tests
npm test
```

---

**Note**: The script `fix-nodejs-path.ps1` was created to automate this, but if it doesn't work, use the manual steps above.
