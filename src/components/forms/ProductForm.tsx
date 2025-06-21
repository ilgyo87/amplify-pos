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
import { ProductFormData, ProductValidationErrors, validateProductForm } from '../../utils/productValidation';
import { CategoryDocument } from '../../database/schemas/category';
import { ImagePicker, ImageField } from '../ui/ImagePicker';

interface ProductFormProps {
  title: string;
  initialData?: Partial<ProductFormData>;
  categories: CategoryDocument[];
  onSubmit: (data: ProductFormData) => Promise<{
    product?: any;
    errors?: ProductValidationErrors;
    duplicateError?: string;
  }>;
  onCancel: () => void;
  submitButtonText?: string;
  isLoading?: boolean;
}

export function ProductForm({
  title,
  initialData,
  categories,
  onSubmit,
  onCancel,
  submitButtonText = 'Save Product',
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    categoryId: initialData?.categoryId || '',
    imageName: initialData?.imageName || '',
    imageUrl: (initialData as any)?.imageUrl || '',
    discount: initialData?.discount || 0,
    additionalPrice: initialData?.additionalPrice || 0,
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<ProductValidationErrors>({});
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Store raw string values for price fields during editing
  const [priceText, setPriceText] = useState(initialData?.price?.toString() || '');
  const [discountText, setDiscountText] = useState(initialData?.discount?.toString() || '');
  const [additionalPriceText, setAdditionalPriceText] = useState(initialData?.additionalPrice?.toString() || '');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        price: initialData.price || 0,
        categoryId: initialData.categoryId || '',
        imageName: initialData.imageName || '',
        discount: initialData.discount || 0,
        additionalPrice: initialData.additionalPrice || 0,
        notes: initialData.notes || '',
      });
      setPriceText(initialData.price?.toString() || '');
      setDiscountText(initialData.discount?.toString() || '');
      setAdditionalPriceText(initialData.additionalPrice?.toString() || '');
    }
  }, [initialData]);

  const updateField = (field: keyof ProductFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getSelectedCategory = () => {
    return categories.find(cat => cat.id === formData.categoryId);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrors({});

      // Validate form data
      const validationErrors = validateProductForm(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const result = await onSubmit(formData);

      if (result.errors) {
        setErrors(result.errors);
      } else if (result.duplicateError) {
        Alert.alert('Duplicate Product', result.duplicateError);
      } else if (result.product) {
        // Success - parent will handle closing the form
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save product. Please try again.');
      console.error('Product form submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = getSelectedCategory();

  return (
    <Modal visible={true} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
          {/* Product Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Product Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(value) => updateField('name', value)}
              placeholder="Enter product name"
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
              placeholder="Enter product description"
              multiline
              numberOfLines={3}
              maxLength={500}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Price */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Price <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.price && styles.inputError]}
              value={priceText}
              onChangeText={(value) => {
                // Allow decimal point and digits only
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setPriceText(value);
                  const numValue = value === '' ? 0 : parseFloat(value) || 0;
                  updateField('price', numValue);
                }
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          {/* Category */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>
              Category <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={[styles.picker, errors.categoryId && styles.inputError]}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.pickerText, !selectedCategory && styles.placeholderText]}>
                {selectedCategory ? selectedCategory.name : 'Select a category'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
            {errors.categoryId && <Text style={styles.errorText}>{errors.categoryId}</Text>}
          </View>

          {/* Product Image */}
          <ImageField
            label="Product Image"
            imageKey={formData.imageName}
            imageUrl={formData.imageUrl}
            onPress={() => setShowImagePicker(true)}
            error={errors.imageName}
          />

          {/* Discount */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Discount (%)</Text>
            <TextInput
              style={[styles.input, errors.discount && styles.inputError]}
              value={discountText}
              onChangeText={(value) => {
                // Allow decimal point and digits only
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setDiscountText(value);
                  const numValue = parseFloat(value) || 0;
                  updateField('discount', Math.min(100, Math.max(0, numValue)));
                }
              }}
              placeholder="0"
              keyboardType="decimal-pad"
            />
            {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}
          </View>

          {/* Additional Price */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Additional Price</Text>
            <TextInput
              style={[styles.input, errors.additionalPrice && styles.inputError]}
              value={additionalPriceText}
              onChangeText={(value) => {
                // Allow decimal point and digits only
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setAdditionalPriceText(value);
                  const numValue = parseFloat(value) || 0;
                  updateField('additionalPrice', numValue);
                }
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Text style={styles.helpText}>Extra charges (e.g., alterations, customization)</Text>
            {errors.additionalPrice && <Text style={styles.errorText}>{errors.additionalPrice}</Text>}
          </View>

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.notes && styles.inputError]}
              value={formData.notes}
              onChangeText={(value) => updateField('notes', value)}
              placeholder="Any additional notes..."
              multiline
              numberOfLines={3}
              maxLength={1000}
            />
            {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Category Picker Modal */}
        <Modal 
          visible={showCategoryPicker} 
          animationType="slide" 
          presentationStyle="pageSheet"
        >
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.pickerTitle}>Select Category</Text>
              <View style={styles.pickerSpacer} />
            </View>
            <ScrollView style={styles.pickerContent}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.pickerOption,
                    category.id === formData.categoryId && styles.pickerOptionSelected
                  ]}
                  onPress={() => {
                    updateField('categoryId', category.id);
                    setShowCategoryPicker(false);
                  }}
                >
                  <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                  <View style={styles.categoryInfo}>
                    <Text style={[
                      styles.pickerOptionText,
                      category.id === formData.categoryId && styles.pickerOptionTextSelected
                    ]}>
                      {category.name}
                    </Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>{category.description}</Text>
                    )}
                  </View>
                  {category.id === formData.categoryId && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

        {/* Image Picker Modal */}
        <ImagePicker
          visible={showImagePicker}
          selectedImageKey={formData.imageName}
          onSelect={(imageKey, imageUrl) => {
            updateField('imageName', imageKey);
            updateField('imageUrl', imageUrl || '');
            setShowImagePicker(false);
          }}
          onCancel={() => setShowImagePicker(false)}
          onClear={() => {
            updateField('imageName', '');
            updateField('imageUrl', '');
            setShowImagePicker(false);
          }}
          title="Select Product Image"
        />
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
  bottomSpacing: {
    height: 20,
  },
  // Category Picker Modal
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
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#f0f8ff',
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});