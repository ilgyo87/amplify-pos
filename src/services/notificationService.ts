import { CustomerDocument } from '../database/schemas/customer';
import { OrderDocument } from '../database/schemas/order';
import { Alert } from 'react-native';

export interface NotificationService {
  sendOrderCompletedNotification(customer: CustomerDocument, order: OrderDocument): Promise<void>;
}

class DefaultNotificationService implements NotificationService {
  async sendOrderCompletedNotification(customer: CustomerDocument, order: OrderDocument): Promise<void> {
    try {
      console.log('🔔 sendOrderCompletedNotification called for:', {
        customerName: `${customer.firstName} ${customer.lastName}`,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        emailNotifications: customer.emailNotifications,
        textNotifications: customer.textNotifications,
        orderNumber: order.orderNumber
      });

      const promises: Promise<void>[] = [];

      // Send email notification if enabled and email is available
      if (customer.emailNotifications && customer.email) {
        console.log('📧 Email notification enabled, adding to queue');
        promises.push(this.sendEmailNotification(customer, order));
      } else {
        console.log('📧 Email notification skipped:', {
          emailNotifications: customer.emailNotifications,
          hasEmail: !!customer.email
        });
      }

      // Send text notification if enabled and phone is available
      if (customer.textNotifications && customer.phone) {
        console.log('📱 SMS notification enabled, adding to queue');
        promises.push(this.sendTextNotification(customer, order));
      } else {
        console.log('📱 SMS notification skipped:', {
          textNotifications: customer.textNotifications,
          hasPhone: !!customer.phone
        });
      }

      if (promises.length === 0) {
        console.log('⚠️ No notifications to send - customer has no notifications enabled or missing contact info');
        return;
      }

      // Execute all notifications in parallel
      await Promise.all(promises);
      
      console.log(`✅ Notifications sent for order ${order.orderNumber} to customer ${customer.firstName} ${customer.lastName}`);
    } catch (error) {
      console.error('❌ Error sending notifications:', error);
      // Don't throw - we don't want notification failures to break the order completion
    }
  }

  /**
   * Send email notification to customer when order is completed
   * 
   * @param customer The customer to send notification to
   * @param order The completed order details
   */
  private async sendEmailNotification(customer: CustomerDocument, order: OrderDocument): Promise<void> {
    try {
      console.log('📧 Starting email notification process...');
      const emailContent = this.generateEmailContent(customer, order);
      
      if (!customer.email) {
        throw new Error('Customer email is required for email notifications');
      }
      
      console.log('📧 Sending email notification via Lambda to:', customer.email);
      
      // Use direct HTTP request to Lambda function URL
      console.log('📧 Making HTTP request to Lambda function...');
      
      // Get the function URL from amplify_outputs.json
      const amplifyConfig = await import('../../amplify_outputs.json');
      const functionUrl = (amplifyConfig.default.custom as any)?.emailNotificationUrl;
      
      if (!functionUrl) {
        throw new Error('Email notification URL not configured');
      }
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: customer.email,
          subject: emailContent.subject,
          html: emailContent.html, 
          text: emailContent.text,
          customerName: `${customer.firstName} ${customer.lastName}`,
          orderNumber: order.orderNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      console.log(`📧 Email notification sent to ${customer.email} for order ${order.orderNumber}`, result.messageId);
    } catch (error) {
      console.error('Failed to send email notification:', error);
      throw error;
    }
  }

