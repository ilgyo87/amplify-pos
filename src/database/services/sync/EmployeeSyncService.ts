import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Employee } from '../../../types/employee';
import { Employee as GraphQLEmployee } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';
import { SyncNotificationBuilder } from './SyncNotification';

export class EmployeeSyncService extends BaseSyncService<Employee> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];
    this.notificationBuilder = new SyncNotificationBuilder();

    try {
      // Get both new/updated employees and deleted employees that need syncing
      const [localEmployees, deletedEmployees] = await Promise.all([
        this.db.employees
          .find({ 
            selector: { 
              isLocalOnly: true,
              $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } }
              ]
            } 
          })
          .exec(),
        this.db.employees
          .find({ 
            selector: { 
              isDeleted: true,
              amplifyId: { $ne: null }
            } 
          })
          .exec()
      ]);

      const allEmployeesToSync = [...localEmployees, ...deletedEmployees];
      stats.total = allEmployeesToSync.length;
      
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} employees to sync (${deletedEmployees.length} deletions)`);
      }

      for (const localEmployee of allEmployeesToSync) {
        try {
          await this.syncEmployee(localEmployee);
          stats.synced++;
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
          console.error('[SYNC] Failed to sync employee:', localEmployee.id, errorMessage);
          stats.failed++;
          this.errors.push(`Employee ${localEmployee.id}: ${errorMessage}`);
        }
      }

      // Download new employees from cloud
      await this.downloadEmployees(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    } catch (error) {
      console.error('[SYNC] Employee sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      this.notificationBuilder.addError(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    }
  }

  private async syncEmployee(localEmployee: any): Promise<void> {
    const employeeData = localEmployee.toJSON();
    
    // Check if this is a deletion
    if (employeeData.isDeleted && employeeData.amplifyId) {
      try {
        const deleteResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation DeleteEmployee($input: DeleteEmployeeInput!) {
              deleteEmployee(input: $input) {
                id
              }
            }
          `,
          variables: { 
            input: { 
              id: employeeData.amplifyId || employeeData.id 
            } 
          },
        });

        const data = await this.handleGraphQLResult(deleteResult, 'DeleteEmployee');
        if (data) {
          // Remove the employee from local database after successful deletion
          await localEmployee.remove();
          console.log('[SYNC] Employee deleted from cloud and removed locally:', employeeData.firstName || employeeData.id);
          this.notificationBuilder.addOperation(
            'employees',
            'employees',
            'deleted',
            'to-cloud',
            1,
            [`${employeeData.firstName} ${employeeData.lastName}`.trim() || employeeData.id]
          );
        }
        return;
      } catch (error: any) {
        console.error('[SYNC] Failed to delete employee from cloud:', employeeData.id, error);
        throw error;
      }
    }
    
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
      version: employeeData.version || 1,
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
              version
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateEmployee');
      if (data) {
        await localEmployee.update({ $set: { 
          isLocalOnly: false,
          amplifyId: employeeData.id // Store the ID used in Amplify
        } });
        console.log('[SYNC] Employee uploaded:', `${employeeData.firstName} ${employeeData.lastName}` || employeeData.id);
        this.notificationBuilder.addOperation(
          'employees',
          'employees',
          'added',
          'to-cloud',
          1,
          [`${employeeData.firstName} ${employeeData.lastName}`.trim()]
        );
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      const errorType = createError?.errors?.[0]?.errorType;
      const errorMessage = createError?.errors?.[0]?.message;
      
      if (errorType === 'DynamoDB:ConditionalCheckFailedException' || 
          errorMessage?.includes('conditional request failed')) {
        
        // Employee exists, just update it
        // Remove any fields that might cause issues
        delete input._version;
        delete input._lastChangedAt;
        delete input._deleted;
        
        try {
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
                  version
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateEmployee');
          if (data) {
            await localEmployee.update({ $set: { 
              isLocalOnly: false,
              amplifyId: employeeData.id // Store the ID used in Amplify
            } });
            console.log('[SYNC] Employee updated:', employeeData.id, `(${employeeData.firstName} ${employeeData.lastName})`);
            this.notificationBuilder.addOperation(
              'employees',
              'employees',
              'updated',
              'to-cloud',
              1,
              [`${employeeData.firstName} ${employeeData.lastName}`.trim()]
            );
          }
        } catch (updateError: any) {
          // If update also fails, log the specific error
          const updateErrorMessage = updateError?.errors?.[0]?.message || updateError?.message || 'Unknown update error';
          console.error('[SYNC] Employee update failed:', employeeData.id, updateErrorMessage);
          throw updateError;
        }
      } else {
        console.error('[SYNC] Employee sync failed:', employeeData.id, errorMessage || 'Unknown error');
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
                version
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
      let downloadedCount = 0;

      for (const cloudEmployee of cloudEmployees) {
        try {
          const exists = await this.db!.employees.findOne(cloudEmployee.id).exec();
          
          if (!exists) {
            const employeeData = this.cleanGraphQLData(cloudEmployee);
            // Employee downloaded from cloud is not local-only
            employeeData.isLocalOnly = false;
            employeeData.amplifyId = cloudEmployee.id; // Store the Amplify ID
            
            // Permissions should already be an array from GraphQL
            if (employeeData.permissions && !Array.isArray(employeeData.permissions)) {
              employeeData.permissions = null;
            }
            
            await this.db!.employees.insert(employeeData);
            this.notificationBuilder.addOperation(
              'employees',
              'employees',
              'added',
              'from-cloud',
              1,
              [`${employeeData.firstName} ${employeeData.lastName}`.trim()]
            );
            downloadedCount++;
          }
        } catch (error) {
          console.error('[SYNC] Failed to download employee:', error);
        }
      }
      
      if (downloadedCount > 0) {
        console.log(`[SYNC] Downloaded ${downloadedCount} new employees from cloud`);
      }
    } catch (error) {
      console.error('[SYNC] Failed to download employees:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}