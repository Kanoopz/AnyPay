# Build and Install Instructions for AnyPay

This guide will help you build, download, and install the AnyPay app on an Android device.

## Prerequisites

1. **Expo Account**: Sign up at [expo.dev](https://expo.dev) (free)
2. **EAS CLI**: Install the Expo Application Services CLI
3. **Android Device**: Physical Android device with NFC support (required for NFC features)

---

## Method 1: EAS Build (Recommended - Cloud Build)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

### Step 3: Configure Project

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay
eas build:configure
```

### Step 4: Build Android APK

**For Development Build (with dev client):**
```bash
eas build --platform android --profile development
```

**For Preview/Internal Testing:**
```bash
eas build --platform android --profile preview
```

**For Production:**
```bash
eas build --platform android --profile production
```

### Step 5: Download the APK

1. After the build completes, EAS will provide a download link
2. You can also check your builds at: https://expo.dev/accounts/[your-username]/projects/anypay/builds
3. Click on the build and download the APK file

### Step 6: Install on Android Device

**Option A: Direct Download to Phone**
1. Open the download link on your Android device
2. Download the APK file
3. Enable "Install from Unknown Sources" in Android settings
4. Tap the downloaded APK to install

**Option B: Transfer via USB/ADB**
```bash
# Connect your Android device via USB
# Enable USB debugging in Developer Options
adb install path/to/your-app.apk
```

**Option C: Transfer via QR Code**
1. EAS will provide a QR code after build
2. Scan with your phone to download directly

---

## Method 2: Local Build (Requires Android Studio)

### Step 1: Install Prerequisites

1. **Android Studio**: Download from [developer.android.com](https://developer.android.com/studio)
2. **Java JDK**: Install JDK 17 or later
3. **Android SDK**: Install via Android Studio

### Step 2: Set Environment Variables

Add to your `~/.zshrc` or `~/.bash_profile`:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### Step 3: Build Locally

```bash
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay

# Install dependencies
npm install

# Build and run on connected device
npx expo run:android

# Or build APK only
npx expo run:android --variant release
```

The APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Install APK

```bash
# Via ADB
adb install android/app/build/outputs/apk/release/app-release.apk

# Or transfer to device and install manually
```

---

## Method 3: Development Build with Expo Go (Limited - NFC won't work)

**Note**: Expo Go doesn't support native modules, so NFC features won't work. Use this only for UI testing.

```bash
# Start Expo
npx expo start

# Scan QR code with Expo Go app
# NFC features will not be available
```

---

## Important Notes

### NFC Requirements

- **Physical Device Required**: NFC features only work on physical Android devices
- **NFC Enabled**: Make sure NFC is enabled in device settings
- **HCE Support**: Device must support Host Card Emulation (HCE)
- **Permissions**: The app requests NFC permission at runtime

### Android Configuration

The app requires the following Android configuration (already set up):
- NFC permission in `AndroidManifest.xml`
- HCE service configuration
- AID list for payment cards

### Testing NFC

1. **Send Data**: 
   - Open "Send Data" screen
   - Enter a string
   - Tap "Send via NFC"
   - Bring receiving device close

2. **Receive Data**:
   - Open "Receive Data" screen (auto-starts)
   - Bring sending device close
   - Data will be received automatically

---

## Troubleshooting

### Build Fails

1. **Check EAS CLI version**: `eas --version` (should be >= 13.2.0)
2. **Update dependencies**: `npm install`
3. **Clear cache**: `eas build --clear-cache`

### NFC Not Working

1. **Check device support**: Not all devices support HCE
2. **Enable NFC**: Settings → Connected devices → NFC
3. **Check permissions**: App should request NFC permission on first use
4. **Development build required**: NFC won't work in Expo Go

### Installation Issues

1. **Unknown Sources**: Enable "Install from Unknown Sources" in Android settings
2. **ADB not found**: Install Android SDK Platform Tools
3. **Device not detected**: Enable USB debugging in Developer Options

---

## Quick Start (EAS Build)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login
eas login

# 3. Build
cd /Users/kanoopz/Desktop/ethGlobalBuenosAires/anypay
eas build --platform android --profile preview

# 4. Download APK from Expo dashboard
# 5. Install on device
```

---

## Build Status

Check your builds at:
- Expo Dashboard: https://expo.dev/accounts/[username]/projects/anypay/builds
- Or use: `eas build:list`

---

## Next Steps After Installation

1. Open the app on your Android device
2. Grant NFC permissions when prompted
3. Test Send Data and Receive Data screens
4. Ensure both devices have NFC enabled
5. Test NFC communication between two devices

