// Shared conflict types for all sync services

export interface BaseConflict<TLocal, TCloud> {
  localItem: TLocal;
  cloudItem: TCloud;
  type: 'duplicate' | 'version';
  resolution?: 'keep-local' | 'keep-cloud';
}

export interface AllConflicts {
  customers: BaseConflict<any, any>[];
  orders: BaseConflict<any, any>[];
  employees: BaseConflict<any, any>[];
  businesses: BaseConflict<any, any>[];
  categories: BaseConflict<any, any>[];
  products: BaseConflict<any, any>[];
}

// Helper to check if versions conflict
export function hasVersionConflict(localVersion: number | undefined, cloudVersion: number | undefined): boolean {
  const localVer = localVersion || 1;
  const cloudVer = cloudVersion || 1;
  
  // Conflict only if both have been modified (version > 1) and versions differ
  return localVer > 1 && cloudVer > 1 && localVer !== cloudVer;
}

// Helper to determine if cloud version is newer
export function isCloudVersionNewer(localVersion: number | undefined, cloudVersion: number | undefined): boolean {
  return (cloudVersion || 1) > (localVersion || 1);
}