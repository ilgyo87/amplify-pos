// Product type definitions
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  businessId?: string;
  imageName?: string;
  sku?: string;
  barcode?: string;
  cost?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  businessId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}