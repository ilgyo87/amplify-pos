import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { BaseScreen } from '../BaseScreen';
import { CategoryList } from '../../components/categories/CategoryList';
import { CreateCategoryButton } from '../../components/categories/CreateCategoryButton';
import { ProductList } from '../../components/products/ProductList';
import { CreateProductButton } from '../../components/products/CreateProductButton';
import { AddDefaultDataButton } from '../../components/products/AddDefaultDataButton';
import { ProductForm } from '../../components/forms/ProductForm';
import { CategoryForm } from '../../components/forms/CategoryForm';
import { useCategories } from '../../database/hooks/useCategories';
import { useProducts } from '../../database/hooks/useProducts';
import { CategoryDocument } from '../../database/schemas/category';
import { ProductDocument } from '../../database/schemas/product';
import { validateCategoryForm, CategoryFormData } from '../../utils/categoryValidation';
import { validateProductForm, ProductFormData } from '../../utils/productValidation';

export default function ProductsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryDocument | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDocument | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductDocument | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const {
    products,
    loading: productsLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  } = useProducts(selectedCategory?.id);




  const handleCategoryClick = (category: CategoryDocument) => {
    // Toggle selection: if already selected, deselect by setting to null
    if (selectedCategory?.id === category.id) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(category);
    }
  };

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: CategoryDocument) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: ProductDocument) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleCategorySubmit = async (formData: CategoryFormData) => {
    try {
      if (editingCategory) {
        const result = await updateCategory(editingCategory.id, formData);
        if (result.category && !result.errors) {
          setShowCategoryForm(false);
          setEditingCategory(null);
        }
        return result;
      } else {
        const result = await createCategory(formData);
        if (result.category && !result.errors) {
          setShowCategoryForm(false);
        }
        return result;
      }
    } catch (error) {
      return {
        errors: { name: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  };

  const handleProductSubmit = async (formData: ProductFormData) => {
    try {
      // Ensure price is a number
      const processedData = {
        ...formData,
        price: Number(formData.price),
        discount: formData.discount ? Number(formData.discount) : undefined,
        additionalPrice: formData.additionalPrice ? Number(formData.additionalPrice) : undefined,
      };

      if (editingProduct) {
        const result = await updateProduct(editingProduct.id, processedData);
        if (result.product && !result.errors) {
          setShowProductForm(false);
          setEditingProduct(null);
        }
        return result;
      } else {
        const result = await createProduct(processedData);
        if (result.product && !result.errors) {
          setShowProductForm(false);
        }
        return result;
      }
    } catch (error) {
      return {
        errors: { name: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  };

  const handleDeleteCategory = async (category: CategoryDocument) => {
    return await deleteCategory(category.id);
  };

  const handleDeleteProduct = async (product: ProductDocument) => {
    return await deleteProduct(product.id);
  };

  return (
    <BaseScreen title="Products & Categories">
      <View style={styles.container}>
        {/* Categories Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoryActions}>
              <AddDefaultDataButton 
                onDataAdded={() => {
                  // Refresh both categories and products when default data is added
                  refreshProducts();
                }}
                style={styles.defaultDataButton}
              />
              <CreateCategoryButton onPress={handleCreateCategory} />
            </View>
          </View>
          <View style={styles.categoryContainer}>
            <CategoryList
              categories={categories}
              selectedCategoryId={selectedCategory?.id}
              onSelect={handleCategoryClick}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              loading={categoriesLoading}
            />
          </View>
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Products {selectedCategory && `- ${selectedCategory.name}`}
            </Text>
            <View style={styles.productActions}>
              <TouchableOpacity 
                style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('grid')}
              >
                <Text style={[styles.viewModeText, viewMode === 'grid' && styles.viewModeTextActive]}>Grid</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>List</Text>
              </TouchableOpacity>
              <CreateProductButton onPress={handleCreateProduct} />
            </View>
          </View>
          <View style={styles.productContainer}>
            <ProductList
              products={products}
              viewMode={viewMode}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onRefresh={refreshProducts}
              loading={productsLoading}
            />
          </View>
        </View>

        {/* Category Form Modal */}
        {showCategoryForm && (
          <CategoryForm
            title={editingCategory ? 'Edit Category' : 'Create Category'}
            initialData={editingCategory ? {
              name: editingCategory.name,
              description: editingCategory.description,
              color: editingCategory.color
            } : undefined}
            onSubmit={handleCategorySubmit}
            onCancel={() => {
              setShowCategoryForm(false);
              setEditingCategory(null);
            }}
            submitButtonText={editingCategory ? 'Update Category' : 'Create Category'}
          />
        )}

        {/* Product Form Modal */}
        {showProductForm && (
          <ProductForm
            title={editingProduct ? 'Edit Product' : 'Create Product'}
            categories={categories}
            initialData={editingProduct ? {
              name: editingProduct.name,
              description: editingProduct.description,
              price: editingProduct.price,
              categoryId: editingProduct.categoryId,
              imageName: editingProduct.imageName,
              discount: editingProduct.discount,
              additionalPrice: editingProduct.additionalPrice,
              notes: editingProduct.notes
            } : {
              categoryId: selectedCategory?.id || ''
            }}
            onSubmit={handleProductSubmit}
            onCancel={() => {
              setShowProductForm(false);
              setEditingProduct(null);
            }}
            submitButtonText={editingProduct ? 'Update Product' : 'Create Product'}
          />
        )}
      </View>
    </BaseScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  categoryContainer: {
    maxHeight: 200,
  },
  productContainer: {
    flex: 1,
    minHeight: 400,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defaultDataButton: {
    // Inherit styles from AddDefaultDataButton component
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  viewModeButtonActive: {
    backgroundColor: '#007AFF',
  },
  viewModeText: {
    fontSize: 14,
    color: '#007AFF',
  },
  viewModeTextActive: {
    color: 'white',
  },
});
