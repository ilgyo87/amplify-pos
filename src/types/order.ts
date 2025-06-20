import { ProductDocument } from '../database/schemas/product';
import { CustomerDocument } from '../database/schemas/customer';

export type StarchLevel = 'none' | 'light' | 'medium' | 'heavy';

export interface OrderItemOptions {
  starch?: StarchLevel;
  pressOnly?: boolean;
  notes?: string;
}

export interface AddOnItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  businessId?: string;
  imageName?: string;
  discount?: number;
  additionalPrice?: number;
  notes?: string;
  sku?: string;
  cost?: number;
  barcode?: string;
  isActive?: boolean;
  isLocalOnly?: boolean;
  isDeleted?: boolean;
  lastSyncedAt?: string;
  amplifyId?: string;
  createdAt: string;
  updatedAt: string;
  quantity: number;
  options?: OrderItemOptions;
  itemKey: string; // Unique identifier for items with options
  addOns?: AddOnItem[]; // Add-on services attached to this item
}

export interface OrderSummaryData {
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
}

export interface PickupTimeSlot {
  date: string; // ISO date string
  time: string; // Time in HH:MM format
  available: boolean;
}

export type PaymentMethod = 'cash' | 'card' | 'check' | 'account' | 'terminal';

export interface PaymentInfo {
  method: PaymentMethod;
  amount: number;
  tip?: number;
  cardLast4?: string;
  checkNumber?: string;
  accountId?: string;
  stripeToken?: string; // Stripe payment token for card payments
  stripeChargeId?: string; // Stripe charge ID for successful payments
}

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled' | 'picked_up';

export interface Order {
  id: string;
  customerId: string;
  customer: CustomerDocument;
  items: OrderItem[];
  summary: OrderSummaryData;
  pickupDate: string; // ISO date string
  pickupTime: string; // Time in HH:MM format
  payment: PaymentInfo;
  status: OrderStatus;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export const BUSINESS_HOURS = {
  monday: { open: '07:00', close: '19:00' },
  tuesday: { open: '07:00', close: '19:00' },
  wednesday: { open: '07:00', close: '19:00' },
  thursday: { open: '07:00', close: '19:00' },
  friday: { open: '07:00', close: '19:00' },
  saturday: { open: '08:00', close: '17:00' },
  sunday: { closed: true }
};

export const TAX_RATE = 0.0875; // 8.75% default tax rate

export const starchShortCode = (level: StarchLevel): string => {
  switch (level) {
    case 'light': return 'L';
    case 'medium': return 'M';
    case 'heavy': return 'H';
    default: return '';
  }
};

export const formatStarchLevel = (level: StarchLevel): string => {
  switch (level) {
    case 'none': return 'No Starch';
    case 'light': return 'Light Starch';
    case 'medium': return 'Medium Starch';
    case 'heavy': return 'Heavy Starch';
    default: return 'No Starch';
  }
};

export const generateOrderItemKey = (product: ProductDocument, options?: OrderItemOptions): string => {
  const optionsStr = options ? JSON.stringify(options) : '';
  return `${product.id}_${hashString(optionsStr)}`;
};

// Simple hash function for generating consistent item keys
const hashString = (str: string): string => {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};