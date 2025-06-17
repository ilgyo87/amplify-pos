# Stripe Terminal Testing Instructions

## Setup Steps

1. **Configure Stripe First**
   - Go to Settings in the app
   - Enter your Stripe credentials (if not already configured)
   - Save the settings

2. **Test Terminal Discovery**
   - Navigate to the checkout screen
   - Add some items to the cart
   - Tap "Checkout"
   - Select "Card Reader" as payment method
   - You'll see a toggle for "Use Test Readers" (ON by default)

## Testing Scenarios

### A. Test with Simulated Readers (Safe Mode)
1. Keep "Use Test Readers" toggle ON
2. Tap "Start Discovery"
3. You should see test readers like S700, WisePOS E
4. Select a reader to connect
5. Once connected, tap "Start Payment" to process a test payment

### B. Test with Real M2 Reader (May Crash)
1. Turn OFF "Use Test Readers" toggle
2. Ensure your M2 reader is powered on and nearby
3. Tap "Start Discovery"
4. The app will request Bluetooth permissions (if not already granted)
5. Wait for discovery to complete
6. If your M2 reader appears, select it to connect

## What's Been Fixed

1. **SafeTerminalDiscovery Component**: A more robust discovery UI that handles errors gracefully
2. **Bluetooth Permissions**: Added proper iOS permissions for Bluetooth
3. **UIBackgroundModes**: Added bluetooth-central for background Bluetooth operations
4. **autoReconnectOnUnexpectedDisconnect**: Added parameter to prevent M2 reader crashes

## Known Issues

The app is using `@stripe/stripe-terminal-react-native v0.0.1-beta.25` which has known Bluetooth crash issues on iOS. If the app still crashes when discovering real readers:

1. Use simulated readers for testing
2. Wait for a stable non-beta release
3. Consider downgrading to beta.21 or beta.24 (reported as more stable)

## Debug Information

Watch the console logs for:
- `[SAFE DISCOVERY]` - SafeTerminalDiscovery component logs
- `[STRIPE TERMINAL]` - Terminal SDK logs
- Any crash reports or errors