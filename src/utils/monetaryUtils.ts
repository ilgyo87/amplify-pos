/**
 * Utility functions for handling monetary calculations with proper precision
 */

/**
 * Converts a floating-point number to a precise monetary amount.
 * Uses cent-based calculation to avoid floating-point precision issues.
 * 
 * @param num - The number to convert
 * @returns A number that is precisely rounded to 2 decimal places
 */
export const toPreciseAmount = (num: number): number => {
  // Convert to cents (integer), then back to dollars
  const cents = Math.round(num * 100);
  return cents / 100;
};

/**
 * Calculates the total price for an order item with proper precision handling
 * 
 * @param basePrice - Base price of the item
 * @param additionalPrice - Any additional charges
 * @param discount - Discount percentage (0-100)
 * @param quantity - Quantity of items
 * @returns Precisely calculated total price
 */
export const calculateItemTotal = (
  basePrice: number,
  additionalPrice: number = 0,
  discount: number = 0,
  quantity: number = 1
): number => {
  const itemPrice = basePrice + additionalPrice;
  const discountedPrice = discount > 0 
    ? itemPrice * (1 - discount / 100)
    : itemPrice;
  return toPreciseAmount(discountedPrice * quantity);
};

/**
 * Calculates order totals with proper precision handling
 * 
 * @param items - Array of order items
 * @param taxRate - Tax rate as decimal (e.g., 0.0875 for 8.75%)
 * @returns Object with subtotal, tax, and total
 */
export const calculateOrderTotals = (
  items: Array<{
    price: number;
    additionalPrice?: number;
    discount?: number;
    quantity: number;
  }>,
  taxRate: number = 0.0875
) => {
  const rawSubtotal = items.reduce((sum, item) => {
    const basePrice = Number(item.price) || 0;
    const additionalPrice = Number(item.additionalPrice) || 0;
    const itemPrice = basePrice + additionalPrice;
    const discount = Number(item.discount) || 0;
    const quantity = Number(item.quantity) || 0;
    
    const discountedPrice = discount > 0 
      ? itemPrice * (1 - discount / 100)
      : itemPrice;
    return sum + (discountedPrice * quantity);
  }, 0);

  const subtotal = toPreciseAmount(rawSubtotal);
  const tax = toPreciseAmount(subtotal * taxRate);
  const total = toPreciseAmount(subtotal + tax);

  return { subtotal, tax, total };
};