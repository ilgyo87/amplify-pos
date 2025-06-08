import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinInputProps {
  onSubmit: (pin: string) => Promise<{ success: boolean; error?: string }>;
  isLoading?: boolean;
  title?: string;
  subtitle?: string;
}

export const PinInput: React.FC<PinInputProps> = ({
  onSubmit,
  isLoading = false,
  title = 'Employee Sign In',
  subtitle = 'Enter your 4-digit PIN'
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

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
        // Refocus input after error
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      console.error('PIN submit error:', error);
      setError('Sign-in failed. Please try again.');
      setPin('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinChange = (text: string) => {
    // Only allow numeric input and max 4 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
    setError(''); // Clear error when user types
  };

  const handleClear = () => {
    setPin('');
    setError('');
    inputRef.current?.focus();
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
      );
    }
    return dots;
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
          
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            autoFocus
            editable={!isSubmitting && !isLoading}
            caretHidden
          />
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

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            disabled={isSubmitting || isLoading}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Enter your PIN and it will auto-submit when complete
        </Text>
        
        {error === 'No employees found. Use PIN 9999 for admin setup.' && (
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
};

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
    maxWidth: 300,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
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
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 50,
    opacity: 0,
    fontSize: 18,
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
  actions: {
    alignItems: 'center',
    marginBottom: 20,
  },
  clearButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
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