import React, { useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatPhoneNumber, cleanPhoneNumber, validatePhoneNumber } from '../../utils/phoneUtils';

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  showValidation?: boolean;
  required?: boolean;
}

export function PhoneInput({
  label,
  error,
  value,
  onChangeText,
  onValidationChange,
  showValidation = true,
  required = false,
  style,
  ...props
}: PhoneInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Format the display value
    const formatted = formatPhoneNumber(value);
    setDisplayValue(formatted);
    
    // Check validity
    const valid = validatePhoneNumber(value);
    setIsValid(valid);
    
    // Notify parent of validation state
    if (onValidationChange) {
      onValidationChange(valid);
    }
  }, [value, onValidationChange]);

  const handleTextChange = (text: string) => {
    // Format display value
    const formatted = formatPhoneNumber(text);
    setDisplayValue(formatted);
    
    // Clean phone number for storage
    const cleaned = cleanPhoneNumber(text);
    
    // Only allow up to 10 digits
    if (cleaned.length <= 10) {
      onChangeText(cleaned);
    }
  };

  const getInputStyle = () => {
    if (error) return styles.inputError;
    if (showValidation && value && isValid) return styles.inputValid;
    if (showValidation && value && !isValid) return styles.inputInvalid;
    return styles.input;
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        <Ionicons name="call-outline" size={20} color="#666" style={styles.icon} />
        <TextInput
          {...props}
          style={[getInputStyle(), style]}
          value={displayValue}
          onChangeText={handleTextChange}
          placeholder="(555) 123-4567"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={14} // Formatted length: (555) 123-4567
        />
        {showValidation && value && (
          <Ionicons
            name={isValid ? "checkmark-circle" : "close-circle"}
            size={20}
            color={isValid ? "#4CAF50" : "#f44336"}
            style={styles.validationIcon}
          />
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {showValidation && !error && value && !isValid && (
        <Text style={styles.helperText}>Please enter a valid 10-digit phone number</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  required: {
    color: '#e74c3c',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputContainerError: {
    borderColor: '#f44336',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 48,
  },
  inputError: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 48,
  },
  inputValid: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 48,
  },
  inputInvalid: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 48,
  },
  icon: {
    marginRight: 8,
  },
  validationIcon: {
    marginLeft: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    marginTop: 4,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },
});