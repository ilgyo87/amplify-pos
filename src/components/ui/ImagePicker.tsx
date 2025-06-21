import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GARMENT_IMAGES, getGarmentImageByKey, getDefaultGarmentImage } from '../../database/assets/garmentImages';
import { ENV } from '../../config/environment';

interface ImagePickerProps {
  visible: boolean;
  selectedImageKey?: string;
  onSelect: (imageKey: string, imageUrl?: string) => void;
  onCancel: () => void;
  onClear?: () => void;
  title?: string;
}

interface OnlineImage {
  id: string;
  urls: {
    small: string;
    regular: string;
  };
  alt_description: string;
  user: {
    name: string;
  };
}

export function ImagePicker({
  visible,
  selectedImageKey,
  onSelect,
  onCancel,
  onClear,
  title = 'Select Image',
}: ImagePickerProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'online'>('local');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineImages, setOnlineImages] = useState<OnlineImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOnlineImage, setSelectedOnlineImage] = useState<string | null>(null);

  const searchImages = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Using Unsplash API
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=20`,
        {
          headers: {
            Authorization: `Client-ID ${ENV.UNSPLASH_ACCESS_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setOnlineImages(data.results);
      } else {
        Alert.alert('Error', 'Failed to search images. Please try again.');
      }
    } catch (error) {
      console.error('Image search error:', error);
      Alert.alert('Error', 'Failed to search images. Please check your connection.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOnlineImageSelect = (imageUrl: string) => {
    setSelectedOnlineImage(imageUrl);
    onSelect(`online_${Date.now()}`, imageUrl);
  };

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
        
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'local' && styles.activeTab]}
            onPress={() => setActiveTab('local')}
          >
            <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
              Local Images
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'online' && styles.activeTab]}
            onPress={() => setActiveTab('online')}
          >
            <Text style={[styles.tabText, activeTab === 'online' && styles.activeTabText]}>
              Search Online
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'local' ? (
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
        ) : (
          <View style={styles.content}>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for garment images..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchImages}
                returnKeyType="search"
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={searchImages}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="search" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Searching images...</Text>
              </View>
            ) : (
              <ScrollView style={styles.onlineContent}>
                <View style={styles.imageGrid}>
                  {onlineImages.map((image) => (
                    <TouchableOpacity
                      key={image.id}
                      style={[
                        styles.imageOption,
                        selectedOnlineImage === image.urls.regular && styles.imageOptionSelected
                      ]}
                      onPress={() => handleOnlineImageSelect(image.urls.regular)}
                    >
                      <Image 
                        source={{ uri: image.urls.small }} 
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <Text style={[
                        styles.imageText,
                        selectedOnlineImage === image.urls.regular && styles.imageTextSelected
                      ]}
                      numberOfLines={2}
                      >
                        {image.alt_description || 'Garment Image'}
                      </Text>
                      {selectedOnlineImage === image.urls.regular && (
                        <View style={styles.checkmark}>
                          <Text>
                            <Ionicons name="checkmark" size={16} color="white" />
                          </Text>
                        </View>
                      )}
                      <Text style={styles.imageCredit}>by {image.user.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {onlineImages.length === 0 && searchQuery && !isSearching && (
                  <View style={styles.noResults}>
                    <Text style={styles.noResultsText}>
                      No images found. Try a different search term.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

interface ImageDisplayProps {
  imageKey?: string;
  imageUrl?: string;
  style?: any;
  size?: number;
  showPlaceholder?: boolean;
}

export function ImageDisplay({
  imageKey,
  imageUrl,
  style,
  size = 40,
  showPlaceholder = true,
}: ImageDisplayProps) {
  const getImageSource = () => {
    // If we have an online image URL, use it
    if (imageUrl) {
      return { uri: imageUrl };
    }
    
    if (!imageKey) return showPlaceholder ? getDefaultGarmentImage() : null;
    
    // Check if this is an online image key
    if (imageKey.startsWith('online_')) {
      return showPlaceholder ? getDefaultGarmentImage() : null;
    }
    
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
}

interface ImageFieldProps {
  label: string;
  imageKey?: string;
  imageUrl?: string;
  onPress: () => void;
  error?: string;
  required?: boolean;
}

export function ImageField({
  label,
  imageKey,
  imageUrl,
  onPress,
  error,
  required = false,
}: ImageFieldProps) {
  const getImageName = () => {
    if (imageUrl) return 'Online Image';
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
        <ImageDisplay imageKey={imageKey} imageUrl={imageUrl} size={40} />
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
}

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
  // Tab Navigation
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    width: 40,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  noResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  onlineContent: {
    flex: 1,
    paddingHorizontal: 16,
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
  imageCredit: {
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
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