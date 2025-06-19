import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Alert, Modal, SafeAreaView } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';
import { QRCode } from '../../utils/qrUtils';
import { captureRef } from 'react-native-view-shot';
import { generateLabelHTML, printLabel } from '../../utils/printUtils';

// Styles need to be defined before the component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Top navigation styles
  topNavContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navButton: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  navButtonActive: {
    borderBottomColor: '#007AFF',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  navButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Category tab styles
  categoryTabsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  categoryTabActive: {
    backgroundColor: '#007AFF',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTabTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  
  // Content container
  contentContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  productContainer: {
    flex: 1,
    minHeight: 400,
  },
  
  // View mode controls
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    gap: 8,
  },
  viewModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
  
  // Rack Label Styles
  createRackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
  },
  createRackButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  rackInfo: {
    padding: 16,
  },
  rackInfoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // Rack Modal Styles
  rackModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  rackModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rackCloseButton: {
    padding: 8,
  },
  rackModalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  rackModalContent: {
    flex: 1,
    padding: 16,
  },
  
  // Input Styles
  rackInputSection: {
    marginBottom: 24,
  },
  rackInputGroup: {
    marginBottom: 16,
  },
  rackInputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  rackInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  
  // Preview Styles
  rackPreviewSection: {
    marginBottom: 24,
  },
  rackPreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  rackPreviewScrollView: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  rackPreviewScrollContent: {
    padding: 16,
  },
  rackPreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  rackPreviewItem: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  rackPreviewQR: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    marginBottom: 8,
  },
  rackPreviewText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  rackPreviewMore: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    minWidth: 80,
  },
  rackPreviewMoreText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  
  // Print Button Styles
  rackPrintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  rackPrintButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Separate component for rack preview items to avoid hooks issues
const RackPreviewItem = ({ 
  label, 
  qrRefs 
}: { 
  label: { id: string; rackCode: string; number: number };
  qrRefs: React.MutableRefObject<{[key: string]: React.RefObject<View | null>}>;
}) => {
  const qrRef = useRef<View>(null);
  qrRefs.current[label.id] = qrRef;
  
  return (
    <View style={styles.rackPreviewItem}>
      <View ref={qrRef} style={styles.rackPreviewQR} collapsable={false}>
        <QRCode
          value={label.rackCode}
          size={60}
          color="#000000"
          backgroundColor="#FFFFFF"
        />
      </View>
      <Text style={styles.rackPreviewText}>{label.rackCode}</Text>
    </View>
  );
};

