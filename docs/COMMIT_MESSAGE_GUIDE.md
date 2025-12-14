# Commit Message Guide

## Commitlint Rules

Your commit messages must follow these rules:

1. **Type and scope** (required)
2. **Subject** (required, max 72 characters)
3. **Body** (optional, but if present, lines must be ≤ 100 characters)
4. **Footer** (optional)

## Format

```
type(scope): subject

[optional body - wrap lines at 100 characters]

[optional footer]
```

## Your Current Issue

Your commit message body has lines longer than 100 characters:

```
- Introduced dexie as a dependency for enhanced IndexedDB management.
- Updated storage API to provide a synchronous wrapper for localStorage while ensuring compatibility with async storage methods.
```

## Fixed Version

Here's the corrected commit message:

```
feat(storage): add dexie for improved data management

- Introduced dexie as a dependency for enhanced IndexedDB management
- Updated storage API to provide a synchronous wrapper for localStorage
  while ensuring compatibility with async storage methods

These changes aim to improve data handling and maintain backward
compatibility.
```

## Quick Fix

When committing, wrap long lines in the body at 100 characters:

```bash
git commit -m "feat(storage): add dexie for improved data management" \
  -m "- Introduced dexie as a dependency for enhanced IndexedDB management" \
  -m "- Updated storage API to provide a synchronous wrapper for localStorage" \
  -m "  while ensuring compatibility with async storage methods" \
  -m "" \
  -m "These changes aim to improve data handling and maintain backward" \
  -m "compatibility."
```

Or use a text editor:

```bash
git commit
# This opens your editor where you can format the message properly
```

## Tips

1. **Keep subject line ≤ 72 characters**
2. **Wrap body lines at 100 characters**
3. **Use blank line between subject and body**
4. **Use bullet points for multiple changes**
5. **Indent continuation lines with 2 spaces**

## Examples

### Good ✅

```
feat(auth): add password strength validation

- Implemented zxcvbn for password strength checking
- Added visual password strength indicator
- Enforced minimum 12 character requirement
```

### Bad ❌

```
feat(auth): add password strength validation
- Implemented zxcvbn for password strength checking and added visual password strength indicator with minimum 12 character requirement
```

---

**Note**: If you need to bypass commitlint (not recommended), use `--no-verify`:

```bash
git commit --no-verify -m "your message"
```

But it's better to fix the message format!
