import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface OrderDocType {
  id: string;
  orderNumber: string; // Human-readable order number
  customerId: string;
  customerName: string; // Denormalized for easy display
  customerPhone?: string; // Denormalized for easy display
  items: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    options?: {
      starch?: 'none' | 'light' | 'medium' | 'heavy';
      pressOnly?: boolean;
      notes?: string;
    };
    itemKey: string;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'credit';
  selectedDate?: string; // Optional pickup/service date
  status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
  notes?: string;
  barcodeData?: string; // Barcode data for scanning
  rackNumber?: string; // Rack number where order is stored
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean;
  lastSyncedAt?: string;
  amplifyId?: string;
  createdAt: string;
  updatedAt: string;
}

export const orderSchema: RxJsonSchema<OrderDocType> = {
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    orderNumber: {
      type: 'string',
      maxLength: 50
    },
    customerId: {
      type: 'string',
      maxLength: 100
    },
    customerName: {
      type: 'string',
      maxLength: 200
    },
    customerPhone: {
      type: 'string',
      maxLength: 50
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', maxLength: 100 },
          name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          price: { type: 'number', minimum: 0, maximum: 999999.99 },
          quantity: { type: 'number', minimum: 1, maximum: 999999, multipleOf: 1 },
          options: {
            type: 'object',
            properties: {
              starch: { type: 'string', enum: ['none', 'light', 'medium', 'heavy'], maxLength: 10 },
              pressOnly: { type: 'boolean' },
              notes: { type: 'string', maxLength: 500 }
            }
          },
          itemKey: { type: 'string', maxLength: 100 }
        },
        required: ['id', 'name', 'price', 'quantity', 'itemKey']
      }
    },
    subtotal: {
      type: 'number',
      minimum: 0,
      maximum: 999999.99
    },
    tax: {
      type: 'number',
      minimum: 0,
      maximum: 999999.99
    },
    total: {
      type: 'number',
      minimum: 0,
      maximum: 999999.99
    },
    paymentMethod: {
      type: 'string',
      enum: ['cash', 'card', 'credit'],
      maxLength: 10
    },
    selectedDate: {
      type: 'string',
      maxLength: 50
    },
    status: {
      type: 'string',
      enum: ['pending', 'in_progress', 'ready', 'completed', 'cancelled'],
      maxLength: 20,
      default: 'pending'
    },
    notes: {
      type: 'string',
      maxLength: 1000
    },
    barcodeData: {
      type: 'string',
      maxLength: 200
    },
    rackNumber: {
      type: 'string',
      maxLength: 50
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
      maxLength: 50
    },
    amplifyId: {
      type: 'string',
      maxLength: 100
    },
    createdAt: {
      type: 'string',
      maxLength: 50
    },
    updatedAt: {
      type: 'string',
      maxLength: 50
    }
  },
  required: ['id', 'orderNumber', 'customerId', 'customerName', 'items', 'subtotal', 'tax', 'total', 'paymentMethod', 'status', 'isLocalOnly', 'createdAt', 'updatedAt'],
  indexes: [
    'orderNumber',
    'customerId',
    'status',
    'createdAt',
    'isLocalOnly',
    'lastSyncedAt'
  ]
};

// Document type
export type OrderDocument = RxDocument<OrderDocType>;

// Collection type
export type OrderCollection = RxCollection<OrderDocType>;