import React from 'react';
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

interface SimpleProduct {
  id: string;
  name: string;
  price: number;
  imageName?: string;
}

interface SimpleProductGridProps {
  products: SimpleProduct[];
  onSelectProduct: (product: SimpleProduct) => void;
  isLoading?: boolean;
  style?: any;
}

export function SimpleProductGrid(props: SimpleProductGridProps) {
  const { products, onSelectProduct, isLoading, style } = props;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  if (!products || products.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, style]}>
        <Ionicons name="shirt-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No products available</Text>
      </View>
    );
  }

  const renderProductItem = ({ item }: { item: SimpleProduct }) => {
    return (
      <TouchableOpacity
        style={styles.productItem}
        onPress={() => onSelectProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Ionicons name="shirt" size={32} color="#ccc" />
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            ${item.price.toFixed(2)}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <FlatList
        data={products}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
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
  gridContent: {
    padding: 16,
  },
  productItem: {
    flex: 1,
    margin: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  imageContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  productInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 4,
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});