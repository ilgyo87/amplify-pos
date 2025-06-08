import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { CategoryDocument } from '../../database/schemas/category';

interface ServiceTabBarProps {
  categories: CategoryDocument[];
  selectedCategory: CategoryDocument | null;
  onSelectCategory: (category: CategoryDocument | null) => void;
  isLoading?: boolean;
  style?: any;
}

export const ServiceTabBar: React.FC<ServiceTabBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isLoading = false,
  style
}) => {
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading categories...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Categories Tab */}
        <TouchableOpacity
          style={[
            styles.tab,
            !selectedCategory && styles.activeTab
          ]}
          onPress={() => onSelectCategory(null)}
        >
          <Text style={[
            styles.tabText,
            !selectedCategory && styles.activeTabText
          ]}>
            All Services
          </Text>
        </TouchableOpacity>

        {/* Individual Category Tabs */}
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.tab,
              selectedCategory?.id === category.id && styles.activeTab,
              { borderColor: category.color }
            ]}
            onPress={() => onSelectCategory(category)}
          >
            <View style={[styles.categoryIndicator, { backgroundColor: category.color }]} />
            <Text style={[
              styles.tabText,
              selectedCategory?.id === category.id && styles.activeTabText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    minWidth: 100,
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: 'white',
    fontWeight: '600',
  },
});