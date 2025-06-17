# M2 Reader Connection Troubleshooting

## Current Status
- ✅ Reader discovered successfully (STRM26214041495)
- ✅ Location ID retrieved (tml_GEhQAQF4KscBFH)  
- ❌ Connection failing with InvalidConnectionConfiguration

## Common Causes & Solutions

### 1. Bluetooth Pairing Issue
**IMPORTANT**: The M2 reader must NOT be paired through iOS Bluetooth settings.

**To check:**
1. Go to Settings > Bluetooth on your iOS device
2. Look for "STRM26214041495" or any Stripe reader
3. If found, tap the (i) icon and select "Forget This Device"

**The reader should only be connected through the Stripe Terminal SDK.**

### 2. Reader Registration
The M2 reader must be registered to a location in your Stripe Dashboard.

**To verify:**
1. Log into Stripe Dashboard
2. Go to Terminal > Readers
3. Find your reader (STRM26214041495)
4. Ensure it's assigned to location "tml_GEhQAQF4KscBFH"

### 3. Reader Battery
- Minimum 10% battery for normal connection
- Minimum 50% battery if software updates are needed

### 4. SDK Version Issue
You're using `@stripe/stripe-terminal-react-native v0.0.1-beta.25` which has known issues with M2 Bluetooth connections.

**Potential Solutions:**
1. Try connecting with the reader in a different state
2. Restart the M2 reader (hold power button)
3. Ensure the Stripe reader app is updated

### 5. Connection Parameters
The current connection attempt uses:
```javascript
{
  reader: { /* reader object */ },
  locationId: "tml_GEhQAQF4KscBFH"
}
```

### Debug Steps
1. Check iOS Bluetooth settings - reader should NOT be paired
2. Restart the M2 reader
3. Try with simulated readers first to ensure Terminal is working
4. Check Stripe Dashboard for reader status
5. Try on a different iOS device if possible

### Alternative Approaches
If connection continues to fail:
1. Use simulated readers for testing
2. Consider using internet-connected readers (WisePOS E, S700)
3. Wait for stable SDK release (non-beta)
4. Contact Stripe Support with your reader serial number

### Logs to Share with Support
```
Reader Serial: STRM26214041495
Location ID: tml_GEhQAQF4KscBFH
SDK Version: 0.0.1-beta.25
Error: InvalidConnectionConfiguration
```