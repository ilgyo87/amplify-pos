# RxDB Local Database Implementation

## Overview
This implementation provides a local-first database solution using RxDB with customer management functionality. The database is designed to work offline and can be manually synced with AWS Amplify backend.

## Features
- ✅ **Local Storage**: Uses RxDB with in-memory storage (easily upgradeable to persistent storage)
- ✅ **Real-time Reactivity**: Automatic UI updates when data changes
- ✅ **Customer CRUD Operations**: Create, read, update, delete customers
- ✅ **Search Functionality**: Search customers by name, email, or phone
- ✅ **Sync Preparation**: Built-in fields for manual Amplify synchronization

## File Structure
```
src/database/
├── config.ts                 # Database configuration and initialization
├── schemas/
│   └── customer.ts           # Customer schema definition
├── services/
│   └── customerService.ts    # Customer CRUD operations
├── hooks/
│   └── useCustomers.ts       # React hook for customer operations
└── index.ts                  # Main exports
```

## Usage

### Initialize Database
The database is automatically initialized when the app starts (see `App.tsx`).

### Using the Customer Hook
```typescript
import { useCustomers } from '../database/hooks/useCustomers';

const MyComponent = () => {
  const { customers, loading, error, createCustomer, deleteCustomer } = useCustomers();
  
  // customers array updates automatically
  // createCustomer() to add new customers
  // deleteCustomer(id) to remove customers
};
```

### Direct Service Usage
```typescript
import { customerService } from '../database';

// Create customer
const newCustomer = await customerService.createCustomer({
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
  email: 'john@example.com'
});

// Search customers
const results = await customerService.searchCustomers('John');
```

## Data Model
Each customer record includes:
- Basic info: firstName, lastName, phone, email, address
- Location: coordinates (lat/long)
- Business relationship: businessId, cognitoId
- Sync management: isLocalOnly, amplifyId, lastSyncedAt
- Timestamps: createdAt, updatedAt

## Sync Strategy
Records are marked with:
- `isLocalOnly: true` for new/unsynced records
- `amplifyId` stores the backend ID after sync
- `lastSyncedAt` tracks when last synced

## Next Steps for Amplify Integration
1. Add sync service to push local-only records to Amplify
2. Add conflict resolution for bidirectional sync
3. Implement real-time subscriptions from Amplify
4. Add batch sync operations
5. Switch to persistent storage (AsyncStorage or SQLite)

## Demo
See `src/screens/Customers/CustomersScreen.tsx` for a working example with add/delete operations and real-time updates.