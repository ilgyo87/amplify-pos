import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SyncConflicts } from '../../database/services/sync/SyncCoordinator';
import { syncService } from '../../database/services/syncService';

interface SyncConflictModalProps {
  visible: boolean;
  conflicts: SyncConflicts;
  onClose: () => void;
  onResolve: () => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({
  visible,
  conflicts,
  onClose,
  onResolve,
}) => {
  const [categoryResolutions, setCategoryResolutions] = useState<
    Record<string, 'keep-local' | 'keep-cloud'>
  >({});
  const [productResolutions, setProductResolutions] = useState<
    Record<string, 'keep-local' | 'keep-cloud'>
  >({});

  const handleResolveAll = async () => {
    Alert.alert(
      'Resolve Conflicts',
      'Are you sure you want to apply these resolutions? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          style: 'destructive',
          onPress: async () => {
            try {
              const categoryResArray = Object.entries(categoryResolutions).map(
                ([categoryId, resolution]) => ({ categoryId, resolution })
              );
              const productResArray = Object.entries(productResolutions).map(
                ([productId, resolution]) => ({ productId, resolution })
              );

              await syncService.resolveConflicts(categoryResArray, productResArray);
              Alert.alert('Success', 'Conflicts resolved successfully');
              onResolve();
            } catch (error) {
              Alert.alert('Error', 'Failed to resolve conflicts');
              console.error('Failed to resolve conflicts:', error);
            }
          },
        },
      ]
    );
  };

  const selectAllCloud = () => {
    const newCategoryRes: Record<string, 'keep-cloud'> = {};
    conflicts.categories.forEach((c) => {
      newCategoryRes[c.localCategory.id] = 'keep-cloud';
    });
    setCategoryResolutions(newCategoryRes);

    const newProductRes: Record<string, 'keep-cloud'> = {};
    conflicts.products.forEach((p) => {
      newProductRes[p.localProduct.id] = 'keep-cloud';
    });
    setProductResolutions(newProductRes);
  };

  const selectAllLocal = () => {
    const newCategoryRes: Record<string, 'keep-local'> = {};
    conflicts.categories.forEach((c) => {
      newCategoryRes[c.localCategory.id] = 'keep-local';
    });
    setCategoryResolutions(newCategoryRes);

    const newProductRes: Record<string, 'keep-local'> = {};
    conflicts.products.forEach((p) => {
      newProductRes[p.localProduct.id] = 'keep-local';
    });
    setProductResolutions(newProductRes);
  };

  const totalConflicts = conflicts.categories.length + conflicts.products.length;
  const resolvedCount =
    Object.keys(categoryResolutions).length + Object.keys(productResolutions).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sync Conflicts Found</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            We found {totalConflicts} item{totalConflicts !== 1 ? 's' : ''} that exist
            both locally and in the cloud. Choose which version to keep.
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickButton} onPress={selectAllCloud}>
              <Ionicons name="cloud" size={20} color="#007AFF" />
              <Text style={styles.quickButtonText}>Keep All Cloud</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickButton} onPress={selectAllLocal}>
              <Ionicons name="phone-portrait" size={20} color="#007AFF" />
              <Text style={styles.quickButtonText}>Keep All Local</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.conflictList} showsVerticalScrollIndicator={true}>
          {conflicts.categories.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              {conflicts.categories.map((conflict) => (
                <View key={conflict.localCategory.id} style={styles.conflictItem}>
                  <View style={styles.conflictInfo}>
                    <Text style={styles.itemName}>{conflict.localCategory.name}</Text>
                    <Text style={styles.itemType}>
                      {conflict.type === 'version' ? 'Version Conflict' : 'Category'}
                    </Text>
                    {conflict.type === 'version' && (
                      <View style={styles.versionInfo}>
                        <Text style={styles.versionText}>
                          Local: v{conflict.localCategory.version || 1} • {formatDate(conflict.localCategory.updatedAt)}
                        </Text>
                        <Text style={styles.versionText}>
                          Cloud: v{conflict.cloudCategory.version || 1} • {formatDate(conflict.cloudCategory.updatedAt || '')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.resolutionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        categoryResolutions[conflict.localCategory.id] === 'keep-local' &&
                          styles.selectedButton,
                      ]}
                      onPress={() =>
                        setCategoryResolutions({
                          ...categoryResolutions,
                          [conflict.localCategory.id]: 'keep-local',
                        })
                      }
                    >
                      <Ionicons
                        name="phone-portrait"
                        size={16}
                        color={
                          categoryResolutions[conflict.localCategory.id] === 'keep-local'
                            ? '#fff'
                            : '#007AFF'
                        }
                      />
                      <Text
                        style={[
                          styles.resolutionButtonText,
                          categoryResolutions[conflict.localCategory.id] ===
                            'keep-local' && styles.selectedButtonText,
                        ]}
                      >
                        Local
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        categoryResolutions[conflict.localCategory.id] === 'keep-cloud' &&
                          styles.selectedButton,
                      ]}
                      onPress={() =>
                        setCategoryResolutions({
                          ...categoryResolutions,
                          [conflict.localCategory.id]: 'keep-cloud',
                        })
                      }
                    >
                      <Ionicons
                        name="cloud"
                        size={16}
                        color={
                          categoryResolutions[conflict.localCategory.id] === 'keep-cloud'
                            ? '#fff'
                            : '#007AFF'
                        }
                      />
                      <Text
                        style={[
                          styles.resolutionButtonText,
                          categoryResolutions[conflict.localCategory.id] ===
                            'keep-cloud' && styles.selectedButtonText,
                        ]}
                      >
                        Cloud
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {conflicts.products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Products</Text>
              {conflicts.products.map((conflict) => (
                <View key={conflict.localProduct.id} style={styles.conflictItem}>
                  <View style={styles.conflictInfo}>
                    <Text style={styles.itemName}>{conflict.localProduct.name}</Text>
                    <Text style={styles.itemType}>
                      {conflict.type === 'version' ? 'Version Conflict' : `$${conflict.localProduct.price.toFixed(2)}`}
                    </Text>
                    {conflict.type === 'version' && (
                      <View style={styles.versionInfo}>
                        <Text style={styles.versionText}>
                          Local: v{conflict.localProduct.version || 1} • ${conflict.localProduct.price.toFixed(2)} • {formatDate(conflict.localProduct.updatedAt)}
                        </Text>
                        <Text style={styles.versionText}>
                          Cloud: v{conflict.cloudProduct.version || 1} • ${(conflict.cloudProduct.price || 0).toFixed(2)} • {formatDate(conflict.cloudProduct.updatedAt || '')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.resolutionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        productResolutions[conflict.localProduct.id] === 'keep-local' &&
                          styles.selectedButton,
                      ]}
                      onPress={() =>
                        setProductResolutions({
                          ...productResolutions,
                          [conflict.localProduct.id]: 'keep-local',
                        })
                      }
                    >
                      <Ionicons
                        name="phone-portrait"
                        size={16}
                        color={
                          productResolutions[conflict.localProduct.id] === 'keep-local'
                            ? '#fff'
                            : '#007AFF'
                        }
                      />
                      <Text
                        style={[
                          styles.resolutionButtonText,
                          productResolutions[conflict.localProduct.id] ===
                            'keep-local' && styles.selectedButtonText,
                        ]}
                      >
                        Local
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.resolutionButton,
                        productResolutions[conflict.localProduct.id] === 'keep-cloud' &&
                          styles.selectedButton,
                      ]}
                      onPress={() =>
                        setProductResolutions({
                          ...productResolutions,
                          [conflict.localProduct.id]: 'keep-cloud',
                        })
                      }
                    >
                      <Ionicons
                        name="cloud"
                        size={16}
                        color={
                          productResolutions[conflict.localProduct.id] === 'keep-cloud'
                            ? '#fff'
                            : '#007AFF'
                        }
                      />
                      <Text
                        style={[
                          styles.resolutionButtonText,
                          productResolutions[conflict.localProduct.id] ===
                            'keep-cloud' && styles.selectedButtonText,
                        ]}
                      >
                        Cloud
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {resolvedCount} of {totalConflicts} resolved
          </Text>
          <TouchableOpacity
            style={[
              styles.resolveButton,
              resolvedCount < totalConflicts && styles.disabledButton,
            ]}
            onPress={handleResolveAll}
            disabled={resolvedCount < totalConflicts}
          >
            <Text style={styles.resolveButtonText}>Apply Resolutions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  infoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  quickButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  conflictList: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  conflictInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 14,
    color: '#666',
  },
  resolutionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  resolutionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#fff',
  },
  selectedButton: {
    backgroundColor: '#007AFF',
  },
  resolutionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedButtonText: {
    color: '#fff',
  },
  versionInfo: {
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  resolveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  resolveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});