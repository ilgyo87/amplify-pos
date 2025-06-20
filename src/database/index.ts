export { getDatabaseInstance, closeDatabase } from './config';
export { customerService } from './services/customerService';
export type { CustomerDocType, CustomerDocument } from './schemas/customer';
export { rackService } from './services/rackService';
export type { RackDocType, RackDocument } from './schemas/rack';
export type { RackFormData, RackValidationErrors } from './services/rackService';