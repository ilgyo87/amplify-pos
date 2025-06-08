export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface CustomerFormData {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface SearchFilters {
  query: string;
  sortBy: 'firstName' | 'lastName' | 'email' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}