export default function ProductsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryDocument | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDocument | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductDocument | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Rack label states
  const [rackPrefix, setRackPrefix] = useState('R');
  const [numberOfLabels, setNumberOfLabels] = useState('10');
  const [startingNumber, setStartingNumber] = useState('1');
  const qrRefs = useRef<{[key: string]: React.RefObject<View | null>}>({});

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

  // Rack label functions
  const generateRackLabels = () => {
    const labels: { id: string; rackCode: string; number: number }[] = [];
    const numLabels = parseInt(numberOfLabels);
    const startNum = parseInt(startingNumber);
    
    if (isNaN(numLabels) || isNaN(startNum) || numLabels <= 0 || startNum < 0) {
      Alert.alert('Invalid Input', 'Please enter valid numbers for quantity and starting number.');
      return [];
    }
    
    if (numLabels > 100) {
      Alert.alert('Too Many Labels', 'Maximum 100 labels can be generated at once.');
      return [];
    }
    
    for (let i = 0; i < numLabels; i++) {
      const rackNumber = startNum + i;
      const rackCode = `${rackPrefix}${rackNumber.toString().padStart(3, '0')}`;
      labels.push({
        id: `rack-${i}`,
        rackCode,
        number: rackNumber
      });
    }
    
    return labels;
  };

  const printRackLabels = async () => {
    const labels = generateRackLabels();
    if (labels.length === 0) return;

    try {
      console.log(`🖨️ Starting to print ${labels.length} rack labels...`);
      
      // Capture QR codes from ALL preview refs (now that all are rendered)
      console.log(`📷 Capturing QR codes from ${labels.length} preview components...`);
      
      // Generate HTML for each label and combine
      let combinedHTML = '';
      
      for (let i = 0; i < labels.length; i++) {
        const label = labels[i];
        
        let qrImageBase64 = label.rackCode; // Default fallback
        
        // Try to capture QR code from preview refs (all labels now have refs)
        const qrRef = qrRefs.current[label.id];
        if (qrRef?.current) {
          try {
            const capturedBase64 = await captureRef(qrRef.current, {
              format: 'png',
              quality: 1,
              result: 'base64',
              width: 100,
              height: 100,
            });
            
            if (capturedBase64.length > 1000) {
              qrImageBase64 = capturedBase64;
              console.log(`📷 Captured QR for ${label.rackCode} from preview`);
            } else {
              console.warn(`⚠️ Captured QR for ${label.rackCode} seems invalid, using fallback`);
            }
          } catch (captureError) {
            console.warn('QR capture failed for', label.id, ':', captureError);
          }
        } else {
          console.warn('No QR ref found for', label.rackCode);
        }
        
        // Generate simple rack label HTML - only rack number
        let imageUri: string;
        if (qrImageBase64.startsWith('data:image/')) {
          imageUri = qrImageBase64;
        } else if (qrImageBase64.length > 1000) {
          imageUri = `data:image/png;base64,${qrImageBase64}`;
        } else {
          // Fallback to simple QR placeholder
          imageUri = `data:image/svg+xml;base64,${btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
              <rect width="100" height="100" fill="white" stroke="black" stroke-width="2"/>
              <text x="50" y="50" text-anchor="middle" font-family="monospace" font-size="8" font-weight="bold" fill="black">${label.rackCode}</text>
            </svg>
          `)}`;
        }
        
        const labelHTML = `
          <div class="label-container">
            <div class="qr-container">
              <img src="${imageUri}" alt="QR Code" class="qr-code" />
            </div>
            <div class="rack-info">
              <div class="rack-number">${label.rackCode}</div>
            </div>
          </div>`;
        
        // Add page break after each label except the last one
        combinedHTML += labelHTML;
        if (i < labels.length - 1) {
          combinedHTML += '<div style="page-break-after: always;"></div>';
        }
      }
      
      console.log(`📋 Generated combined HTML for ${labels.length} rack labels`);
      
      // Create custom print HTML with rack-specific styles
      const rackPrintHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @page {
                size: 29mm 90mm;
                margin: 0;
                padding: 0;
              }
              body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                font-family: Arial, sans-serif;
                font-size: 9px;
              }
              .label-container {
                width: 29mm;
                height: 90mm;
                padding: 2mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                page-break-after: always;
                page-break-inside: avoid;
              }
              .qr-container {
                width: 100%;
                height: 45mm;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 2mm;
              }
              .qr-code {
                max-width: 100%;
                max-height: 100%;
                object-fit: contain;
              }
              .rack-info {
                width: 100%;
                height: 40mm;
                writing-mode: vertical-rl;
                text-orientation: mixed;
                transform: rotate(180deg);
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .rack-number {
                font-weight: bold;
                font-size: 16px;
                color: black;
                text-align: center;
              }
            </style>
          </head>
          <body>
            ${combinedHTML}
          </body>
        </html>
      `;
      
      // Print using direct expo print
      const Print = await import('expo-print');
      const result = await Print.printAsync({
        html: rackPrintHTML,
        width: 29 * 2.83465, // 29mm in points
        height: 90 * 2.83465, // 90mm in points
      });
      
      console.log(`✅ Successfully printed ${labels.length} rack labels`);
      Alert.alert('Success', `${labels.length} rack label${labels.length > 1 ? 's' : ''} printed successfully.`);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCancellation = errorMessage.includes('Printing did not complete') || 
                            errorMessage.includes('cancelled') || 
                            errorMessage.includes('canceled') ||
                            errorMessage.includes('user cancelled') ||
                            errorMessage.includes('user canceled');
      
      if (isCancellation) {
        console.log('ℹ️ Rack label print cancelled by user:', errorMessage);
        return;
      } else {
        console.error('❌ Rack label print error:', error);
        Alert.alert('Print Error', 'Failed to print rack labels. Please try again.');
      }
    }
  };

  // State for top navigation
  const [activeSection, setActiveSection] = useState('products');

  // Render the top navigation
  const renderTopNav = () => (
    <View style={styles.topNavContainer}>
      <TouchableOpacity 
        style={[styles.navButton, activeSection === 'categories' && styles.navButtonActive]}
        onPress={() => setActiveSection('categories')}
      >
        <Text style={[styles.navButtonText, activeSection === 'categories' && styles.navButtonTextActive]}>Categories</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, activeSection === 'products' && styles.navButtonActive]}
        onPress={() => setActiveSection('products')}
      >
        <Text style={[styles.navButtonText, activeSection === 'products' && styles.navButtonTextActive]}>Products</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, activeSection === 'racks' && styles.navButtonActive]}
        onPress={() => setActiveSection('racks')}
      >
        <Text style={[styles.navButtonText, activeSection === 'racks' && styles.navButtonTextActive]}>Rack Labels</Text>
      </TouchableOpacity>
    </View>
  );

  // Render category tabs
  const renderCategoryTabs = () => (
    <View style={styles.categoryTabsContainer}>
      <View style={styles.categoryTabs}>
        {/* All categories option */}
        <TouchableOpacity 
          style={[styles.categoryTab, selectedCategory === null && styles.categoryTabActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryTabText, selectedCategory === null && styles.categoryTabTextActive]}>All</Text>
        </TouchableOpacity>
        
        {/* Category tabs */}
        {categories.map(category => (
          <TouchableOpacity 
            key={category.id}
            style={[styles.categoryTab, selectedCategory?.id === category.id && styles.categoryTabActive]}
            onPress={() => handleCategoryClick(category)}
          >
            <Text style={[styles.categoryTabText, selectedCategory?.id === category.id && styles.categoryTabTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {(categories.length === 0 || products.length === 0) && (
        <View style={styles.categoryActions}>
          <AddDefaultDataButton 
            onDataAdded={() => {
              refreshProducts();
            }}
          />
        </View>
      )}
    </View>
  );

  // View mode controls 
  const renderViewModeControls = () => (
    <View style={styles.viewModeContainer}>
      <TouchableOpacity 
        style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
        onPress={() => setViewMode('grid')}
      >
        <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? 'white' : '#007AFF'} />
        <Text style={[styles.viewModeText, viewMode === 'grid' && styles.viewModeTextActive]}>Grid View</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
        onPress={() => setViewMode('list')}
      >
        <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? 'white' : '#007AFF'} />
        <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>List View</Text>
      </TouchableOpacity>
    </View>
  );

  // Render content based on active section
  const renderContent = () => {
    switch(activeSection) {
      case 'categories':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>All Categories</Text>
              <CreateCategoryButton onPress={handleCreateCategory} />
            </View>
            <CategoryList
              categories={categories}
              selectedCategoryId={undefined}
              onSelect={handleCategoryClick}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              loading={categoriesLoading}
            />
          </View>
        );
      
      case 'products':
        return (
          <>
            {renderCategoryTabs()}
            {renderViewModeControls()}
            <View style={styles.contentContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {selectedCategory ? selectedCategory.name : 'All Products'}
                </Text>
                <CreateProductButton onPress={handleCreateProduct} />
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
          </>
        );
      
      case 'racks':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rack Labels</Text>
              <TouchableOpacity 
                style={styles.rackPrintButton}
                onPress={printRackLabels}
                disabled={generateRackLabels().length === 0}
              >
                <Ionicons name="print" size={20} color="#fff" />
                <Text style={styles.rackPrintButtonText}>
                  Print {generateRackLabels().length} Label{generateRackLabels().length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Input Section */}
            <View style={styles.rackInputSection}>
              <View style={styles.rackInputGroup}>
                <Text style={styles.rackInputLabel}>Rack Prefix</Text>
                <TextInput
                  style={styles.rackInput}
                  value={rackPrefix}
                  onChangeText={setRackPrefix}
                  placeholder="R"
                  maxLength={3}
                  autoCapitalize="characters"
                />
              </View>
              
              <View style={styles.rackInputGroup}>
                <Text style={styles.rackInputLabel}>Starting Number</Text>
                <TextInput
                  style={styles.rackInput}
                  value={startingNumber}
                  onChangeText={setStartingNumber}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.rackInputGroup}>
                <Text style={styles.rackInputLabel}>Number of Labels</Text>
                <TextInput
                  style={styles.rackInput}
                  value={numberOfLabels}
                  onChangeText={setNumberOfLabels}
                  placeholder="10"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Preview Section */}
            <View style={styles.rackPreviewSection}>
              <Text style={styles.rackPreviewTitle}>Preview ({generateRackLabels().length} labels)</Text>
              <ScrollView 
                style={styles.rackPreviewScrollView}
                contentContainerStyle={styles.rackPreviewScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <View style={styles.rackPreviewContainer}>
                  {generateRackLabels().map((label, index) => (
                    <RackPreviewItem 
                      key={label.id} 
                      label={label} 
                      qrRefs={qrRefs}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <BaseScreen title="" hideHeader={true}>
      <View style={styles.container}>
        {/* Top Navigation */}
        {renderTopNav()}
        
        {/* Dynamic Content */}
        {renderContent()}

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

        {/* Rack Label Form Modal - No longer needed as it's now inline */}
      </View>
    </BaseScreen>
  );
}