  /**
   * Send text notification to customer when order is completed
   * 
   * @param customer The customer to send notification to
   * @param order The completed order details
   */
  private async sendTextNotification(customer: CustomerDocument, order: OrderDocument): Promise<void> {
    try {
      console.log('📱 Starting SMS notification process...');
      const textContent = this.generateTextContent(customer, order);
      
      if (!customer.phone) {
        throw new Error('Customer phone number is required for text notifications');
      }
      
      // Format phone number to E.164 format for AWS SNS
      const formattedPhone = this.formatPhoneNumberForSNS(customer.phone);
      
      console.log('📱 Sending SMS notification via Lambda to:', formattedPhone);
      
      // Use direct HTTP request to Lambda function URL
      console.log('📱 Making HTTP request to Lambda function...');
      
      // Get the function URL from amplify_outputs.json
      const amplifyConfig = await import('../../amplify_outputs.json');
      const functionUrl = (amplifyConfig.default.custom as any)?.smsNotificationUrl;
      
      if (!functionUrl) {
        throw new Error('SMS notification URL not configured');
      }
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          message: textContent,
          customerName: `${customer.firstName} ${customer.lastName}`,
          orderNumber: order.orderNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      console.log(`📱 Text notification sent to ${customer.phone} for order ${order.orderNumber}`, result.messageId);
    } catch (error) {
      console.error('Failed to send text notification:', error);
      throw error;
    }
  }

  /**
   * Generate email content for order completed notification
   * 
   * @param customer The customer to send notification to
   * @param order The completed order details
   * @returns Email content with subject, text, and HTML versions
   */
  private generateEmailContent(customer: CustomerDocument, order: OrderDocument) {
    const subject = `Your Order #${order.orderNumber} is Ready for Pickup!`;
    
    const text = `Hi ${customer.firstName},

Great news! Your dry cleaning order #${order.orderNumber} is now ready for pickup.

Order Details:
- Order Number: ${order.orderNumber}
- Items: ${order.items.reduce((total, item) => total + item.quantity, 0)} items
- Total: $${order.total.toFixed(2)}
${order.rackNumber ? `- Location: Rack ${order.rackNumber}` : ''}

Please bring this notification when you come to pick up your order.

Thank you for choosing our dry cleaning service!

Best regards,
Your Dry Cleaning Team`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Your Order is Ready for Pickup! ✅</h2>
        
        <p>Hi ${customer.firstName},</p>
        
        <p>Great news! Your dry cleaning order <strong>#${order.orderNumber}</strong> is now ready for pickup.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
          <h3 style="margin: 0 0 10px 0; color: #065f46;">Order Details</h3>
          <p style="margin: 5px 0;"><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Items:</strong> ${order.items.reduce((total, item) => total + item.quantity, 0)} items</p>
          <p style="margin: 5px 0;"><strong>Total:</strong> $${order.total.toFixed(2)}</p>
          ${order.rackNumber ? `<p style="margin: 5px 0;"><strong>Location:</strong> Rack ${order.rackNumber}</p>` : ''}
        </div>
        
        <p>Please bring this notification when you come to pick up your order.</p>
        
        <p>Thank you for choosing our dry cleaning service!</p>
        
        <p style="color: #666;">
          Best regards,<br>
          Your Dry Cleaning Team
        </p>
      </div>
    `;

    return { subject, text, html };
  }

  private generateTextContent(customer: CustomerDocument, order: OrderDocument): string {
    return `Hi ${customer.firstName}! Your dry cleaning order #${order.orderNumber} is ready for pickup. ${order.items.reduce((total, item) => total + item.quantity, 0)} items, Total: $${order.total.toFixed(2)}${order.rackNumber ? `, Rack ${order.rackNumber}` : ''}. Please bring this text when picking up. Thank you!`;
  }
  
  /**
   * Format phone number to E.164 format for AWS SNS
   * E.164 format: +[country code][subscriber number]
   * For US: +1xxxxxxxxxx
   * 
   * @param phoneNumber The phone number to format
   * @returns Phone number in E.164 format
   */
  private formatPhoneNumberForSNS(phoneNumber: string): string {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Check if the number already has the country code
    if (digitsOnly.length === 10) {
      // US number without country code, add +1
      return `+1${digitsOnly}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // US number with country code but without +
      return `+${digitsOnly}`;
    } else if (digitsOnly.length > 11) {
      // Assume it's already properly formatted but missing the +
      return `+${digitsOnly}`;
    }
    
    // Return the original if we can't parse it
    // In production, you would want more robust validation and error handling
    return `+1${digitsOnly}`; // Default to US format
  }
}

// Export singleton instance
export const notificationService: NotificationService = new DefaultNotificationService();