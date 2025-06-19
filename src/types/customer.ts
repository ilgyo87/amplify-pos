// Customer type definitions
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessId?: string;
  createdAt: string;
  updatedAt: string;
}