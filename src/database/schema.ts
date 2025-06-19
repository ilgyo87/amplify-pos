// Database schema type definitions
import { BusinessCollection } from './schemas/business';
import { CategoryCollection } from './schemas/category';
import { CustomerCollection } from './schemas/customer';
import { EmployeeCollection } from './schemas/employee';
import { OrderCollection } from './schemas/order';
import { ProductCollection } from './schemas/product';

export interface DatabaseCollections {
  businesses: BusinessCollection;
  categories: CategoryCollection;
  customers: CustomerCollection;
  employees: EmployeeCollection;
  orders: OrderCollection;
  products: ProductCollection;
}