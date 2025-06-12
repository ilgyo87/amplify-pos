import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CheckoutValidationOverlayProps {
  hasEmployee: boolean;
  hasBusiness: boolean;
  hasProducts: boolean;
  onNavigateToEmployees?: () => void;
  onNavigateToBusiness?: () => void;
  onNavigateToProducts?: () => void;
}

export function CheckoutValidationOverlay({
  hasEmployee,
  hasBusiness,
  hasProducts,
  onNavigateToEmployees,
  onNavigateToBusiness,
  onNavigateToProducts
}: CheckoutValidationOverlayProps) {
  const requirements = [
    {
      id: 'employee',
      label: 'Employee signed in',
      completed: hasEmployee,
      onPress: onNavigateToEmployees,
      description: 'An employee must be signed in to process orders'
    },
    {
      id: 'business',
      label: 'Business created',
      completed: hasBusiness,
      onPress: onNavigateToBusiness,
      description: 'A business profile must be created for order processing'
    },
    {
      id: 'products',
      label: 'Products available',
      completed: hasProducts,
      onPress: onNavigateToProducts,
      description: 'At least one product must be available to create orders'
    }
  ];

  const allRequirementsMet = requirements.every(req => req.completed);

  if (allRequirementsMet) {
    return null; // Don't render overlay if all requirements are met
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="warning-outline" size={48} color="#FF6B6B" />
          <Text style={styles.title}>Setup Required</Text>
          <Text style={styles.subtitle}>
            Complete the following requirements before processing orders:
          </Text>
        </View>

        <View style={styles.requirementsList}>
          {requirements.map((requirement) => (
            <TouchableOpacity
              key={requirement.id}
              style={[
                styles.requirementItem,
                requirement.completed && styles.completedItem
              ]}
              onPress={() => {
                if (requirement.completed) {
                  Alert.alert('✓ Complete', requirement.description);
                } else if (requirement.onPress) {
                  requirement.onPress();
                } else {
                  Alert.alert('Setup Required', requirement.description);
                }
              }}
            >
              <View style={styles.requirementIcon}>
                <Ionicons
                  name={requirement.completed ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={requirement.completed ? "#4CAF50" : "#FF6B6B"}
                />
              </View>
              <View style={styles.requirementContent}>
                <Text style={[
                  styles.requirementLabel,
                  requirement.completed && styles.completedLabel
                ]}>
                  {requirement.label}
                </Text>
                <Text style={styles.requirementDescription}>
                  {requirement.description}
                </Text>
              </View>
              {!requirement.completed && (
                <Ionicons name="chevron-forward" size={20} color="#666" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Tap any incomplete item above to get started
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  requirementsList: {
    gap: 16,
    marginBottom: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  completedItem: {
    backgroundColor: '#F1F8E9',
    borderColor: '#C8E6C9',
  },
  requirementIcon: {
    marginRight: 16,
  },
  requirementContent: {
    flex: 1,
  },
  requirementLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  completedLabel: {
    color: '#2E7D32',
  },
  requirementDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});