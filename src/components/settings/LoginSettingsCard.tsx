import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGIN_SETTINGS_KEY = 'login_settings';

interface LoginSettings {
  username: string;
  password: string;
  autoSync: boolean;
}

export function LoginSettingsCard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadLoginSettings();
  }, []);

  const loadLoginSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem(LOGIN_SETTINGS_KEY);
      if (settings) {
        const { username, password, autoSync } = JSON.parse(settings);
        setUsername(username);
        setPassword(password);
        setAutoSync(autoSync);
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Failed to load login settings:', error);
      Alert.alert('Error', 'Failed to load login settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Username and password are required');
      return;
    }

    try {
      setIsLoading(true);
      const settings: LoginSettings = {
        username: username.trim(),
        password: password.trim(),
        autoSync,
      };
      await AsyncStorage.setItem(LOGIN_SETTINGS_KEY, JSON.stringify(settings));
      setIsConfigured(true);
      Alert.alert('Success', 'Login settings saved successfully');
    } catch (error) {
      console.error('Failed to save login settings:', error);
      Alert.alert('Error', 'Failed to save login settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="person" size={24} color="#007AFF" />
          <Text style={styles.title}>Account Settings</Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusIndicator, isConfigured && styles.statusConfigured]}>
            <Text style={[styles.statusText, isConfigured && styles.statusTextConfigured]}>
              {isConfigured ? 'Configured' : 'Not Configured'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#999"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Auto-sync when logged in</Text>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: '#ddd', true: '#4caf50' }}
            thumbColor={autoSync ? '#fff' : '#f4f3f4'}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  statusConfigured: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusTextConfigured: {
    color: '#4caf50',
  },
  content: {
    paddingTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
