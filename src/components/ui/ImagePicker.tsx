import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GARMENT_IMAGES, getGarmentImageByKey, getDefaultGarmentImage } from '../../database/assets/garmentImages';

interface ImagePickerProps {
  visible: boolean;
  selectedImageKey?: string;
  onSelect: (imageKey: string) => void;
  onCancel: () => void;
  onClear?: () => void;
  title?: string;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  visible,
  selectedImageKey,
  onSelect,
  onCancel,
  onClear,
  title = 'Select Image',
}) => {
  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          {onClear && (
            <TouchableOpacity onPress={onClear}>
              <Text style={styles.defaultButton}>Default</Text>
            </TouchableOpacity>
          )}
          {!onClear && <View style={styles.spacer} />}
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.imageGrid}>
            {GARMENT_IMAGES.map((image) => (
              <TouchableOpacity
                key={image.key}
                style={[
                  styles.imageOption,
                  image.key === selectedImageKey && styles.imageOptionSelected
                ]}
                onPress={() => onSelect(image.key)}
              >
                <Image 
                  source={image.source} 
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
                <Text style={[
                  styles.imageText,
                  image.key === selectedImageKey && styles.imageTextSelected
                ]}>
                  {image.name}
                </Text>
                {image.key === selectedImageKey && (
                  <View style={styles.checkmark}>
                    <Text>
                      <Ionicons name="checkmark" size={16} color="white" />
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

interface ImageDisplayProps {
  imageKey?: string;
  style?: any;
  size?: number;
  showPlaceholder?: boolean;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imageKey,
  style,
  size = 40,
  showPlaceholder = true,
}) => {
  const getImageSource = () => {
    if (!imageKey) return showPlaceholder ? getDefaultGarmentImage() : null;
    const imageSource = getGarmentImageByKey(imageKey);
    return imageSource || (showPlaceholder ? getDefaultGarmentImage() : null);
  };

  const imageSource = getImageSource();
  
  if (!imageSource) return null;

  return (
    <Image 
      source={imageSource} 
      style={[
        styles.displayImage,
        { width: size, height: size },
        style
      ]}
      resizeMode="contain"
    />
  );
};

interface ImageFieldProps {
  label: string;
  imageKey?: string;
  onPress: () => void;
  error?: string;
  required?: boolean;
}

export const ImageField: React.FC<ImageFieldProps> = ({
  label,
  imageKey,
  onPress,
  error,
  required = false,
}) => {
  const getImageName = () => {
    if (!imageKey) return 'Default Image';
    const image = GARMENT_IMAGES.find(img => img.key === imageKey);
    return image ? image.name : 'Custom Image';
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity 
        style={[styles.fieldButton, error && styles.fieldError]}
        onPress={onPress}
      >
        <ImageDisplay imageKey={imageKey} size={40} />
        <View style={styles.fieldInfo}>
          <Text style={styles.fieldText}>{getImageName()}</Text>
          <Text style={styles.fieldSubtext}>Tap to change image</Text>
        </View>
        <Text>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  defaultButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  spacer: {
    width: 50,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageOption: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 8,
    backgroundColor: '#f9f9f9',
    position: 'relative',
  },
  imageOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  imagePreview: {
    width: '100%',
    height: 80,
    marginBottom: 8,
  },
  imageText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  imageTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Image Display
  displayImage: {
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  // Image Field
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
  fieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  fieldError: {
    borderColor: '#FF3B30',
  },
  fieldInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fieldText: {
    fontSize: 16,
    color: '#333',
  },
  fieldSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginTop: 4,
  },
});