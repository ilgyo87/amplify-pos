import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser } from 'aws-amplify/auth';
import { closeDatabase } from '../database/config';

const CURRENT_USER_KEY = '@current_user_id';

/**
 * Check if the current user is different from the last signed-in user
 * and clear data if necessary
 */
export async function checkAndClearUserData(): Promise<boolean> {
  try {
    // Get the current authenticated user
    const user = await getCurrentUser();
    const currentUserId = user.userId || user.username;
    
    if (!currentUserId) {
      console.log('[UserDataManager] No authenticated user found');
      return false;
    }
    
    // Get the last stored user ID
    const lastUserId = await AsyncStorage.getItem(CURRENT_USER_KEY);
    
    // If this is a different user, clear all local data
    if (lastUserId && lastUserId !== currentUserId) {
      console.log('[UserDataManager] Different user detected, clearing local data');
      console.log(`[UserDataManager] Previous user: ${lastUserId}, Current user: ${currentUserId}`);
      
      // Close and remove the database
      await closeDatabase();
      
      // Clear all user-specific AsyncStorage keys
      const keysToRemove = [
        '@initial_sync_complete',
        '@last_sync_notification',
        'printerSettings',
        CURRENT_USER_KEY,
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      // Store the new user ID
      await AsyncStorage.setItem(CURRENT_USER_KEY, currentUserId);
      
      return true; // Data was cleared
    }
    
    // Store the current user ID if not already stored
    if (!lastUserId) {
      await AsyncStorage.setItem(CURRENT_USER_KEY, currentUserId);
    }
    
    return false; // No data was cleared
  } catch (error) {
    console.error('[UserDataManager] Error checking/clearing user data:', error);
    return false;
  }
}

/**
 * Clear the stored user ID (used during sign out)
 */
export async function clearStoredUserId(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  } catch (error) {
    console.error('[UserDataManager] Error clearing stored user ID:', error);
  }
}