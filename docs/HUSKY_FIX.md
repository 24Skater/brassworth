# Husky Hooks Fix for Git Bash

## Problem

When committing with Git Bash, Husky hooks fail with:

```
.husky/pre-commit: line 1: npx: command not found
```

This happens because Git Bash doesn't have Node.js in its PATH.

## Solution

The Husky hooks have been updated to:

1. Automatically detect Node.js installation location
2. Add Node.js to PATH before running commands
3. Support multiple Node.js installation paths
4. Fall back to `node_modules/.bin` if available

## What Was Changed

### `.husky/pre-commit`

- Added PATH detection and setup
- Supports multiple Node.js installation locations
- Uses `node_modules/.bin` as fallback

### `.husky/commit-msg`

- Same PATH setup as pre-commit
- Ensures commitlint can find npx

## Alternative Solutions

If the hooks still don't work, you can:

### Option 1: Add Node.js to Git Bash PATH Permanently

Add to your `~/.bashrc` or `~/.bash_profile`:

```bash
export PATH="/c/Program Files/nodejs:$PATH"
```

### Option 2: Use PowerShell or CMD for Git Commits

If Git Bash continues to have issues, use PowerShell or CMD for Git operations:

```powershell
git commit -m "your message"
```

### Option 3: Disable Hooks Temporarily

If you need to commit without hooks (not recommended):

```bash
git commit --no-verify -m "your message"
```

## Verification

After the fix, try committing:

```bash
git add .
git commit -m "test: verify husky hooks work"
```

The hooks should now run successfully.

## Permanent Fix

For a permanent solution, add Node.js to your system PATH:

1. Press `Win + X` → "System"
2. "Advanced system settings" → "Environment Variables"
3. Under "User variables", edit "Path"
4. Add: `C:\Program Files\nodejs`
5. Restart your IDE/terminal

This will make npm/npx available in all terminals, including Git Bash.

---

**Last Updated**: December 2024
