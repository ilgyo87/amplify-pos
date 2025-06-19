import { BaseSyncService, SyncResult, SyncStats } from './BaseSyncService';
import { Order } from '../../../types/order';
import { Order as GraphQLOrder, OrderItem as GraphQLOrderItem } from '../../../API';

export class OrderSyncService extends BaseSyncService<Order> {
  async sync(): Promise<SyncResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    console.log('[SYNC] Starting order sync...');
    const stats: SyncStats = { total: 0, synced: 0, failed: 0, skipped: 0 };
    this.errors = [];

    try {
      // Get all local orders that need syncing
      const localOrders = await this.db.orders
        .find({ selector: { isLocalOnly: true } })
        .exec();

      stats.total = localOrders.length;
      console.log(`[SYNC] Found ${stats.total} orders to sync`);

      // Process in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < localOrders.length; i += batchSize) {
        const batch = localOrders.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (order) => {
            try {
              await this.syncOrder(order);
              stats.synced++;
            } catch (error) {
              console.error('[SYNC] Failed to sync order:', error);
              stats.failed++;
              this.errors.push(`Order ${order.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          })
        );
        
        // Small delay between batches
        if (i + batchSize < localOrders.length) {
          await this.sleep(100);
        }
      }

      // Download new orders from cloud
      await this.downloadOrders(stats);

      return {
        success: stats.failed === 0,
        stats,
        errors: this.errors,
      };
    } catch (error) {
      console.error('[SYNC] Order sync failed:', error);
      this.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        stats,
        errors: this.errors,
      };
    }
  }

  private async syncOrder(localOrder: any): Promise<void> {
    const orderData = localOrder.toJSON();
    
    // First, sync all order items
    const syncedItems = await this.syncOrderItems(orderData.items);
    
    // Prepare order input
    const input = {
      id: orderData.id,
      orderNumber: orderData.orderNumber,
      customerId: orderData.customerId || null,
      customerName: orderData.customerName || null,
      customerPhone: orderData.customerPhone || null,
      customerEmail: orderData.customerEmail || null,
      status: orderData.status,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentStatus || 'pending',
      cardLast4: orderData.cardLast4 || null,
      checkNumber: orderData.checkNumber || null,
      accountId: orderData.accountId || null,
      stripePaymentIntentId: orderData.stripePaymentIntentId || null,
      stripeChargeId: orderData.stripeChargeId || null,
      refundAmount: orderData.refundAmount || null,
      refundReason: orderData.refundReason || null,
      notes: orderData.notes || null,
      employeeId: orderData.employeeId || null,
      businessId: orderData.businessId || null,
      employeeName: orderData.employeeName || null,
      paymentInfo: orderData.paymentInfo ? JSON.stringify(orderData.paymentInfo) : null,
      selectedDate: orderData.selectedDate || null,
      statusHistory: orderData.statusHistory ? JSON.stringify(orderData.statusHistory) : null,
      barcodeData: orderData.barcodeData || null,
      rackNumber: orderData.rackNumber || null,
      cancellationReason: orderData.cancellationReason || null,
      refundDate: orderData.refundDate || null,
    };

    try {
      // Try to create first
      const createResult = await this.client.graphql({
        query: /* GraphQL */ `
          mutation CreateOrder($input: CreateOrderInput!) {
            createOrder(input: $input) {
              id
              orderNumber
              customerId
              customerName
              customerPhone
              customerEmail
              status
              subtotal
              tax
              total
              paymentMethod
              paymentStatus
              cardLast4
              checkNumber
              accountId
              stripePaymentIntentId
              stripeChargeId
              refundAmount
              refundReason
              notes
              employeeId
              employeeName
              businessId
              paymentInfo
              selectedDate
              statusHistory
              barcodeData
              rackNumber
              cancellationReason
              refundDate
              createdAt
              updatedAt
            }
          }
        `,
        variables: { input },
      });

      const data = await this.handleGraphQLResult(createResult, 'CreateOrder');
      if (data) {
        await localOrder.update({ $set: { isLocalOnly: false } });
        console.log('[SYNC] Order created:', orderData.id);
      }
    } catch (createError: any) {
      // If creation fails due to existing record, try update
      if (createError?.errors?.[0]?.message?.includes('DynamoDB:ConditionalCheckFailedException')) {
        console.log('[SYNC] Order exists, attempting update:', orderData.id);
        
        const updateResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation UpdateOrder($input: UpdateOrderInput!) {
              updateOrder(input: $input) {
                id
                orderNumber
                customerId
                customerName
                customerPhone
                customerEmail
                status
                subtotal
                tax
                total
                paymentMethod
                paymentStatus
                cardLast4
                checkNumber
                accountId
                stripePaymentIntentId
                stripeChargeId
                refundAmount
                refundReason
                notes
                employeeId
                employeeName
                businessId
                paymentInfo
                selectedDate
                statusHistory
                barcodeData
                rackNumber
                cancellationReason
                refundDate
                createdAt
                updatedAt
                _version
              }
            }
          `,
          variables: { input },
        });

        const data = await this.handleGraphQLResult(updateResult, 'UpdateOrder');
        if (data) {
          await localOrder.update({ $set: { isLocalOnly: false } });
          console.log('[SYNC] Order updated:', orderData.id);
        }
      } else {
        throw createError;
      }
    }
  }

  private async syncOrderItems(items: any[]): Promise<string[]> {
    const syncedItemIds: string[] = [];
    
    for (const item of items) {
      try {
        // Map local OrderItem fields to backend fields
        const input = {
          id: item.id,
          orderId: item.orderId,
          name: item.productName || item.name,  // Backend uses 'name' instead of 'productName'
          description: item.description || null,
          price: item.price,
          discount: item.discount || null,
          category: item.category || null,
          businessId: item.businessId || null,
          customerId: item.customerId || null,
          employeeId: item.employeeId || null,
          orderIdHistory: item.orderIdHistory || null,
          starch: item.starch || null,
          pressOnly: item.pressOnly || false,
          notes: item.notes ? (Array.isArray(item.notes) ? item.notes : [item.notes]) : null,  // Backend expects array of strings
        };

        const createResult = await this.client.graphql({
          query: /* GraphQL */ `
            mutation CreateOrderItem($input: CreateOrderItemInput!) {
              createOrderItem(input: $input) {
                id
                orderId
                name
                price
              }
            }
          `,
          variables: { input },
        });

        const data = await this.handleGraphQLResult(createResult, 'CreateOrderItem');
        if (data) {
          syncedItemIds.push(item.id);
        }
      } catch (error: any) {
        // If already exists, that's ok
        if (error?.errors?.[0]?.message?.includes('DynamoDB:ConditionalCheckFailedException')) {
          syncedItemIds.push(item.id);
        } else {
          console.error('[SYNC] Failed to sync order item:', error);
        }
      }
    }
    
    return syncedItemIds;
  }

  private async downloadOrders(stats: SyncStats): Promise<void> {
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListOrders($limit: Int) {
            listOrders(limit: $limit) {
              items {
                id
                orderNumber
                customerId
                customerName
                customerPhone
                customerEmail
                status
                subtotal
                tax
                total
                paymentMethod
                paymentStatus
                cardLast4
                checkNumber
                accountId
                stripePaymentIntentId
                stripeChargeId
                refundAmount
                refundReason
                notes
                employeeId
                employeeName
                businessId
                paymentInfo
                selectedDate
                statusHistory
                barcodeData
                rackNumber
                cancellationReason
                refundDate
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { limit: 1000 },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListOrders');
      if (!(data as any)?.listOrders?.items) return;

      const cloudOrders = (data as any).listOrders.items.filter(Boolean) as GraphQLOrder[];
      console.log(`[SYNC] Found ${cloudOrders.length} orders in cloud`);

      for (const cloudOrder of cloudOrders) {
        try {
          const exists = await this.db!.orders.findOne(cloudOrder.id).exec();
          
          if (!exists) {
            // Download order items
            const items = await this.downloadOrderItems(cloudOrder.id);
            
            const orderData = this.cleanGraphQLData(cloudOrder);
            orderData.items = items;
            // Order downloaded from cloud is not local-only
            orderData.isLocalOnly = false;
            
            // Parse JSON fields
            if (orderData.paymentInfo && typeof orderData.paymentInfo === 'string') {
              try {
                orderData.paymentInfo = JSON.parse(orderData.paymentInfo);
              } catch {
                orderData.paymentInfo = null;
              }
            }
            
            if (orderData.statusHistory && typeof orderData.statusHistory === 'string') {
              try {
                orderData.statusHistory = JSON.parse(orderData.statusHistory);
              } catch {
                orderData.statusHistory = null;
              }
            }
            
            await this.db!.orders.insert(orderData);
            console.log('[SYNC] Downloaded new order:', cloudOrder.id);
          }
        } catch (error) {
          console.error('[SYNC] Failed to download order:', error);
        }
      }
    } catch (error) {
      console.error('[SYNC] Failed to download orders:', error);
      this.errors.push(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async downloadOrderItems(orderId: string): Promise<any[]> {
    try {
      const listResult = await this.client.graphql({
        query: /* GraphQL */ `
          query ListOrderItemsByOrder($orderId: ID!) {
            listOrderItems(filter: { orderId: { eq: $orderId } }) {
              items {
                id
                orderId
                name
                description
                price
                discount
                category
                businessId
                customerId
                employeeId
                orderIdHistory
                starch
                pressOnly
                notes
                createdAt
                updatedAt
              }
            }
          }
        `,
        variables: { orderId },
      });

      const data = await this.handleGraphQLResult(listResult, 'ListOrderItems');
      if (!(data as any)?.listOrderItems?.items) return [];

      return (data as any).listOrderItems.items
        .filter(Boolean)
        .map((item: GraphQLOrderItem) => {
          const cleaned = this.cleanGraphQLData(item);
          // Map backend 'name' to local 'productName'
          if (cleaned.name) {
            cleaned.productName = cleaned.name;
          }
          // Ensure notes is a string (backend stores as array)
          if (Array.isArray(cleaned.notes) && cleaned.notes.length > 0) {
            cleaned.notes = cleaned.notes[0];
          } else if (Array.isArray(cleaned.notes)) {
            cleaned.notes = null;
          }
          if (cleaned.customizations) {
            try {
              cleaned.customizations = JSON.parse(cleaned.customizations);
            } catch {
              cleaned.customizations = null;
            }
          }
          return cleaned;
        });
    } catch (error) {
      console.error('[SYNC] Failed to download order items:', error);
      return [];
    }
  }
}