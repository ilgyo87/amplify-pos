import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Customer } from '../../../types/customer';
import { Customer as GraphQLCustomer } from '../../../API';
import { getCurrentUser } from 'aws-amplify/auth';

export class CustomerSyncService extends BaseSyncService<Customer> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log('[SYNC] Starting customer sync...');
    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      // Get all local customers that need syncing
      const localCustomers = await this.db.customers
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localCustomers.length;
      console.log(`[SYNC] Found ${stats.total} customers to sync`);

      for (const localCustomer of localCustomers) {
        try {
          await this.syncCustomer(localCustomer);
          stats.synced++;
        } catch (error) {
          console.error('[SYNC] Failed to sync customer:', error);
          stats.failed++;
          this.errors.push(`Customer ${localCustomer.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Download new customers from cloud
      await this.downloadCustomers(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
      };
    } catch (error) {
      console.error('[SYNC] Customer sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
      };
    }
  }

  private async syncCustomer(localCustomer: any): Promise<void> {
    const customerData = localCustomer.toJSON();
    
    // Get current user's ID for cognitoId if customer doesn't have one
    let cognitoUserId = null;
    try {
      const user = await getCurrentUser();
      cognitoUserId = user.userId || user.username;
    } catch (error) {
      console.log('[SYNC] Could not get user ID for customer cognitoId');
    }
    
    // Map local fields to backend fields - include ALL fields!
    const input = {
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
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateCustomer');
      if (data) {
        await localCustomer.update({ $set: { isLocalOnly: false } });
        console.log('[SYNC] Customer created:', customerData.id);
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      if (createError?.errors?.[0]?.message?.includes('DynamoDB:ConditionalCheckFailedException')) {
        console.log('[SYNC] Customer exists, attempting update:', customerData.id);
        
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
                createdAt
                updatedAt
                _version
              }
            }
          `,
          variables: { input },
        });

        const data = await this.handleGraphQLResult(updateResult, 'UpdateCustomer');
        if (data) {
          await localCustomer.update({ $set: { isLocalOnly: false } });
          console.log('[SYNC] Customer updated:', customerData.id);
        }
      } else {
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
      console.log(`[SYNC] Found ${cloudCustomers.length} customers in cloud`);

      for (const cloudCustomer of cloudCustomers) {
        try {
          const exists = await this.db!.customers.findOne(cloudCustomer.id).exec();
          
          if (!exists) {
            const customerData = this.cleanGraphQLData(cloudCustomer);
            // Customer downloaded from cloud is not local-only
            customerData.isLocalOnly = false;
            
            // Map backend fields to local fields - backend has firstName/lastName
            if (!customerData.firstName) {
              customerData.firstName = '';
            }
            if (!customerData.lastName) {
              customerData.lastName = '';
            }
            
            await this.db!.customers.insert(customerData);
            console.log('[SYNC] Downloaded new customer:', cloudCustomer.id);
          }
        } catch (error) {
          console.error('[SYNC] Failed to download customer:', error);
        }
      }
    } catch (error) {
      console.error('[SYNC] Failed to download customers:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}