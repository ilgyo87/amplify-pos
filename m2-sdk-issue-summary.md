# M2 Reader SDK Issue Summary

## Root Cause
The M2 reader is discovered but has `id: null`, which causes the InvalidConnectionConfiguration error. This is a known issue with `@stripe/stripe-terminal-react-native v0.0.1-beta.25`.

## Evidence
```javascript
// Reader object from discovery:
{
  "id": null,  // ← This is the problem
  "deviceType": "stripeM2",
  "serialNumber": "STRM26214041495",
  "status": "offline",
  // ... other fields
}
```

## Related GitHub Issues
- [Issue #680](https://github.com/stripe/stripe-terminal-react-native/issues/680): "Unable to connect to simulated m2 reader on Tap To Pay for iOS (reader id is null)"
- [Issue #684](https://github.com/stripe/stripe-terminal-react-native/issues/684): "Crash issue when connecting via Bluetooth with the M2 reader"

## Workarounds

### 1. Use Simulated Readers (Recommended)
- Turn ON "Use Test Readers" toggle
- Select S700 or WisePOS E simulated readers
- These work reliably for development and testing

### 2. Downgrade SDK Version
Try an earlier beta version that might work better:
```json
"@stripe/stripe-terminal-react-native": "^0.0.1-beta.21"
```

### 3. Wait for Stable Release
Monitor the [Stripe Terminal React Native releases](https://github.com/stripe/stripe-terminal-react-native/releases) for a non-beta version.

### 4. Use Alternative Readers
Consider internet-connected readers like:
- WisePOS E
- Stripe Reader S700
- BBPOS Chipper 2X BT (if supported)

## Current Implementation
The app now:
1. ✅ Discovers M2 readers successfully
2. ✅ Retrieves and stores location ID
3. ✅ Shows proper UI for reader selection
4. ❌ Cannot connect due to null reader ID (SDK bug)
5. ✅ Shows informative error message about the SDK issue

## Production Readiness
For production deployment:
- Use internet-connected readers (S700, WisePOS E)
- Or wait for stable SDK release
- Test thoroughly with real devices before deployment