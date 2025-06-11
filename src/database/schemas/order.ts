import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface OrderDocType {
  id: string;
  orderNumber: string; // Human-readable order number
  customerId: string;
  customerName: string; // Denormalized for easy display
  customerPhone?: string; // Denormalized for easy display
  businessId?: string; // Business ID for multi-tenant support
  employeeId?: string; // ID of the employee who created the order
  employeeName?: string; // Denormalized employee name for easy display
  items: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    categoryId?: string; // Add categoryId for sync purposes
    discount?: number; // Add discount for sync purposes
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
  paymentInfo?: {
    method: 'cash' | 'card' | 'check' | 'account';
    amount: number;
    tip?: number;
    cardLast4?: string;
    checkNumber?: string;
    accountId?: string;
    stripeToken?: string;
    stripeChargeId?: string;
  };
  selectedDate?: string; // Optional pickup/service date
  status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled' | 'picked_up';
  notes?: string;
  barcodeData?: string; // Barcode data for scanning
  rackNumber?: string; // Rack number where order is stored
  statusHistory?: string[]; // Array of status changes with timestamps
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean;
  lastSyncedAt?: string;
  amplifyId?: string;
  createdAt: string;
  updatedAt: string;
}

export const orderSchema: RxJsonSchema<OrderDocType> = {
  version: 0,
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
    businessId: {
      type: 'string',
      maxLength: 100
    },
    employeeId: {
      type: 'string',
      maxLength: 100
    },
    employeeName: {
      type: 'string',
      maxLength: 200
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
          categoryId: { type: 'string', maxLength: 100 },
          discount: { type: 'number', minimum: 0, maximum: 100 },
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
    paymentInfo: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['cash', 'card', 'check', 'account'],
          maxLength: 10
        },
        amount: {
          type: 'number',
          minimum: 0,
          maximum: 999999.99
        },
        tip: {
          type: 'number',
          minimum: 0,
          maximum: 999999.99
        },
        cardLast4: {
          type: 'string',
          maxLength: 4
        },
        checkNumber: {
          type: 'string',
          maxLength: 50
        },
        accountId: {
          type: 'string',
          maxLength: 100
        },
        stripeToken: {
          type: 'string',
          maxLength: 200
        },
        stripeChargeId: {
          type: 'string',
          maxLength: 200
        }
      },
      required: ['method', 'amount']
    },
    selectedDate: {
      type: 'string',
      maxLength: 50
    },
    status: {
      type: 'string',
      enum: ['pending', 'in_progress', 'ready', 'completed', 'cancelled', 'picked_up'],
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
    statusHistory: {
      type: 'array',
      items: {
        type: 'string',
        maxLength: 200
      }
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
    'businessId',
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