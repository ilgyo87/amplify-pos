import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinInputProps {
  onSubmit: (pin: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
  showSetupHint?: boolean;
}

export function PinInput({
  onSubmit,
  isLoading = false,
  title = 'Employee Sign In',
  subtitle = 'Enter your 4-digit PIN',
  showSetupHint = false
}: PinInputProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Auto-submit when PIN is 4 digits
    if (pin.length === 4) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await onSubmit(pin);
      
      if (!result.success) {
        setError(result.error || 'Sign-in failed');
        setPin(''); // Clear PIN on error
      }
    } catch (error) {
      console.error('PIN submit error:', error);
      setError('Sign-in failed. Please try again.');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDigit = (digit: string) => {
    if (pin.length < 4 && !isSubmitting && !isLoading) {
      const newPin = pin + digit;
      setPin(newPin);
      setError(''); // Clear error when user types
    }
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');
    }
  };

  const renderPinDots = () => {
    const dots: React.ReactElement[] = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
      );
    }
    return dots;
  };

  // Render the numeric keypad
  const renderKeypad = () => {
    const buttons = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['delete', '0', 'clear']
    ];

    return (
      <View style={styles.keypadContainer}>
        {buttons.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.keypadRow}>
            {row.map((button) => {
              if (button === 'delete') {
                return (
                  <TouchableOpacity
                    key={button}
                    style={styles.keypadButton}
                    onPress={handleDelete}
                    disabled={isSubmitting || isLoading || pin.length === 0}
                  >
                    <Ionicons name="backspace-outline" size={24} color={pin.length === 0 || isSubmitting || isLoading ? '#ccc' : '#666'} />
                  </TouchableOpacity>
                );
              }
              if (button === 'clear') {
                return (
                  <TouchableOpacity
                    key={button}
                    style={styles.keypadButton}
                    onPress={handleClear}
                    disabled={isSubmitting || isLoading || pin.length === 0}
                  >
                    <Text style={[styles.keypadText, { color: pin.length === 0 || isSubmitting || isLoading ? '#ccc' : '#FF3B30' }]}>Clear</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={button}
                  style={styles.keypadButton}
                  onPress={() => handleAddDigit(button)}
                  disabled={isSubmitting || isLoading || pin.length >= 4}
                >
                  <Text style={[styles.keypadText, { color: pin.length >= 4 || isSubmitting || isLoading ? '#ccc' : '#333' }]}>{button}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.pinDotsContainer}>
            {renderPinDots()}
          </View>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#FF3B30" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {(isSubmitting || isLoading) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        )}

        {renderKeypad()}
        
        <Text style={styles.hint}>
          Enter your PIN and it will auto-submit when complete
        </Text>
        
        {(showSetupHint || error === 'No employees found. Use PIN 9999 for admin setup.') && (
          <View style={styles.setupHint}>
            <Text style={styles.setupHintTitle}>First Time Setup?</Text>
            <Text style={styles.setupHintText}>
              Use PIN <Text style={styles.setupPin}>9999</Text> to access admin mode and create your first employees.
            </Text>
            <Text style={styles.setupHintText}>
              Or use the "Add Default Data" button on the Products screen to create demo employees.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const buttonSize = Math.min(width / 4.5, 85);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    marginHorizontal: 8,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE6E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginLeft: 6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 8,
  },
  // Numeric keypad styles
  keypadContainer: {
    marginBottom: 20,
    width: '100%',
    maxWidth: 350,
    padding: 24,
    paddingHorizontal: 32,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keypadButton: {
    width: buttonSize,
    height: buttonSize,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  keypadText: {
    fontSize: 28,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  setupHint: {
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#B3D9F2',
  },
  setupHintTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 8,
    textAlign: 'center',
  },
  setupHintText: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  setupPin: {
    fontWeight: '700',
    fontSize: 14,
    color: '#0D47A1',
  },
});