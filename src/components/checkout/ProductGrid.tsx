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
  currentPage?: number;
  onChangePage?: (page: number) => void;
  itemsPerPage?: number;
  style?: any;
}

const { width } = Dimensions.get('window');
const COLUMN_COUNT = width > 768 ? 4 : 3;
// Reduce item width by 15%
const ITEM_WIDTH = ((width - 80) / COLUMN_COUNT) * 0.85;

export function ProductGrid(props: ProductGridProps) {
  const {
    products = [],
    onSelectProduct,
    isLoading = false,
    currentPage = 0,
    onChangePage,
    itemsPerPage = 12,
    style
  } = props;
  
  // Safety checks for undefined/null values
  const safeProducts = Array.isArray(products) ? products : [];
  const safeCurrentPage = Number(currentPage) || 0;
  const safeItemsPerPage = Number(itemsPerPage) || 12;
  
  const totalPages = Math.ceil(safeProducts.length / safeItemsPerPage);
  const startIndex = safeCurrentPage * safeItemsPerPage;
  const endIndex = startIndex + safeItemsPerPage;
  const displayedProducts = safeProducts.slice(startIndex, endIndex);

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

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageButton, safeCurrentPage === 0 && styles.disabledButton]}
          onPress={() => onChangePage && onChangePage(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 0}
        >
          <Ionicons name="chevron-back" size={20} color={safeCurrentPage === 0 ? '#ccc' : '#007AFF'} />
        </TouchableOpacity>
        
        <View style={styles.pageInfo}>
          <Text style={styles.pageText}>
            Page {(safeCurrentPage + 1)} of {totalPages || 1}
          </Text>
          <Text style={styles.itemCountText}>
            {safeProducts.length} items
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.pageButton, safeCurrentPage === totalPages - 1 && styles.disabledButton]}
          onPress={() => onChangePage && onChangePage(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages - 1}
        >
          <Ionicons name="chevron-forward" size={20} color={safeCurrentPage === totalPages - 1 ? '#ccc' : '#007AFF'} />
        </TouchableOpacity>
      </View>
    );
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
        data={displayedProducts}
        renderItem={renderProductItem}
        keyExtractor={(item, index) => item?.id || `product-${index}`}
        numColumns={COLUMN_COUNT}
        key={COLUMN_COUNT}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
      {renderPagination()}
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
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemCountText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});