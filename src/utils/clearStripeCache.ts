import { stripeService } from '../services/stripe';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function clearStripeCache() {
  try {
    // Clear all Stripe-related storage
    await AsyncStorage.removeItem('stripe_settings');
    await AsyncStorage.removeItem('stripe_location_id');
    
    // Force reinitialization
    await stripeService.clearStripeSettings();
    
    console.log('Stripe cache cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear Stripe cache:', error);
    return false;
  }
}