import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Employee } from '../../../types/employee';
import { Employee as GraphQLEmployee } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';

export class EmployeeSyncService extends BaseSyncService<Employee> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log('[SYNC] Starting employee sync...');
    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      // Get all local employees that need syncing
      const localEmployees = await this.db.employees
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localEmployees.length;
      console.log(`[SYNC] Found ${stats.total} employees to sync`);

      for (const localEmployee of localEmployees) {
        try {
          await this.syncEmployee(localEmployee);
          stats.synced++;
        } catch (error) {
          console.error('[SYNC] Failed to sync employee:', error);
          stats.failed++;
          this.errors.push(`Employee ${localEmployee.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Download new employees from cloud
      await this.downloadEmployees(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
      };
    } catch (error) {
      console.error('[SYNC] Employee sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
      };
    }
  }

  private async syncEmployee(localEmployee: any): Promise<void> {
    const employeeData = localEmployee.toJSON();
    
    // Get current user's ID for cognitoId if employee doesn't have one
    let cognitoUserId = null;
    try {
      const user = await getCurrentUser();
      cognitoUserId = user.userId || user.username;
    } catch (error) {
      console.log('[SYNC] Could not get user ID for employee cognitoId');
    }
    
    const input = {
      id: employeeData.id,
      amplifyId: employeeData.amplifyId || null,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email || null,
      phone: employeeData.phone || null,
      pin: employeeData.pin || null,
      role: employeeData.role || 'employee',
      isActive: employeeData.isActive !== false,
      permissions: employeeData.permissions && Array.isArray(employeeData.permissions) ? employeeData.permissions : null,
      businessId: employeeData.businessId || null,
      address: employeeData.address || null,
      city: employeeData.city || null,
      state: employeeData.state || null,
      zipCode: employeeData.zipCode || null,
      coordinates: employeeData.coordinates ? {
        lat: employeeData.coordinates.lat,
        long: employeeData.coordinates.long
      } : null,
      cognitoId: employeeData.cognitoId || cognitoUserId,  // Use authenticated user's ID if creating employee
    };

    try {
      const createResult = await this.client.graphql({
        query: /* GraphQL */ `
          mutation CreateEmployee($input: CreateEmployeeInput!) {
            createEmployee(input: $input) {
              id
              amplifyId
              firstName
              lastName
              email
              phone
              pin
              role
              isActive
              permissions
              businessId
              address
              city
              state
              zipCode
              coordinates {
                lat
                long
              }
              cognitoId
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateEmployee');
      if (data) {
        await localEmployee.update({ $set: { isLocalOnly: false } });
        console.log('[SYNC] Employee created:', employeeData.id);
      }
    } catch (createError: any) {
      if (createError?.errors?.[0]?.message?.includes('DynamoDB:ConditionalCheckFailedException')) {
        console.log('[SYNC] Employee exists, attempting update:', employeeData.id);
        
        const updateResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation UpdateEmployee($input: UpdateEmployeeInput!) {
              updateEmployee(input: $input) {
                id
                amplifyId
                firstName
                lastName
                email
                phone
                pin
                role
                isActive
                permissions
                businessId
                address
                city
                state
                zipCode
                coordinates {
                  lat
                  long
                }
                cognitoId
                  createdAt
                updatedAt
                _version
              }
            }
          `,
          variables: { input },
        });

        const data = await this.handleGraphQLResult(updateResult, 'UpdateEmployee');
        if (data) {
          await localEmployee.update({ $set: { isLocalOnly: false } });
          console.log('[SYNC] Employee updated:', employeeData.id);
        }
      } else {
        throw createError;
      }
    }
  }

  private async downloadEmployees(stats: SyncStats): Promise<void> {
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListEmployees($limit: Int) {
            listEmployees(limit: $limit) {
              items {
                id
                amplifyId
                firstName
                lastName
                email
                phone
                pin
                role
                isActive
                permissions
                businessId
                address
                city
                state
                zipCode
                coordinates {
                  lat
                  long
                }
                cognitoId
                  createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListEmployees');
      if (!(data as any)?.listEmployees?.items) return;

      const cloudEmployees = (data as any).listEmployees.items.filter(Boolean) as GraphQLEmployee[];
      console.log(`[SYNC] Found ${cloudEmployees.length} employees in cloud`);

      for (const cloudEmployee of cloudEmployees) {
        try {
          const exists = await this.db!.employees.findOne(cloudEmployee.id).exec();
          
          if (!exists) {
            const employeeData = this.cleanGraphQLData(cloudEmployee);
            // Employee downloaded from cloud is not local-only
            employeeData.isLocalOnly = false;
            
            // Permissions should already be an array from GraphQL
            if (employeeData.permissions && !Array.isArray(employeeData.permissions)) {
              employeeData.permissions = null;
            }
            
            await this.db!.employees.insert(employeeData);
            console.log('[SYNC] Downloaded new employee:', cloudEmployee.id);
          }
        } catch (error) {
          console.error('[SYNC] Failed to download employee:', error);
        }
      }
    } catch (error) {
      console.error('[SYNC] Failed to download employees:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}