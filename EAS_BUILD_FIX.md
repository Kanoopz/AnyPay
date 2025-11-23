# EAS Build Issue - Solution Guide

## Problem Explanation

EAS Build is detecting files from outside your project directory (`~/Library/` - macOS system files). This happens because:

1. **EAS scans based on git status**: EAS uses `git status` to determine which files to include
2. **Parent directory git repo**: There might be a git repository in a parent directory
3. **Untracked files**: Git is seeing untracked files from system directories

## Solutions (Choose One)

### ✅ Solution 1: Use `--local` Flag (Recommended)

Force EAS to only look at the current directory:

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay
eas build --platform android --profile preview --local
```

**Pros**: Quick fix, no configuration changes
**Cons**: Builds locally (requires Android Studio setup)

---

### ✅ Solution 2: Use `--non-interactive` with Clean Git State

Ensure git only tracks project files:

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay

# Make sure all project files are committed
git add -A
git commit -m "Prepare for EAS build"

# Verify no untracked files
git status --porcelain

# Build with non-interactive mode
eas build --platform android --profile preview --non-interactive
```

---

### ✅ Solution 3: Create `.easrc` Configuration File

Create a file to explicitly set the project root:

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay
```

Create `.easrc`:
```json
{
  "build": {
    "projectRoot": "."
  }
}
```

Then build:
```bash
eas build --platform android --profile preview
```

---

### ✅ Solution 4: Use `eas.json` with Explicit Ignore Patterns

Update `eas.json` to exclude system files:

```json
{
  "cli": {
    "version": ">= 13.2.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EAS_BUILD_IGNORE_PATTERNS": "Library/**,**/Library/**,~/**"
      }
    }
  }
}
```

---

### ✅ Solution 5: Build from Temporary Clean Directory (Nuclear Option)

Create a clean copy of your project:

```bash
# Create a temporary clean directory
cd /tmp
mkdir anypay-build
cd anypay-build

# Copy only project files (exclude .git, node_modules, etc.)
rsync -av --exclude='.git' --exclude='node_modules' --exclude='.expo' \
  /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay/ .

# Initialize fresh git repo
git init
git add .
git commit -m "Clean build"

# Build from clean directory
eas build --platform android --profile preview
```

---

## Recommended Approach

**Use Solution 1** (`--local` flag) if you have Android Studio set up, OR

**Use Solution 2** (clean git state) if you want cloud builds.

## Quick Fix Command

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay

# Option A: Local build (requires Android Studio)
eas build --platform android --profile preview --local

# Option B: Cloud build with clean state
git add -A
git commit -m "Prepare for build"
eas build --platform android --profile preview --non-interactive
```

## Verification

After applying a solution, verify EAS only sees project files:

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay
git status --porcelain | grep -v "^??" | head -10
```

Should only show project files, not `Library/` paths.


