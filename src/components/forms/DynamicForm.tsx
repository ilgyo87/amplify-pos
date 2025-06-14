import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';
import { PhoneInput } from '../ui/PhoneInput';
import { CustomerFormData, ValidationErrors } from '../../utils/customerValidation';
import { EmployeeFormData, EmployeeValidationErrors } from '../../utils/employeeValidation';
import { BusinessFormData, BusinessValidationErrors } from '../../utils/businessValidation';

type FormDataType = CustomerFormData | EmployeeFormData | BusinessFormData;
type ValidationErrorsType = ValidationErrors | EmployeeValidationErrors | BusinessValidationErrors;

interface FormField {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'email' | 'phone' | 'pin' | 'textarea' | 'toggle';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  description?: string; // For toggle switches description
}

interface DynamicFormProps {
  fields?: FormField[];
  initialData?: any; // Use any for initialData to avoid type constraints
  onSubmit: (data: any) => void; // Use any to bypass strict typing
  onCancel: () => void;
  isLoading?: boolean;
  errors?: ValidationErrorsType;
  duplicateError?: string;
  mode: 'create' | 'edit';
  entityType?: 'customer' | 'employee';
  title?: string;
  submitButtonText?: string;
  onOrderHistory?: () => void; // Optional callback for customer order history button
}

const getFormFields = (entityType: 'customer' | 'employee'): FormField[] => {
  const fields: FormField[] = [
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
      name: 'phone',
      label: 'Phone',
      placeholder: '(555) 123-4567',
      required: true,
      type: 'phone'
    },
    {
      name: 'email',
      label: 'Email',
      placeholder: 'Enter email address (optional)',
      required: false,
      type: 'email',
      autoCapitalize: 'none',
      keyboardType: 'email-address'
    }
  ];

  // Add PIN field right after email for employees (required)
  if (entityType === 'employee') {
    fields.push({
      name: 'pin',
      label: 'PIN',
      placeholder: 'Enter 4-6 digit PIN',
      required: true,
      type: 'pin',
      keyboardType: 'numeric',
      secureTextEntry: true
    });
  }

  // Add address fields
  fields.push(
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
  );

  // Add notes field and notification toggles for customers only
  if (entityType === 'customer') {
    fields.push(
      {
        name: 'notes',
        label: 'Notes',
        placeholder: 'Add any additional notes about the customer (optional)',
        required: false,
        type: 'textarea',
        autoCapitalize: 'sentences'
      },
      {
        name: 'emailNotifications',
        label: 'Email Notifications',
        placeholder: '',
        required: false,
        type: 'toggle',
        description: 'Send email notifications when orders are completed'
      },
      {
        name: 'textNotifications',
        label: 'Text Notifications',
        placeholder: '',
        required: false,
        type: 'toggle',
        description: 'Send text notifications when orders are completed'
      }
    );
  }

  return fields;
};

export function DynamicForm({
  fields,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  errors = {},
  duplicateError,
  mode,
  entityType,
  title,
  submitButtonText,
  onOrderHistory
}: DynamicFormProps) {
  const formFields = fields || (entityType ? getFormFields(entityType) : []);
  
  const {
    control,
    handleSubmit,
    formState: { isValid }
  } = useForm({
    defaultValues: (() => {
      // Create default values based on entity type and initialData
      if (entityType === 'customer') {
        return {
          firstName: initialData?.firstName || '',
          lastName: initialData?.lastName || '',
          phone: initialData?.phone || '',
          email: initialData?.email || '',
          address: initialData?.address || '',
          city: initialData?.city || '',
          state: initialData?.state || '',
          zipCode: initialData?.zipCode || '',
          notes: initialData?.notes || '',
          emailNotifications: initialData?.emailNotifications || false,
          textNotifications: initialData?.textNotifications || false
        };
      } else if (entityType === 'employee') {
        return {
          firstName: initialData?.firstName || '',
          lastName: initialData?.lastName || '',
          phone: initialData?.phone || '',
          email: initialData?.email || '',
          address: initialData?.address || '',
          city: initialData?.city || '',
          state: initialData?.state || '',
          zipCode: initialData?.zipCode || '',
          pin: initialData?.pin || ''
        };
      } else {
        // Business form
        return {
          name: initialData?.name || '',
          phone: initialData?.phone || '',
          email: initialData?.email || '',
          address: initialData?.address || '',
          city: initialData?.city || '',
          state: initialData?.state || '',
          zipCode: initialData?.zipCode || '',
          taxId: initialData?.taxId || '',
          website: initialData?.website || ''
        };
      }
    })(),
    mode: 'onChange'
  });


  const renderField = (field: FormField) => {
    const fieldError = (errors as any)[field.name];

    if (field.type === 'phone') {
      return (
        <Controller
          key={field.name}
          control={control}
          name={field.name as any}
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

    if (field.type === 'toggle') {
      return (
        <Controller
          key={field.name}
          control={control}
          name={field.name as any}
          render={({ field: { onChange, value } }) => (
            <View style={styles.toggleContainer}>
              <View style={styles.toggleTextContainer}>
                <Text style={styles.toggleLabel}>{field.label}</Text>
                {field.description && (
                  <Text style={styles.toggleDescription}>{field.description}</Text>
                )}
              </View>
              <Switch
                value={value || false}
                onValueChange={onChange}
                disabled={isLoading}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={value ? '#ffffff' : '#9ca3af'}
                ios_backgroundColor="#e5e7eb"
              />
            </View>
          )}
        />
      );
    }

    return (
      <Controller
        key={field.name}
        control={control}
        name={field.name as any}
        rules={{ required: field.required }}
        render={({ field: { onChange, value } }) => (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.input, 
                fieldError && styles.inputError,
                field.type === 'textarea' && styles.textareaInput
              ]}
              value={value}
              onChangeText={onChange}
              placeholder={field.placeholder}
              placeholderTextColor="#999"
              autoCapitalize={field.autoCapitalize || 'none'}
              keyboardType={field.keyboardType || 'default'}
              editable={!isLoading}
              autoCorrect={field.type === 'textarea'}
              autoComplete={field.type === 'email' ? 'email' : 'off'}
              secureTextEntry={field.secureTextEntry || false}
              multiline={field.type === 'textarea'}
              numberOfLines={field.type === 'textarea' ? 3 : 1}
              textAlignVertical={field.type === 'textarea' ? 'top' : 'center'}
            />
            {fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
          </View>
        )}
      />
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {title || (mode === 'create' 
            ? `Add New ${entityType === 'customer' ? 'Customer' : 'Employee'}` 
            : `Edit ${entityType === 'customer' ? 'Customer' : 'Employee'}`
          )}
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

      {/* Order History Button - only show for customer edit mode */}
      {mode === 'edit' && entityType === 'customer' && onOrderHistory && (
        <View style={styles.orderHistoryContainer}>
          <TouchableOpacity
            style={styles.orderHistoryButton}
            onPress={onOrderHistory}
            disabled={isLoading}
          >
            <Ionicons name="time-outline" size={20} color="#007AFF" />
            <Text style={styles.orderHistoryButtonText}>View Order History</Text>
            <Ionicons name="chevron-forward" size={16} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

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
              {submitButtonText || (mode === 'create' 
                ? `Create ${entityType === 'customer' ? 'Customer' : 'Employee'}` 
                : `Update ${entityType === 'customer' ? 'Customer' : 'Employee'}`
              )}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

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
  textareaInput: {
    height: 80,
    paddingTop: 12,
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
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  orderHistoryContainer: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  orderHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderHistoryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
});