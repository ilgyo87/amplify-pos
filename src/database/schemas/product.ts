import { RxJsonSchema, RxDocument, RxCollection } from 'rxdb';

export interface ProductDocType {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  businessId?: string;
  imageName?: string;
  discount?: number; // Percentage discount (0-100)
  additionalPrice?: number; // Additional price on top of base price
  notes?: string;
  // Additional fields from sync service
  sku?: string | null;
  cost?: number | null;
  barcode?: string | null;
  quantity?: number | null;
  isActive?: boolean;
  // Fields from backend
  imageUrl?: string | null;
  image?: string | null;
  trackInventory?: boolean;
  inventoryCount?: number;
  lowStockThreshold?: number;
  variants?: any;
  customizations?: any;
  displayOrder?: number;
  // Local-only fields for sync management
  isLocalOnly: boolean;
  isDeleted?: boolean; // For soft deletes
  lastSyncedAt?: string;
  amplifyId?: string; // Store the Amplify ID when synced
  createdAt: string;
  updatedAt: string;
}

export const productSchema: RxJsonSchema<ProductDocType> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string',
      maxLength: 100
    },
    description: {
      type: 'string',
      maxLength: 500
    },
    price: {
      type: 'number',
      minimum: 0,
      maximum: 999999.99,
      multipleOf: 0.01
    },
    categoryId: {
      type: 'string',
      maxLength: 100
    },
    businessId: {
      type: 'string',
      maxLength: 100
    },
    imageName: {
      type: 'string',
      maxLength: 100
    },
    discount: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      multipleOf: 0.01
    },
    additionalPrice: {
      type: 'number',
      minimum: 0,
      maximum: 999999.99,
      multipleOf: 0.01
    },
    notes: {
      type: 'string',
      maxLength: 1000
    },
    sku: {
      type: ['string', 'null'],
      maxLength: 100
    },
    cost: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 999999.99,
      multipleOf: 0.01
    },
    barcode: {
      type: ['string', 'null'],
      maxLength: 100
    },
    quantity: {
      type: ['number', 'null'],
      minimum: 0,
      maximum: 999999,
      multipleOf: 1
    },
    isActive: {
      type: 'boolean',
      default: true
    },
    imageUrl: {
      type: ['string', 'null'],
      maxLength: 500
    },
    image: {
      type: ['string', 'null'],
      maxLength: 500
    },
    trackInventory: {
      type: 'boolean',
      default: false
    },
    inventoryCount: {
      type: 'number',
      minimum: 0,
      maximum: 999999,
      default: 0
    },
    lowStockThreshold: {
      type: 'number',
      minimum: 0,
      maximum: 999999,
      default: 0
    },
    variants: {
      type: ['string', 'null'],
      maxLength: 5000
    },
    customizations: {
      type: ['string', 'null'],
      maxLength: 5000
    },
    displayOrder: {
      type: 'number',
      minimum: 0,
      maximum: 999999,
      default: 0
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
  required: ['id', 'name', 'price', 'categoryId', 'isLocalOnly', 'createdAt', 'updatedAt'],
  indexes: [
    'name',
    'categoryId',
    'businessId',
    'price',
    'isLocalOnly',
    'lastSyncedAt'
  ]
};

// Document type
export type ProductDocument = RxDocument<ProductDocType>;

// Collection type
export type ProductCollection = RxCollection<ProductDocType>;