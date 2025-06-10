import React from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  type: 'text' | 'email' | 'phone' | 'pin';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
}

interface DynamicFormProps {
  fields?: FormField[];
  initialData?: Partial<FormDataType>;
  onSubmit: (data: FormDataType) => void;
  onCancel: () => void;
  isLoading?: boolean;
  errors?: ValidationErrorsType;
  duplicateError?: string;
  mode: 'create' | 'edit';
  entityType?: 'customer' | 'employee';
  title?: string;
  submitButtonText?: string;
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
  submitButtonText
}: DynamicFormProps) {
  const formFields = fields || (entityType ? getFormFields(entityType) : []);
  
  const {
    control,
    handleSubmit,
    formState: { isValid }
  } = useForm<FormDataType>({
    defaultValues: {
      // Handle different data types
      ...(entityType === 'customer' || entityType === 'employee' ? {
        firstName: (initialData as CustomerFormData | EmployeeFormData)?.firstName || '',
        lastName: (initialData as CustomerFormData | EmployeeFormData)?.lastName || '',
      } : {
        name: (initialData as BusinessFormData)?.name || '',
      }),
      phone: initialData?.phone || '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zipCode: initialData?.zipCode || '',
      ...(entityType === 'employee' && { 
        pin: (initialData as EmployeeFormData)?.pin || '' 
      }),
      // Business-specific fields
      ...((initialData as BusinessFormData)?.taxId && { 
        taxId: (initialData as BusinessFormData).taxId 
      }),
      ...((initialData as BusinessFormData)?.website && { 
        website: (initialData as BusinessFormData).website 
      })
    },
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
              secureTextEntry={field.secureTextEntry || false}
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
    </View>
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