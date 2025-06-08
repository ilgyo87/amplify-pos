import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProductDocument } from '../../database/schemas/product';
import { ImageDisplay } from '../ui/ImagePicker';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 80) / 4; // 4 columns with padding

interface ProductListProps {
  products: ProductDocument[];
  onEdit: (product: ProductDocument) => void;
  onDelete: (product: ProductDocument) => void;
  onSelect?: (product: ProductDocument) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
  showActions?: boolean;
  viewMode?: 'grid' | 'list';
  selectedProductId?: string;
  calculateFinalPrice?: (product: ProductDocument) => number;
}

interface ProductItemProps {
  product: ProductDocument;
  onEdit: (product: ProductDocument) => void;
  onDelete: (product: ProductDocument) => void;
  onSelect?: (product: ProductDocument) => void;
  showActions: boolean;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  calculateFinalPrice?: (product: ProductDocument) => number;
}

const ProductItem: React.FC<ProductItemProps> = ({ 
  product, 
  onEdit, 
  onDelete, 
  onSelect,
  showActions,
  viewMode,
  isSelected,
  calculateFinalPrice
}) => {
  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(product),
        },
      ]
    );
  };

  const handlePress = () => {
    if (onSelect) {
      onSelect(product);
    }
  };

  const finalPrice = calculateFinalPrice ? calculateFinalPrice(product) : product.price;
  const hasDiscount = product.discount && product.discount > 0;
  const hasAdditionalPrice = product.additionalPrice && product.additionalPrice > 0;

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity 
        style={[
          styles.gridItem,
          isSelected && styles.gridItemSelected
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <ImageDisplay 
            imageKey={product.imageName}
            size={80}
            style={styles.productImage}
            showPlaceholder={true}
          />
          
          {product.isLocalOnly && (
            <View style={styles.localBadgeGrid}>
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          )}

          {showActions && (
            <View style={styles.gridActions}>
              <TouchableOpacity
                onPress={() => onEdit(product)}
                style={[styles.gridActionButton, styles.editButton]}
              >
                <Ionicons name="pencil" size={12} color="#007AFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.gridActionButton, styles.deleteButton]}
              >
                <Ionicons name="trash" size={12} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.gridContent}>
          <Text style={[
            styles.gridProductName,
            isSelected && styles.productNameSelected
          ]} numberOfLines={2}>
            {product.name}
          </Text>
          
          <View style={styles.priceContainer}>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatPrice(product.price)}
              </Text>
            )}
            <Text style={[
              styles.finalPrice,
              isSelected && styles.finalPriceSelected
            ]}>
              {formatPrice(finalPrice)}
            </Text>
            {hasDiscount && (
              <Text style={styles.discountBadge}>
                -{product.discount}%
              </Text>
            )}
          </View>

          {hasAdditionalPrice && (
            <Text style={styles.additionalPriceText}>
              +{formatPrice(product.additionalPrice!)} extra
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // List view
  return (
    <TouchableOpacity 
      style={[
        styles.listItem,
        isSelected && styles.listItemSelected
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.listImageContainer}>
        <ImageDisplay 
          imageKey={product.imageName}
          size={60}
          style={styles.listProductImage}
          showPlaceholder={true}
        />
      </View>

      <View style={styles.listContent}>
        <View style={styles.listHeader}>
          <Text style={[
            styles.listProductName,
            isSelected && styles.productNameSelected
          ]}>
            {product.name}
          </Text>
          {product.isLocalOnly && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          )}
        </View>

        {product.description && (
          <Text style={styles.productDescription} numberOfLines={2}>
            {product.description}
          </Text>
        )}

        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            {hasDiscount && (
              <Text style={styles.originalPrice}>
                {formatPrice(product.price)}
              </Text>
            )}
            <Text style={[
              styles.finalPrice,
              isSelected && styles.finalPriceSelected
            ]}>
              {formatPrice(finalPrice)}
            </Text>
            {hasDiscount && (
              <Text style={styles.discountBadge}>
                -{product.discount}%
              </Text>
            )}
          </View>

          {hasAdditionalPrice && (
            <Text style={styles.additionalPriceText}>
              +{formatPrice(product.additionalPrice!)} extra
            </Text>
          )}
        </View>
      </View>

      {showActions && (
        <View style={styles.listActions}>
          <TouchableOpacity
            onPress={() => onEdit(product)}
            style={[styles.actionButton, styles.editButton]}
          >
            <Ionicons name="pencil" size={18} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.actionButton, styles.deleteButton]}
          >
            <Ionicons name="trash" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onEdit,
  onDelete,
  onSelect,
  loading = false,
  refreshing = false,
  onRefresh,
  emptyMessage = 'No products found',
  showActions = true,
  viewMode = 'grid',
  selectedProductId,
  calculateFinalPrice
}) => {
  const renderProduct = ({ item }: { item: ProductDocument }) => (
    <ProductItem
      product={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onSelect={onSelect}
      showActions={showActions}
      viewMode={viewMode}
      isSelected={selectedProductId === item.id}
      calculateFinalPrice={calculateFinalPrice}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
      <Text style={styles.emptySubtext}>
        {products.length === 0 
          ? 'Add your first product to get started'
          : 'Try adjusting your search criteria'
        }
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  };

  if (loading && products.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={products}
      renderItem={renderProduct}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={products.length === 0 ? styles.emptyListContainer : styles.contentContainer}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      numColumns={viewMode === 'grid' ? 4 : 1}
      key={viewMode} // Force re-render when view mode changes
      columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
      ItemSeparatorComponent={viewMode === 'list' ? () => <View style={styles.separator} /> : undefined}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  // Grid styles
  gridItem: {
    width: ITEM_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  gridItemSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  imageContainer: {
    position: 'relative',
    height: 80,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localBadgeGrid: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  localBadgeText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: '500',
  },
  gridActions: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 2,
  },
  gridActionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  gridContent: {
    padding: 8,
  },
  gridProductName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 14,
  },
  // List styles
  listItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  listItemSelected: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  listImageContainer: {
    marginRight: 12,
  },
  listProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  listPlaceholderImage: {
    width: 60,
    height: 60,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  listProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  productNameSelected: {
    color: '#007AFF',
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 10,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  finalPriceSelected: {
    color: '#007AFF',
  },
  discountBadge: {
    fontSize: 9,
    color: '#e74c3c',
    fontWeight: '600',
    backgroundColor: '#fdf2f2',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  additionalPriceText: {
    fontSize: 9,
    color: '#666',
    fontStyle: 'italic',
  },
  localBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  listActions: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    backgroundColor: '#f9f9f9',
  },
  editButton: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  deleteButton: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdf2f2',
  },
  separator: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});