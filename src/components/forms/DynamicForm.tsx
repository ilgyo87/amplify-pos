import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { PhoneInput } from '../ui/PhoneInput';
import { CustomerFormData, ValidationErrors } from '../../utils/customerValidation';

interface FormField {
  name: keyof CustomerFormData;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'email' | 'phone';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

interface DynamicFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  errors?: ValidationErrors;
  duplicateError?: string;
  mode: 'create' | 'edit';
}

const formFields: FormField[] = [
  {
    name: 'firstName',
    label: 'First Name',
    placeholder: 'Enter first name',
    required: true,
    type: 'text',
    autoCapitalize: 'words'
  },
  {
    name: 'lastName',
    label: 'Last Name',
    placeholder: 'Enter last name',
    required: true,
    type: 'text',
    autoCapitalize: 'words'
  },
  {
    name: 'email',
    label: 'Email',
    placeholder: 'Enter email address (optional)',
    required: false,
    type: 'email',
    autoCapitalize: 'none',
    keyboardType: 'email-address'
  },
  {
    name: 'phone',
    label: 'Phone',
    placeholder: '(555) 123-4567',
    required: true,
    type: 'phone'
  },
  {
    name: 'address',
    label: 'Address',
    placeholder: 'Enter street address (optional)',
    required: false,
    type: 'text',
    autoCapitalize: 'words'
  },
  {
    name: 'city',
    label: 'City',
    placeholder: 'Enter city (optional)',
    required: false,
    type: 'text',
    autoCapitalize: 'words'
  },
  {
    name: 'state',
    label: 'State',
    placeholder: 'Enter state (optional)',
    required: false,
    type: 'text',
    autoCapitalize: 'characters'
  },
  {
    name: 'zipCode',
    label: 'ZIP Code',
    placeholder: 'Enter ZIP code (optional)',
    required: false,
    type: 'text',
    keyboardType: 'numeric'
  }
];

export const DynamicForm: React.FC<DynamicFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  errors = {},
  duplicateError,
  mode
}) => {
  const {
    control,
    handleSubmit,
    formState: { isValid, isDirty },
    reset
  } = useForm<CustomerFormData>({
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zipCode: initialData?.zipCode || ''
    },
    mode: 'onChange'
  });

  const renderField = (field: FormField) => {
    const fieldError = errors[field.name];

    if (field.type === 'phone') {
      return (
        <Controller
          key={field.name}
          control={control}
          name={field.name}
          rules={{ required: field.required }}
          render={({ field: { onChange, value } }) => (
            <PhoneInput
              label={field.label}
              value={value}
              onChangeText={onChange}
              error={fieldError}
              required={field.required}
              placeholder={field.placeholder}
              editable={!isLoading}
            />
          )}
        />
      );
    }

    return (
      <Controller
        key={field.name}
        control={control}
        name={field.name}
        rules={{ required: field.required }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, fieldError && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder}
              placeholderTextColor="#999"
              autoCapitalize={field.autoCapitalize || 'none'}
              keyboardType={field.keyboardType || 'default'}
              editable={!isLoading}
              autoCorrect={false}
              autoComplete={field.type === 'email' ? 'email' : 'off'}
            />
            {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
        </Text>
        <TouchableOpacity 
          onPress={onCancel}
          style={styles.closeButton}
          disabled={isLoading}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {duplicateError && (
        <View style={styles.duplicateErrorContainer}>
          <Ionicons name="warning" size={20} color="#e74c3c" />
          <Text style={styles.duplicateErrorText}>{duplicateError}</Text>
        </View>
      )}

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        {formFields.map(renderField)}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.submitButton,
            (!isValid || isLoading) && styles.disabledButton
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <Text style={styles.submitButtonText}>
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </Text>
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'create' ? 'Create Customer' : 'Update Customer'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  duplicateErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffeaea',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  duplicateErrorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});