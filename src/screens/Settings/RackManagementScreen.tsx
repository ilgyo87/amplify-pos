import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  SafeAreaView,
  FlatList,
  Switch,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRacks } from '../../database/hooks/useRacks';
import { RackDocument } from '../../database/schemas/rack';
import * as Print from 'expo-print';
import { QRCode } from '../../utils/qrUtils';

export default function RackManagementScreen() {
  const {
    racks,
    activeRacks,
    loading,
    error,
    searchResults,
    isSearching,
    createRack,
    updateRack,
    deleteRack,
    toggleRackStatus,
    searchRacks,
    clearSearch,
    refreshRacks
  } = useRacks();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRack, setEditingRack] = useState<RackDocument | null>(null);
  const [showAllRacks, setShowAllRacks] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form states
  const [rackNumber, setRackNumber] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');

  const displayedRacks = searchQuery 
    ? searchResults 
    : (showAllRacks ? racks : activeRacks);

  const handleCreateRack = async () => {
    if (!rackNumber.trim()) {
      Alert.alert('Error', 'Rack number is required');
      return;
    }

    const result = await createRack(
      rackNumber,
      description,
      location,
      capacity ? parseInt(capacity) : undefined
    );

    if (result.success) {
      setShowCreateModal(false);
      resetForm();
      Alert.alert('Success', 'Rack created successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to create rack');
    }
  };

  const handleUpdateRack = async () => {
    if (!editingRack) return;

    const result = await updateRack(editingRack.id, {
      description,
      location,
      capacity: capacity ? parseInt(capacity) : undefined
    });

    if (result.success) {
      setShowEditModal(false);
      setEditingRack(null);
      resetForm();
      Alert.alert('Success', 'Rack updated successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to update rack');
    }
  };

  const handleDeleteRack = (rack: RackDocument) => {
    Alert.alert(
      'Delete Rack',
      `Are you sure you want to delete rack ${rack.rackNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteRack(rack.id);
            if (success) {
              Alert.alert('Success', 'Rack deleted successfully');
            } else {
              Alert.alert('Error', 'Failed to delete rack');
            }
          }
        }
      ]
    );
  };

  const handleToggleStatus = async (rack: RackDocument) => {
    const success = await toggleRackStatus(rack.id);
    if (!success) {
      Alert.alert('Error', 'Failed to update rack status');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchRacks(query);
    } else {
      clearSearch();
    }
  };

  const openEditModal = (rack: RackDocument) => {
    setEditingRack(rack);
    setRackNumber(rack.rackNumber);
    setDescription(rack.description || '');
    setLocation(rack.location || '');
    setCapacity(rack.capacity?.toString() || '');
    setShowEditModal(true);
  };

  const resetForm = () => {
    setRackNumber('');
    setDescription('');
    setLocation('');
    setCapacity('');
  };

  const printRackLabel = async (rack: RackDocument) => {
    try {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @page {
                size: 62mm 29mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }
              .label {
                width: 62mm;
                height: 29mm;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 3mm;
                box-sizing: border-box;
              }
              .content {
                display: flex;
                align-items: center;
                gap: 5mm;
              }
              .text-section {
                flex: 1;
              }
              .rack-number {
                font-size: 20pt;
                font-weight: bold;
                margin-bottom: 2mm;
              }
              .location {
                font-size: 14pt;
                color: #555;
              }
              .qr-container {
                width: 20mm;
                height: 20mm;
              }
              .qr-container img {
                width: 100%;
                height: 100%;
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="content">
                <div class="text-section">
                  <div class="rack-number">${rack.rackNumber}</div>
                  ${rack.location ? `<div class="location">${rack.location}</div>` : ''}
                </div>
                <div class="qr-container">
                  <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 29 29">
                    <rect width="29" height="29" fill="white"/>
                    <path d="${generateQRPath(rack.rackNumber)}" fill="black"/>
                  </svg>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      await Print.printAsync({ html });
      Alert.alert('Success', 'Rack label printed successfully');
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert('Error', 'Failed to print rack label');
    }
  };

  // Simple QR code path generator (placeholder - you might want to use a proper QR library)
  const generateQRPath = (data: string) => {
    // This is a simplified version - in production, use proper QR generation
    let path = 'M0,0h7v7h-7zM1,1v5h5v-5zM2,2h3v3h-3z'; // Top-left finder
    path += 'M22,0h7v7h-7zM23,1v5h5v-5zM24,2h3v3h-3z'; // Top-right finder
    path += 'M0,22h7v7h-7zM1,23v5h5v-5zM2,24h3v3h-3z'; // Bottom-left finder
    
    // Add some data pattern based on the string
    for (let i = 0; i < data.length && i < 10; i++) {
      const x = 9 + (i % 4) * 3;
      const y = 9 + Math.floor(i / 4) * 3;
      if (data.charCodeAt(i) % 2 === 0) {
        path += `M${x},${y}h2v2h-2z`;
      }
    }
    
    return path;
  };

  const renderRackItem = ({ item }: { item: RackDocument }) => (
    <View style={[styles.rackItem, !item.isActive && styles.inactiveRack]}>
      <View style={styles.rackInfo}>
        <View style={styles.rackHeader}>
          <Text style={[styles.rackNumber, !item.isActive && styles.inactiveText]}>
            {item.rackNumber}
          </Text>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        
        {item.location && (
          <Text style={[styles.rackLocation, !item.isActive && styles.inactiveText]}>
            <Ionicons name="location-outline" size={14} color="#666" /> {item.location}
          </Text>
        )}
        
        {item.description && (
          <Text style={[styles.rackDescription, !item.isActive && styles.inactiveText]}>
            {item.description}
          </Text>
        )}
        
        {item.capacity && (
          <View style={styles.capacityInfo}>
            <Ionicons name="cube-outline" size={14} color="#666" />
            <Text style={[styles.capacityText, !item.isActive && styles.inactiveText]}>
              {item.currentLoad || 0} / {item.capacity} items
            </Text>
          </View>
        )}
      </View>

      <View style={styles.rackActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => printRackLabel(item)}
        >
          <Ionicons name="print-outline" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={20} color="#666" />
        </TouchableOpacity>
        
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleStatus(item)}
          trackColor={{ false: '#e5e5e5', true: '#10b981' }}
          thumbColor={item.isActive ? '#fff' : '#999'}
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading racks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rack Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search racks..."
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !showAllRacks && styles.filterButtonActive]}
          onPress={() => setShowAllRacks(false)}
        >
          <Text style={[styles.filterText, !showAllRacks && styles.filterTextActive]}>
            Active ({activeRacks.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showAllRacks && styles.filterButtonActive]}
          onPress={() => setShowAllRacks(true)}
        >
          <Text style={[styles.filterText, showAllRacks && styles.filterTextActive]}>
            All ({racks.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedRacks}
        keyExtractor={(item) => item.id}
        renderItem={renderRackItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No racks found' : 'No racks created yet'}
            </Text>
          </View>
        }
        refreshing={false}
        onRefresh={refreshRacks}
      />

      {/* Create Rack Modal */}
      <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Rack</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rack Number *</Text>
              <TextInput
                style={styles.input}
                value={rackNumber}
                onChangeText={setRackNumber}
                placeholder="e.g., A1, R001, etc."
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., North Wall, Storage Room"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Additional notes about this rack"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Capacity</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="Maximum number of items"
                keyboardType="numeric"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowCreateModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleCreateRack}
            >
              <Text style={styles.saveButtonText}>Create Rack</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Rack Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Rack</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rack Number</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={rackNumber}
                editable={false}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., North Wall, Storage Room"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Additional notes about this rack"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Capacity</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="Maximum number of items"
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                setShowEditModal(false);
                if (editingRack) handleDeleteRack(editingRack);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
              <Text style={styles.deleteButtonText}>Delete Rack</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setShowEditModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleUpdateRack}
            >
              <Text style={styles.saveButtonText}>Update Rack</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingVertical: 10,
  },
  rackItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inactiveRack: {
    backgroundColor: '#f9f9f9',
    opacity: 0.7,
  },
  rackInfo: {
    flex: 1,
  },
  rackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rackNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  inactiveBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 12,
    color: '#ef4444',
  },
  inactiveText: {
    color: '#999',
  },
  rackLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  rackDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  capacityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  rackActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#ef4444',
    marginLeft: 8,
  },
});