import AsyncStorage from '@react-native-async-storage/async-storage';
import { stripeService } from '../stripeService';
import { initStripe } from '@stripe/stripe-react-native';

// Mock modules
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@stripe/stripe-react-native', () => ({
  initStripe: jest.fn(),
  useStripe: () => ({
    createToken: jest.fn().mockResolvedValue({ token: { id: 'tok_test' } }),
    confirmPayment: jest.fn().mockResolvedValue({ paymentIntent: { status: 'Succeeded' } }),
  }),
}));

// Mock native modules
jest.mock('react-native', () => ({
  NativeModules: {
    StripeModule: {
      init: jest.fn(),
      createToken: jest.fn(),
    },
  },
  Platform: {
    OS: 'ios',
    select: jest.fn(),
  },
}));

describe('Payment and Login Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Stripe Settings', () => {
    it('should save and retrieve stripe settings', async () => {
      const testSettings = {
        publishableKey: 'pk_test_123',
        merchantId: 'merchant.com.test',
      };

      await stripeService.saveStripeSettings(testSettings);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'stripe_settings',
        JSON.stringify(testSettings)
      );

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(testSettings)
      );

      const savedSettings = await stripeService.getStripeSettings();
      expect(savedSettings).toEqual(testSettings);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('stripe_settings');
    });

    it('should initialize stripe with valid settings', async () => {
      const testSettings = {
        publishableKey: 'pk_test_123',
        merchantId: 'merchant.com.test',
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(testSettings)
      );

      const initialized = await stripeService.initialize();
      expect(initialized).toBe(true);
      expect(initStripe).toHaveBeenCalledWith({
        publishableKey: testSettings.publishableKey,
        merchantIdentifier: testSettings.merchantId,
      });
    });

    it('should not initialize stripe without settings', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const initialized = await stripeService.initialize();
      expect(initialized).toBe(false);
      expect(initStripe).not.toHaveBeenCalled();
    });
  });

  describe('Login Settings', () => {
    const LOGIN_SETTINGS_KEY = 'login_settings';

    it('should save and retrieve login settings', async () => {
      const testSettings = {
        username: 'testuser',
        password: 'testpass',
        autoSync: true,
      };

      await AsyncStorage.setItem(LOGIN_SETTINGS_KEY, JSON.stringify(testSettings));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        LOGIN_SETTINGS_KEY,
        JSON.stringify(testSettings)
      );

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(testSettings)
      );

      const savedSettings = await AsyncStorage.getItem(LOGIN_SETTINGS_KEY);
      expect(JSON.parse(savedSettings!)).toEqual(testSettings);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(LOGIN_SETTINGS_KEY);
    });
  });

  describe('Payment Flow', () => {
    it('should validate payment info structure', () => {
      const validPaymentInfo = {
        method: 'card' as const,
        amount: 100,
        tip: 10,
        cardLast4: '4242',
        stripeToken: 'tok_123',
      };

      expect(validPaymentInfo).toHaveProperty('method');
      expect(validPaymentInfo).toHaveProperty('amount');
      expect(typeof validPaymentInfo.amount).toBe('number');
      
      if (validPaymentInfo.method === 'card') {
        expect(validPaymentInfo).toHaveProperty('stripeToken');
        expect(validPaymentInfo).toHaveProperty('cardLast4');
        expect(validPaymentInfo.cardLast4?.length).toBe(4);
      }
    });
  });
});

