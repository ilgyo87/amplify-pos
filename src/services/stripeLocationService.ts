import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_ID_KEY = 'stripe_terminal_location_id';

class StripeLocationService {
  private locationId: string | null = null;

  async getLocationId(): Promise<string | null> {
    if (this.locationId) {
      return this.locationId;
    }

    try {
      const stored = await AsyncStorage.getItem(LOCATION_ID_KEY);
      if (stored) {
        this.locationId = stored;
        return stored;
      }
    } catch (error) {
      console.error('Error reading location ID:', error);
    }

    return null;
  }

  async setLocationId(locationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(LOCATION_ID_KEY, locationId);
      this.locationId = locationId;
      console.log('Saved location ID:', locationId);
    } catch (error) {
      console.error('Error saving location ID:', error);
    }
  }

  async clearLocationId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(LOCATION_ID_KEY);
      this.locationId = null;
    } catch (error) {
      console.error('Error clearing location ID:', error);
    }
  }
}

export const stripeLocationService = new StripeLocationService();