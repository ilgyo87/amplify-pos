# Stripe Terminal iOS Crash Fixes Summary

## Problem
The app was crashing when attempting to discover Bluetooth M2 card readers on iOS.

## Root Cause
Using `@stripe/stripe-terminal-react-native v0.0.1-beta.25` which has known Bluetooth crash issues on iOS (documented in GitHub issues #684 and #615).

## Fixes Applied

### 1. Created SafeTerminalDiscovery Component
- Location: `/src/components/checkout/SafeTerminalDiscovery.tsx`
- Features:
  - Robust error handling with try-catch blocks
  - User-friendly UI with clear status indicators
  - Proper cleanup on unmount
  - Delay before Bluetooth discovery on iOS
  - Clear separation between simulated and real readers

### 2. Added Error Boundary
- Location: `/src/components/ErrorBoundary.tsx`
- Wraps SafeTerminalDiscovery to catch any crashes
- Prevents entire app from crashing
- Shows fallback UI with retry option

### 3. iOS Configuration Updates
- Added Bluetooth permissions in Info.plist:
  - NSBluetoothAlwaysUsageDescription
  - NSBluetoothPeripheralUsageDescription
  - NSLocationWhenInUseUsageDescription
- Added UIBackgroundModes with bluetooth-central

### 4. Terminal SDK Parameters
- Added `autoReconnectOnUnexpectedDisconnect: true` to discovery and connection
- Increased timeout for Bluetooth discovery to 60 seconds
- Added delay before iOS Bluetooth discovery

### 5. UI Improvements
- Toggle to switch between test readers and real readers
- Default to test readers to avoid crashes
- Clear status messages and loading states
- Better reader selection UI

## Testing Approach

1. **Safe Mode (Default)**
   - Use simulated readers (toggle ON)
   - No Bluetooth required
   - Stable for development and testing

2. **Production Mode**
   - Turn off test readers toggle
   - Attempts real Bluetooth discovery
   - May still crash due to SDK beta issues

## Next Steps if Crashes Persist

1. **Downgrade SDK Version**
   ```json
   "@stripe/stripe-terminal-react-native": "^0.0.1-beta.21"
   ```
   or
   ```json
   "@stripe/stripe-terminal-react-native": "^0.0.1-beta.24"
   ```
   
2. **Wait for Stable Release**
   - Monitor Stripe Terminal React Native releases
   - Upgrade when non-beta version is available

3. **Alternative Approach**
   - Use Stripe's web-based Terminal for iOS
   - Implement native iOS Terminal SDK directly
   - Use a different payment terminal solution

## Current Status
- ✅ App no longer crashes immediately
- ✅ Simulated readers work reliably
- ✅ Proper error handling in place
- ⚠️  Real M2 reader may still cause crashes due to SDK beta issues
- ✅ User-friendly toggle to avoid crashes in production