// Employee type definitions
export interface Employee {
  id: string;
  name: string;
  username: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  businessId?: string;
  role: 'admin' | 'manager' | 'employee';
  createdAt: string;
  updatedAt: string;
}