import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Image
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

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 4; // Fixed 4x4 grid
// Reduce item width by 15%
const ITEM_WIDTH = ((width - 80) / COLUMN_COUNT) * 0.85;

export function ProductGrid(props: ProductGridProps) {
  const {
    products = [],
    onSelectProduct,
    isLoading = false,
    style
  } = props;
  
  // Safety checks for undefined/null values
  const safeProducts = Array.isArray(products) ? products : [];

  // Use the existing image utility function

  const renderProductItem = ({ item }: { item: any }) => {
    // Safety check for item
    if (!item || typeof item !== 'object') {
      return (
        <View style={styles.productItem}>
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
          style={styles.productItem}
          onPress={() => onSelectProduct(item)}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
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
          
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      );
    } catch (error) {
      return (
        <View style={styles.productItem}>
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
    <View style={[styles.container, style]}>
      <FlatList
        data={safeProducts}
        renderItem={renderProductItem}
        keyExtractor={(item, index) => item?.id || `product-${index}`}
        numColumns={COLUMN_COUNT}
        key={COLUMN_COUNT}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={true}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  productItem: {
    width: ITEM_WIDTH,
    margin: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    position: 'relative',
  },
  imageContainer: {
    width: '100%',
    height: ITEM_WIDTH * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  productImage: {
    width: '75%',
    height: '75%',
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
    marginBottom: 7,
  },
  productName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
    lineHeight: 14,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  discountText: {
    fontSize: 9,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 1,
  },
  addButton: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 8,
  },
});