import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface LocationType {
  lat: number;
  long: number;
}

export interface CustomerDocType {
  id: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  coordinates?: LocationType;
  email?: string;
  businessId?: string;
  cognitoId?: string;
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean; // For soft deletes
  lastSyncedAt?: string;
  amplifyId?: string; // Store the Amplify ID when synced
  createdAt: string;
  updatedAt: string;
}

export const customerSchema: RxJsonSchema<CustomerDocType> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    firstName: {
      type: 'string',
      maxLength: 100
    },
    lastName: {
      type: 'string',
      maxLength: 100
    },
    address: {
      type: 'string',
      maxLength: 500
    },
    city: {
      type: 'string',
      maxLength: 100
    },
    state: {
      type: 'string',
      maxLength: 50
    },
    zipCode: {
      type: 'string',
      maxLength: 20
    },
    phone: {
      type: 'string',
      maxLength: 20
    },
    coordinates: {
      type: 'object',
      properties: {
        lat: {
          type: 'number'
        },
        long: {
          type: 'number'
        }
      }
    },
    email: {
      type: 'string',
      maxLength: 200
    },
    businessId: {
      type: 'string',
      maxLength: 100
    },
    cognitoId: {
      type: 'string',
      maxLength: 100
    },
    isLocalOnly: {
      type: 'boolean'
    },
    isDeleted: {
      type: 'boolean',
      default: false
    },
    lastSyncedAt: {
      type: 'string',
      // Removed format: 'date-time' as it's not supported by Hermes engine
      maxLength: 50
    },
    amplifyId: {
      type: 'string',
      maxLength: 100
    },
    createdAt: {
      type: 'string',
      // Removed format: 'date-time' as it's not supported by Hermes engine
      maxLength: 50
    },
    updatedAt: {
      type: 'string',
      // Removed format: 'date-time' as it's not supported by Hermes engine
      maxLength: 50
    }
  },
  required: ['id', 'firstName', 'lastName', 'phone', 'isLocalOnly', 'createdAt', 'updatedAt'],
  indexes: [
    'firstName',
    'lastName',
    'email',
    'phone',
    'businessId',
    'isLocalOnly',
    'lastSyncedAt'
  ]
};

// Document type
export type CustomerDocument = RxDocument<CustomerDocType>;

// Extend the base RxCollection methods with our custom methods
export type CustomerCollectionMethods = {
  countAll: (this: RxCollection<CustomerDocType, CustomerCollectionMethods>) => Promise<number>;
  findByEmail: (this: RxCollection<CustomerDocType, CustomerCollectionMethods>, email: string) => Promise<CustomerDocument | null>;
  findByPhone: (this: RxCollection<CustomerDocType, CustomerCollectionMethods>, phone: string) => Promise<CustomerDocument | null>;
  searchByName: (this: RxCollection<CustomerDocType, CustomerCollectionMethods>, searchTerm: string) => Promise<CustomerDocument[]>;
};

export type CustomerCollection = RxCollection<CustomerDocType, CustomerCollectionMethods>;