import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';

interface StripeConnectCardFormProps {
  onCardChange: (cardDetails: any) => void;
}

export function StripeConnectCardForm({ onCardChange }: StripeConnectCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const formatExpiry = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const handleCardNumberChange = (text: string) => {
    const formatted = formatCardNumber(text);
    setCardNumber(formatted);
    updateCardDetails(formatted, expMonth, expYear, cvc);
  };

  const handleExpiryChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      const month = cleaned.substring(0, 2);
      const year = cleaned.substring(2, 4);
      setExpMonth(month);
      setExpYear(year);
      updateCardDetails(cardNumber, month, year, cvc);
    }
  };

  const handleCvcChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) {
      setCvc(cleaned);
      updateCardDetails(cardNumber, expMonth, expYear, cleaned);
    }
  };

  const updateCardDetails = (number: string, month: string, year: string, cvv: string) => {
    const cleanNumber = number.replace(/\s/g, '');
    const isComplete = cleanNumber.length >= 15 && month.length === 2 && year.length === 2 && cvv.length >= 3;
    
    onCardChange({
      complete: isComplete,
      last4: cleanNumber.substring(cleanNumber.length - 4),
      expiryMonth: month,
      expiryYear: year,
      number: cleanNumber,
      cvc: cvv,
      brand: detectCardBrand(cleanNumber)
    });
  };

  const detectCardBrand = (number: string): string => {
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5')) return 'Mastercard';
    if (number.startsWith('3')) return 'Amex';
    return 'Unknown';
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Card Number"
        value={cardNumber}
        onChangeText={handleCardNumberChange}
        keyboardType="numeric"
        maxLength={19} // 16 digits + 3 spaces
      />
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="MM/YY"
          value={formatExpiry(expMonth + expYear)}
          onChangeText={handleExpiryChange}
          keyboardType="numeric"
          maxLength={5}
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="CVC"
          value={cvc}
          onChangeText={handleCvcChange}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>
      <Text style={styles.disclaimer}>
        Card details are processed securely through Stripe
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
});