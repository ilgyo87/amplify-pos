import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AllConflicts } from '../../database/services/sync/conflictTypes';
import { syncService } from '../../database/services/syncService';

interface EnhancedSyncConflictModalProps {
  visible: boolean;
  conflicts: AllConflicts;
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

const getItemDisplayInfo = (item: any, type: string) => {
  switch (type) {
    case 'customers':
      return {
        title: `${item.firstName} ${item.lastName}`,
        subtitle: item.email || item.phone,
        icon: 'person',
      };
    case 'orders':
      return {
        title: `Order #${item.orderNumber}`,
        subtitle: `${item.customerName} - $${item.total.toFixed(2)}`,
        icon: 'receipt',
      };
    case 'employees':
      return {
        title: `${item.firstName} ${item.lastName}`,
        subtitle: item.role || 'Employee',
        icon: 'people',
      };
    case 'businesses':
      return {
        title: item.name,
        subtitle: item.address || 'Business',
        icon: 'business',
      };
    case 'categories':
      return {
        title: item.name,
        subtitle: 'Category',
        icon: 'folder',
      };
    case 'products':
      return {
        title: item.name,
        subtitle: `$${(item.price || 0).toFixed(2)}`,
        icon: 'pricetag',
      };
    default:
      return {
        title: 'Unknown Item',
        subtitle: '',
        icon: 'help-circle',
      };
  }
};

export const EnhancedSyncConflictModal: React.FC<EnhancedSyncConflictModalProps> = ({
  visible,
  conflicts,
  onClose,
  onResolve,
}) => {
  const [resolutions, setResolutions] = useState<
    Record<string, Record<string, 'keep-local' | 'keep-cloud'>>
  >({
    customers: {},
    orders: {},
    employees: {},
    businesses: {},
    categories: {},
    products: {},
  });

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
              // TODO: Implement resolution for all entity types
              // For now, handle categories and products as before
              const categoryResArray = Object.entries(resolutions.categories).map(
                ([categoryId, resolution]) => ({ categoryId, resolution })
              );
              const productResArray = Object.entries(resolutions.products).map(
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
    const newResolutions = { ...resolutions };
    Object.keys(conflicts).forEach((entityType) => {
      newResolutions[entityType] = {};
      (conflicts as any)[entityType].forEach((conflict: any) => {
        const id = conflict.localItem?.id || conflict.localProduct?.id || conflict.localCategory?.id;
        if (id) {
          newResolutions[entityType][id] = 'keep-cloud';
        }
      });
    });
    setResolutions(newResolutions);
  };

  const selectAllLocal = () => {
    const newResolutions = { ...resolutions };
    Object.keys(conflicts).forEach((entityType) => {
      newResolutions[entityType] = {};
      (conflicts as any)[entityType].forEach((conflict: any) => {
        const id = conflict.localItem?.id || conflict.localProduct?.id || conflict.localCategory?.id;
        if (id) {
          newResolutions[entityType][id] = 'keep-local';
        }
      });
    });
    setResolutions(newResolutions);
  };

  const totalConflicts = Object.values(conflicts).reduce(
    (sum, entityConflicts) => sum + entityConflicts.length,
    0
  );
  
  const resolvedCount = Object.values(resolutions).reduce(
    (sum, entityResolutions) => sum + Object.keys(entityResolutions).length,
    0
  );

  const sections = Object.entries(conflicts)
    .filter(([_, entityConflicts]) => entityConflicts.length > 0)
    .map(([entityType, entityConflicts]) => ({
      title: entityType.charAt(0).toUpperCase() + entityType.slice(1),
      data: entityConflicts,
      entityType,
    }));

  const renderConflictItem = ({ item, section }: any) => {
    const conflict = item;
    const entityType = section.entityType;
    const localItem = conflict.localItem || conflict.localProduct || conflict.localCategory;
    const cloudItem = conflict.cloudItem || conflict.cloudProduct || conflict.cloudCategory;
    const itemId = localItem?.id;

    if (!itemId) return null;

    const localInfo = getItemDisplayInfo(localItem, entityType);
    const cloudInfo = getItemDisplayInfo(cloudItem, entityType);

    return (
      <View style={styles.conflictItem}>
        <View style={styles.conflictInfo}>
          <View style={styles.itemHeader}>
            <Ionicons name={localInfo.icon as any} size={20} color="#666" />
            <Text style={styles.itemName}>{localInfo.title}</Text>
          </View>
          <Text style={styles.itemType}>
            {conflict.type === 'version' ? 'Version Conflict' : localInfo.subtitle}
          </Text>
          {conflict.type === 'version' && (
            <View style={styles.versionInfo}>
              <Text style={styles.versionText}>
                Local: v{localItem.version || 1} • {formatDate(localItem.updatedAt)}
              </Text>
              <Text style={styles.versionText}>
                Cloud: v{cloudItem.version || 1} • {formatDate(cloudItem.updatedAt || '')}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.resolutionButtons}>
          <TouchableOpacity
            style={[
              styles.resolutionButton,
              resolutions[entityType][itemId] === 'keep-local' && styles.selectedButton,
            ]}
            onPress={() =>
              setResolutions({
                ...resolutions,
                [entityType]: {
                  ...resolutions[entityType],
                  [itemId]: 'keep-local',
                },
              })
            }
          >
            <Ionicons
              name="phone-portrait"
              size={16}
              color={
                resolutions[entityType][itemId] === 'keep-local' ? '#fff' : '#007AFF'
              }
            />
            <Text
              style={[
                styles.resolutionButtonText,
                resolutions[entityType][itemId] === 'keep-local' &&
                  styles.selectedButtonText,
              ]}
            >
              Local
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.resolutionButton,
              resolutions[entityType][itemId] === 'keep-cloud' && styles.selectedButton,
            ]}
            onPress={() =>
              setResolutions({
                ...resolutions,
                [entityType]: {
                  ...resolutions[entityType],
                  [itemId]: 'keep-cloud',
                },
              })
            }
          >
            <Ionicons
              name="cloud"
              size={16}
              color={
                resolutions[entityType][itemId] === 'keep-cloud' ? '#fff' : '#007AFF'
              }
            />
            <Text
              style={[
                styles.resolutionButtonText,
                resolutions[entityType][itemId] === 'keep-cloud' &&
                  styles.selectedButtonText,
              ]}
            >
              Cloud
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
            We found {totalConflicts} item{totalConflicts !== 1 ? 's' : ''} that have
            been modified on multiple devices. Choose which version to keep.
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

        <SectionList
          sections={sections}
          keyExtractor={(item, index) => `${item.localItem?.id || index}`}
          renderItem={renderConflictItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          style={styles.conflictList}
          showsVerticalScrollIndicator={true}
        />

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
  sectionHeader: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conflictInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  itemType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  versionInfo: {
    marginTop: 8,
  },
  versionText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
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