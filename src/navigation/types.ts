import { CustomerDocType } from '../database/schemas/customer';

// Serializable customer data for navigation
export interface SerializableCustomer {
  id: string;
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  email?: string;
  businessId?: string;
  cognitoId?: string;
  notes?: string;
  joinDate?: string;
  isLocalOnly: boolean;
  isDeleted?: boolean;
  lastSyncedAt?: string;
  amplifyId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RootStackParamList = {
  Dashboard: undefined;
  Auth: undefined;
  // Dashboard routes
  Customers: undefined;
  Products: undefined;
  Orders: undefined;
  Employees: undefined;
  Settings: undefined;
  Reports: undefined;
  // Settings screens
  BusinessSettings: undefined;
  PaymentSettings: undefined;
  PrinterSettings: undefined;
  DataSync: undefined;
  // Employee authentication
  EmployeeSignIn: undefined;
  // Checkout flow
  Checkout: {
    customer: SerializableCustomer;
  };
};
