import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CategoryDocument } from '../../database/schemas/category';

interface CategoryListProps {
  categories: CategoryDocument[];
  onEdit: (category: CategoryDocument) => void;
  onDelete: (category: CategoryDocument) => void;
  onSelect?: (category: CategoryDocument) => void;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage?: string;
  showActions?: boolean;
  selectedCategoryId?: string;
}

interface CategoryItemProps {
  category: CategoryDocument;
  onEdit: (category: CategoryDocument) => void;
  onDelete: (category: CategoryDocument) => void;
  onSelect?: (category: CategoryDocument) => void;
  showActions: boolean;
  isSelected: boolean;
}

function CategoryItem({ 
  category, 
  onEdit, 
  onDelete, 
  onSelect,
  showActions,
  isSelected
}: CategoryItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(category),
        },
      ]
    );
  };

  const handlePress = () => {
    if (onSelect) {
      onSelect(category);
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.categoryItem,
        isSelected && styles.categoryItemSelected
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.categoryContent}>
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
            <View style={styles.categoryTextContainer}>
              <Text style={[
                styles.categoryName,
                isSelected && styles.categoryNameSelected
              ]}>
                {category.name}
              </Text>
              {category.description && (
                <Text style={[
                  styles.categoryDescription,
                  isSelected && styles.categoryDescriptionSelected
                ]} numberOfLines={2}>
                  {category.description}
                </Text>
              )}
            </View>
          </View>
          
          {category.isLocalOnly && (
            <View style={styles.localBadge}>
              <Text style={styles.localBadgeText}>Local</Text>
            </View>
          )}
        </View>
      </View>

      {showActions && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => onEdit(category)}
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
}

export function CategoryList({
  categories,
  onEdit,
  onDelete,
  onSelect,
  loading = false,
  refreshing = false,
  onRefresh,
  emptyMessage = 'No categories found',
  showActions = true,
  selectedCategoryId
}: CategoryListProps) {
  const renderCategory = ({ item }: { item: CategoryDocument }) => (
    <CategoryItem
      category={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onSelect={onSelect}
      showActions={showActions}
      isSelected={selectedCategoryId === item.id}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="grid-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{emptyMessage}</Text>
      <Text style={styles.emptySubtext}>
        {categories.length === 0 
          ? 'Create your first category to organize products'
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

  if (loading && categories.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={categories}
      renderItem={renderCategory}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={categories.length === 0 ? styles.emptyListContainer : undefined}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
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
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryItemSelected: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  categoryContent: {
    flex: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  categoryNameSelected: {
    color: '#007AFF',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  categoryDescriptionSelected: {
    color: '#0056b3',
  },
  localBadge: {
    backgroundColor: '#e8f4f8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  localBadgeText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  actions: {
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