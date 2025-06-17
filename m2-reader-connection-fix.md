# M2 Reader Connection Fix

## Problem Solved
The M2 reader was being discovered but connection was failing with "Invalid connection configuration" error because physical readers require a location ID.

## Solution Applied

### 1. Backend Changes (Lambda Function)
Updated the `/connection_token` endpoint to:
- Create or retrieve a Stripe Terminal location
- Return the location ID along with the connection token
- Use default location details for POS terminals

### 2. Frontend Changes
- Created `stripeLocationService.ts` to manage location ID storage
- Updated `stripeService.ts` to save location ID when fetching connection token
- Modified `PaymentModal.tsx` to use the stored location ID when connecting readers

### 3. Connection Flow
1. When Terminal initializes, it fetches a connection token
2. Backend creates/retrieves a location and returns its ID
3. Frontend stores this location ID
4. When connecting to M2 reader, the stored location ID is used

## Testing Steps
1. Ensure your Stripe account is properly configured
2. Turn off "Use Test Readers" toggle
3. Power on your M2 reader
4. Tap "Start Discovery"
5. Select your M2 reader (STRM26214041495)
6. The reader should now connect successfully

## Key Code Changes

### Lambda Handler
```typescript
// Create or get location
const locations = await stripe.terminal.locations.list({ limit: 1 });
let locationId = locations.data[0]?.id;

if (!locationId) {
  const location = await stripe.terminal.locations.create({
    display_name: 'Default POS Location',
    address: { /* default address */ }
  });
  locationId = location.id;
}

// Return with connection token
return {
  secret: connectionToken.secret,
  location_id: locationId
};
```

### Frontend Connection
```typescript
const locationId = await stripeLocationService.getLocationId();
const { reader: connectedReader, error } = await connectReader({
  reader,
  locationId: locationId || reader.location?.id,
  autoReconnectOnUnexpectedDisconnect: true
});
```

## Status
✅ M2 reader discovered successfully
✅ Location ID retrieved and stored
✅ Connection configuration fixed
🔄 Ready for testing M2 reader connection