# Installing Dependencies Locally

**Issue**: npm install cannot be run from this cloud environment due to registry/connectivity issues.

**Solution**: Run npm install on your local Windows 11 machine.

---

## Step 1: Open PowerShell on Your Local Machine

Press `Win + X` and select "PowerShell" or "Terminal"

---

## Step 2: Navigate to Auth Service

```powershell
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service
```

---

## Step 3: Clean Previous Attempts (if any failed)

```powershell
# Remove old node_modules and lock files
Remove-Item -Recurse -Force node_modules 2>$null
Remove-Item package-lock.json 2>$null
```

---

## Step 4: Install Dependencies

```powershell
# Fresh install
npm install

# This will:
# - Download all dependencies from npm registry
# - Install them into node_modules/
# - Create package-lock.json
# - Take 2-5 minutes depending on internet speed

# Watch for:
# added XXX packages in XXms
```

**Expected Output**:
```
npm notice
npm notice New minor version of npm available: 11.x.x → 11.x.x
npm notice To update run: npm install -g npm@latest
npm notice
added 527 packages, and audited 528 packages in 2m45s
```

---

## Step 5: Verify Installation

```powershell
# Check node_modules exists
ls node_modules | wc -l
# Should show: 528 (or similar)

# Verify key packages installed
npm list express typescript nodemon
# Should show versions for all three
```

---

## If Installation Fails

### Issue: "No matching version found"

```powershell
# Clear npm cache
npm cache clean --force

# Try again with legacy peer deps flag
npm install --legacy-peer-deps
```

### Issue: "EACCES: permission denied"

```powershell
# Run PowerShell as Administrator
# (Right-click PowerShell → Run as Administrator)
# Then try again: npm install
```

### Issue: "npm: command not found"

```powershell
# Node.js might not be in PATH
# Check if installed:
node --version

# If not installed, download from: https://nodejs.org/
# Install Node.js 20 LTS
# Then restart PowerShell and try again
```

---

## Once Installation Completes

You're ready to run the service!

```powershell
npm run dev

# Expected output (after 5-10 seconds):
# [Server] Auth Service running on port 3001
# [Server] ✓ Auth Service started successfully
# [Server] Ready to accept requests
```

---

## Quick Reference

```powershell
# Navigate to auth service
cd C:\Users\Admin\Documents\FormaconIA\backend\packages\auth-service

# Install (one time)
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm run test
```

---

## Troubleshooting Commands

```powershell
# Check Node.js installation
node --version
npm --version

# Check if packages installed
ls node_modules | wc -l

# See what's installed
npm list

# Check for outdated packages
npm outdated

# Update packages
npm update

# Verify installation worked
npm run build

# See available scripts
npm run
```

---

## Next Steps After npm install

1. ✅ Run `npm run dev` to start service
2. ✅ Test health check: `curl http://localhost:3001/health`
3. ✅ Follow **AUTH4-LOCAL-TESTING-GUIDE.md** for 10 tests

---

**Status**: Ready to install locally on your machine

**Time**: 3-5 minutes for installation, then service starts immediately
