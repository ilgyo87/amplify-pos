import React, { useState } from 'react';
import { Modal, View, StyleSheet, Alert } from 'react-native';
import { DynamicForm } from './DynamicForm';
import { BusinessFormData, BusinessValidationErrors, validateBusinessForm } from '../../utils/businessValidation';

interface BusinessFormProps {
  visible: boolean;
  onSubmit: (data: BusinessFormData) => Promise<{ business?: any; errors?: BusinessValidationErrors }>;
  onCancel: () => void;
  initialData?: Partial<BusinessFormData>;
  title?: string;
}

const BUSINESS_FORM_FIELDS = [
  {
    name: 'name',
    label: 'Business Name',
    placeholder: 'Enter business name',
    required: true,
    type: 'text' as const,
    autoCapitalize: 'words' as const,
  },
  {
    name: 'address',
    label: 'Address',
    placeholder: 'Enter street address',
    required: false,
    type: 'text' as const,
    autoCapitalize: 'words' as const,
  },
  {
    name: 'city',
    label: 'City',
    placeholder: 'Enter city',
    required: false,
    type: 'text' as const,
    autoCapitalize: 'words' as const,
  },
  {
    name: 'state',
    label: 'State',
    placeholder: 'Enter state',
    required: false,
    type: 'text' as const,
    autoCapitalize: 'characters' as const,
  },
  {
    name: 'zipCode',
    label: 'ZIP Code',
    placeholder: 'Enter ZIP code',
    required: false,
    type: 'text' as const,
    keyboardType: 'numeric' as const,
  },
  {
    name: 'phone',
    label: 'Phone',
    placeholder: 'Enter phone number',
    required: true,
    type: 'phone' as const,
  },
  {
    name: 'taxId',
    label: 'Tax ID',
    placeholder: 'Enter tax ID (optional)',
    required: false,
    type: 'text' as const,
  },
  {
    name: 'website',
    label: 'Website',
    placeholder: 'Enter website URL (optional)',
    required: false,
    type: 'text' as const,
    autoCapitalize: 'none' as const,
  },
];

export function BusinessForm({
  visible,
  onSubmit,
  onCancel,
  initialData,
  title = 'Create Business'
}: BusinessFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<BusinessValidationErrors>({});

  const handleSubmit = async (data: BusinessFormData) => {
    setIsLoading(true);
    setErrors({});

    // Validate form data
    const validationErrors = validateBusinessForm(data);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsLoading(false);
      return;
    }

    try {
      const result = await onSubmit(data);
      
      if (result.errors) {
        setErrors(result.errors);
      } else if (result.business) {
        // Success
        setErrors({});
        onCancel(); // Close the modal
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create business. Please try again.');
      console.error('Business creation error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <DynamicForm
          fields={BUSINESS_FORM_FIELDS}
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={onCancel}
          isLoading={isLoading}
          errors={errors}
          mode="create"
          submitButtonText={title}
          title={title}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});