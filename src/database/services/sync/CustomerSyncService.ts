import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Customer } from '../../../types/customer';
import { Customer as GraphQLCustomer } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';
import { SyncNotificationBuilder } from './SyncNotification';

export class CustomerSyncService extends BaseSyncService<Customer> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];
    this.notificationBuilder = new SyncNotificationBuilder();

    try {
      // Get both new/updated customers and deleted customers that need syncing
      const [localCustomers, deletedCustomers] = await Promise.all([
        this.db.customers
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
        this.db.customers
          .find({ 
            selector: { 
              isDeleted: true,
              amplifyId: { $ne: null }
            } 
          })
          .exec()
      ]);

      const allCustomersToSync = [...localCustomers, ...deletedCustomers];
      stats.total = allCustomersToSync.length;
      
      // Only log if there are items to sync
      if (stats.total > 0) {
        console.log(`[SYNC] Found ${stats.total} customers to sync (${deletedCustomers.length} deletions)`);
      }

      for (const localCustomer of allCustomersToSync) {
        try {
          await this.syncCustomer(localCustomer);
          stats.synced++;
        } catch (error: any) {
          const errorMessage = error?.errors?.[0]?.message || error?.message || 'Unknown error';
          console.error('[SYNC] Failed to sync customer:', localCustomer.id, errorMessage);
          stats.failed++;
          this.errors.push(`Customer ${localCustomer.id}: ${errorMessage}`);
        }
      }

      // Download new customers from cloud
      await this.downloadCustomers(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
        notificationBuilder: this.notificationBuilder,
      };
    } catch (error) {
      console.error('[SYNC] Customer sync failed:', error);
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

  private async syncCustomer(localCustomer: any): Promise<void> {
    const customerData = localCustomer.toJSON();
    
    // Check if this is a deletion
    if (customerData.isDeleted && customerData.amplifyId) {
      try {
        const deleteResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation DeleteCustomer($input: DeleteCustomerInput!) {
              deleteCustomer(input: $input) {
                id
              }
            }
          `,
          variables: { 
            input: { 
              id: customerData.amplifyId || customerData.id 
            } 
          },
        });

        const data = await this.handleGraphQLResult(deleteResult, 'DeleteCustomer');
        if (data) {
          // Remove the customer from local database after successful deletion
          await localCustomer.remove();
          console.log('[SYNC] Customer deleted from cloud and removed locally:', customerData.firstName || customerData.id);
          this.notificationBuilder.addOperation(
            'customers',
            'customers',
            'deleted',
            'to-cloud',
            1,
            [`${customerData.firstName} ${customerData.lastName}`.trim() || customerData.id]
          );
        }
        return;
      } catch (error: any) {
        console.error('[SYNC] Failed to delete customer from cloud:', customerData.id, error);
        throw error;
      }
    }
    
    // Get current user's ID for cognitoId if customer doesn't have one
    let cognitoUserId = null;
    try {
      const user = await getCurrentUser();
      cognitoUserId = user.userId || user.username;
    } catch (error) {
      console.log('[SYNC] Could not get user ID for customer cognitoId');
    }
    
    // Map local fields to backend fields - include ALL fields!
    const input: any = {
      id: customerData.id,
      firstName: customerData.firstName || '',  // Required field
      lastName: customerData.lastName || '',    // Required field
      address: customerData.address || null,
      city: customerData.city || null,
      state: customerData.state || null,
      zipCode: customerData.zipCode || null,
      phone: customerData.phone || '',  // Required field
      coordinates: customerData.coordinates || null,
      email: customerData.email || null,
      businessId: customerData.businessId || null,
      cognitoId: customerData.cognitoId || cognitoUserId,  // Use authenticated user's ID if creating customer
      emailNotifications: customerData.emailNotifications || false,
      textNotifications: customerData.textNotifications || false,
      totalRefunds: customerData.totalRefunds || null,
      notes: customerData.notes || null,
      joinDate: customerData.joinDate || null,
      version: customerData.version || 1,
    };

    try {
      // Try to create first
      const createResult = await this.client.graphql({
        query: /* GraphQL */ `
          mutation CreateCustomer($input: CreateCustomerInput!) {
            createCustomer(input: $input) {
              id
              firstName
              lastName
              address
              city
              state
              zipCode
              phone
              coordinates {
                lat
                long
              }
              email
              businessId
              cognitoId
              emailNotifications
              textNotifications
              totalRefunds
              notes
              joinDate
              version
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateCustomer');
      if (data) {
        await localCustomer.update({ $set: { 
          isLocalOnly: false,
          amplifyId: customerData.id // Store the ID used in Amplify
        } });
        console.log('[SYNC] Customer uploaded:', customerData.id, `(${customerData.firstName} ${customerData.lastName})`);
        this.notificationBuilder.addOperation(
          'customers',
          'customers',
          'added',
          'to-cloud',
          1,
          [`${customerData.firstName} ${customerData.lastName}`.trim()]
        );
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      const errorType = createError?.errors?.[0]?.errorType;
      const errorMessage = createError?.errors?.[0]?.message;
      
      if (errorType === 'DynamoDB:ConditionalCheckFailedException' || 
          errorMessage?.includes('conditional request failed')) {
        
        // Customer exists, just update it
        // Remove any fields that might cause issues
        delete input._version;
        delete input._lastChangedAt;
        delete input._deleted;
        
        try {
          const updateResult = await this.client.graphql({
            query: /* GraphQL */ `
              mutation UpdateCustomer($input: UpdateCustomerInput!) {
                updateCustomer(input: $input) {
                  id
                  firstName
                  lastName
                  address
                  city
                  state
                  zipCode
                  phone
                  coordinates {
                    lat
                    long
                  }
                  email
                  businessId
                  cognitoId
                  emailNotifications
                  textNotifications
                  totalRefunds
                  notes
                  joinDate
                  version
                  createdAt
                  updatedAt
                }
              }
            `,
            variables: { input },
          });

          const data = await this.handleGraphQLResult(updateResult, 'UpdateCustomer');
          if (data) {
            await localCustomer.update({ $set: { 
              isLocalOnly: false,
              amplifyId: customerData.id // Store the ID used in Amplify
            } });
            console.log('[SYNC] Customer updated:', customerData.id, `(${customerData.firstName} ${customerData.lastName})`);
            this.notificationBuilder.addOperation(
              'customers',
              'customers',
              'updated',
              'to-cloud',
              1,
              [`${customerData.firstName} ${customerData.lastName}`.trim()]
            );
          }
        } catch (updateError: any) {
          // If update also fails, log the specific error
          const updateErrorMessage = updateError?.errors?.[0]?.message || updateError?.message || 'Unknown update error';
          console.error('[SYNC] Customer update failed:', customerData.id, updateErrorMessage);
          throw updateError;
        }
      } else {
        console.error('[SYNC] Customer sync failed:', customerData.id, errorMessage || 'Unknown error');
        throw createError;
      }
    }
  }

  private async downloadCustomers(stats: SyncStats): Promise<void> {
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListCustomers($limit: Int) {
            listCustomers(limit: $limit) {
              items {
                id
                firstName
                lastName
                address
                city
                state
                zipCode
                phone
                coordinates {
                  lat
                  long
                }
                email
                businessId
                cognitoId
                emailNotifications
                textNotifications
                totalRefunds
                notes
                joinDate
                version
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListCustomers');
      if (!(data as any)?.listCustomers?.items) return;

      const cloudCustomers = (data as any).listCustomers.items.filter(Boolean) as GraphQLCustomer[];
      
      let downloadedCount = 0;
      for (const cloudCustomer of cloudCustomers) {
        try {
          const exists = await this.db!.customers.findOne(cloudCustomer.id).exec();
          
          if (!exists) {
            const customerData = this.cleanGraphQLData(cloudCustomer);
            // Customer downloaded from cloud is not local-only
            customerData.isLocalOnly = false;
            customerData.amplifyId = cloudCustomer.id; // Store the Amplify ID
            
            // Map backend fields to local fields - backend has firstName/lastName
            if (!customerData.firstName) {
              customerData.firstName = '';
            }
            if (!customerData.lastName) {
              customerData.lastName = '';
            }
            
            await this.db!.customers.insert(customerData);
            this.notificationBuilder.addOperation(
              'customers',
              'customers',
              'added',
              'from-cloud',
              1,
              [`${customerData.firstName} ${customerData.lastName}`.trim()]
            );
            downloadedCount++;
          }
        } catch (error) {
          console.error('[SYNC] Failed to download customer:', error);
        }
      }
      
      if (downloadedCount > 0) {
        console.log(`[SYNC] Downloaded ${downloadedCount} new customers from cloud`);
      }
    } catch (error) {
      console.error('[SYNC] Failed to download customers:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}