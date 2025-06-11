import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CardField, CardFieldInput } from '@stripe/stripe-react-native';

interface StripeCardFormProps {
  onCardChange: (cardDetails: CardFieldInput.Details) => void;
}

export function StripeCardForm({ onCardChange }: StripeCardFormProps) {
  return (
    <View style={styles.container}>
      <CardField
        postalCodeEnabled={false}
        placeholders={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={{
          backgroundColor: '#F8F9FA',
          textColor: '#333333',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        }}
        style={styles.cardField}
        onCardChange={onCardChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
});
