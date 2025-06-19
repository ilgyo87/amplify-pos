// Business type definitions
export interface Business {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone: string;
  email?: string;
  taxId?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}