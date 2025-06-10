import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryFormData, CategoryValidationErrors, validateCategoryForm, CATEGORY_COLORS } from '../../utils/categoryValidation';

interface CategoryFormProps {
  title: string;
  initialData?: Partial<CategoryFormData>;
  onSubmit: (data: CategoryFormData) => Promise<{
    category?: any;
    errors?: CategoryValidationErrors;
    duplicateError?: string;
  }>;
  onCancel: () => void;
  submitButtonText?: string;
  isLoading?: boolean;
}

export function CategoryForm({
  title,
  initialData,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Category',
  isLoading = false,
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    color: initialData?.color || CATEGORY_COLORS[0],
  });

  const [errors, setErrors] = useState<CategoryValidationErrors>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        color: initialData.color || CATEGORY_COLORS[0],
      });
    }
  }, [initialData]);

  const updateField = (field: keyof CategoryFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrors({});

      // Validate form data
      const validationErrors = validateCategoryForm(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const result = await onSubmit(formData);

      if (result.errors) {
        setErrors(result.errors);
      } else if (result.duplicateError) {
        Alert.alert('Duplicate Category', result.duplicateError);
      } else if (result.category) {
        // Success - parent will handle closing the form
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save category. Please try again.');
      console.error('Category form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity 
            onPress={handleSubmit} 
            style={[styles.saveButton, (submitting || isLoading) && styles.saveButtonDisabled]}
            disabled={submitting || isLoading}
          >
            <Text style={[styles.saveButtonText, (submitting || isLoading) && styles.saveButtonTextDisabled]}>
              {submitting ? 'Saving...' : submitButtonText}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Category Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Enter category name"
              autoCapitalize="words"
              maxLength={100}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Description */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              value={formData.description}
              onChangeText={(value) => updateField('description', value)}
              placeholder="Enter category description"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Color */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Color <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={[styles.colorPicker, errors.color && styles.inputError]}
              onPress={() => setShowColorPicker(true)}
            >
              <View style={[styles.colorPreview, { backgroundColor: formData.color }]} />
              <Text style={styles.colorText}>{formData.color}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.color && <Text style={styles.errorText}>{errors.color}</Text>}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Color Picker Modal */}
        <Modal 
          visible={showColorPicker} 
          animationType="slide" 
          presentationStyle="pageSheet"
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Color</Text>
              <View style={styles.pickerSpacer} />
            </View>
            <ScrollView style={styles.pickerContent}>
              <View style={styles.colorGrid}>
                {CATEGORY_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.colorOption,
                      color === formData.color && styles.colorOptionSelected
                    ]}
                    onPress={() => {
                      updateField('color', color);
                      setShowColorPicker(false);
                    }}
                  >
                    <View style={[styles.colorCircle, { backgroundColor: color }]} />
                    {color === formData.color && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={16} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  bottomSpacing: {
    height: 20,
  },
  // Color Picker Modal
  pickerModal: {
    flex: 1,
    backgroundColor: 'white',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#007AFF',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerSpacer: {
    width: 50,
  },
  pickerContent: {
    flex: 1,
    padding: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  colorOptionSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkmark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -8,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});