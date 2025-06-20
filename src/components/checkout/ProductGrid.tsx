import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image,
  useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductDocument } from '../../database/schemas/product';
import { getProductImage } from '../../database/assets/productImages';

interface ProductGridProps {
  products: ProductDocument[] | any[];
  onSelectProduct: (product: ProductDocument) => void;
  isLoading?: boolean;
  style?: any;
}

// Removed fixed row count - grid will show all products with scrolling

export function ProductGrid(props: ProductGridProps) {
  const {
    products = [],
    onSelectProduct,
    isLoading = false,
    style
  } = props;
  
  const windowDimensions = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [isOrientationLandscape, setIsOrientationLandscape] = useState(false);
  
  // Safety checks for undefined/null values
  const safeProducts = Array.isArray(products) ? products : [];
  
  // Update orientation based on container dimensions (more reliable than window)
  useEffect(() => {
    if (containerWidth > 0 && containerHeight > 0) {
      const landscape = containerWidth > containerHeight;
      setIsOrientationLandscape(landscape);
    } else {
      // Fallback to window dimensions
      const landscape = windowDimensions.width > windowDimensions.height;
      setIsOrientationLandscape(landscape);
    }
  }, [containerWidth, containerHeight, windowDimensions.width, windowDimensions.height]);
  
  // Use 4 columns in landscape, 3 in portrait
  const COLUMN_COUNT = isOrientationLandscape ? 4 : 3;
  
  // Calculate item dimensions based on actual container width
  const containerPadding = 16; // Consistent padding
  const gridGap = 12; // Consistent gap
  const totalGaps = gridGap * (COLUMN_COUNT - 1);
  const availableWidth = containerWidth > 0 ? containerWidth - containerPadding - totalGaps : 0;
  
  // Calculate item dimensions with dynamic aspect ratio
  const itemWidth = containerWidth > 0 ? Math.floor(availableWidth / COLUMN_COUNT) : 80;
  const itemHeight = Math.floor(itemWidth * 1.2); // Consistent aspect ratio
  
  // Handle container layout to get actual width and height
  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerWidth(width);
    setContainerHeight(height);
  };

  const renderProductItem = ({ item }: { item: any }) => {
    // Safety check for item
    if (!item || typeof item !== 'object') {
      return (
        <View style={[styles.productItem, { width: itemWidth, height: itemHeight }]}>
          <Text style={styles.productName}>Invalid Item</Text>
        </View>
      );
    }

    try {
      const productName = String(item.name || 'Unnamed Product');
      const imageName = String(item.imageName || '');
      const imageSource = getProductImage(productName, imageName);
      const productPrice = Number(item.price || 0);
      const productDiscount = Number(item.discount || 0);

      return (
        <TouchableOpacity
          style={[styles.productItem, { width: itemWidth, height: itemHeight }]}
          onPress={() => onSelectProduct(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.imageContainer, { height: itemWidth * 0.6 }]}>
            <Image source={imageSource} style={styles.productImage} resizeMode="contain" />
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {productName}
            </Text>
            <Text style={styles.productPrice}>
              ${productPrice.toFixed(2)}
            </Text>
            {productDiscount > 0 && (
              <Text style={styles.discountText}>
                {productDiscount}% off
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      return (
        <View style={[styles.productItem, { width: itemWidth, height: itemHeight }]}>
          <Text style={styles.productName}>Error Loading Product</Text>
        </View>
      );
    }
  };


  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (safeProducts.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, style]}>
        <Ionicons name="shirt-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No products available</Text>
        <Text style={styles.emptySubtext}>Try selecting a different category</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} onLayout={handleLayout}>
      <FlatList
        data={safeProducts}
        renderItem={renderProductItem}
        keyExtractor={(item, index) => item?.id || `product-${index}`}
        numColumns={COLUMN_COUNT}
        key={`${COLUMN_COUNT}-${containerWidth}`} // Force re-render on column count changes
        contentContainerStyle={[styles.gridContent, { padding: containerPadding / 2 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        columnWrapperStyle={[styles.row, { gap: gridGap }]}
        ItemSeparatorComponent={() => <View style={{ height: gridGap }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  gridContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'flex-start',
  },
  productItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productImage: {
    width: '80%',
    height: '80%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 14,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
  },
  discountText: {
    fontSize: 10,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 2,
  },
});