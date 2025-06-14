import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem, OrderItemOptions, StarchLevel, formatStarchLevel } from '../../types/order';

interface OrderItemSettingsModalProps {
  visible: boolean;
  item: OrderItem | null;
  onSave: (item: OrderItem, options: OrderItemOptions) => void;
  onCancel: () => void;
}

const STARCH_LEVELS: StarchLevel[] = ['none', 'light', 'medium', 'heavy'];

export function OrderItemSettingsModal({
  visible,
  item,
  onSave,
  onCancel
}: OrderItemSettingsModalProps) {
  const [starch, setStarch] = useState<StarchLevel>('none');
  const [pressOnly, setPressOnly] = useState(false);
  const [notes, setNotes] = useState('');

  // Initialize form with current item options
  useEffect(() => {
    if (item && visible) {
      setStarch(item.options?.starch || 'none');
      setPressOnly(item.options?.pressOnly || false);
      setNotes(item.options?.notes || '');
    }
  }, [item, visible]);

  const handleSave = () => {
    if (!item) return;

    const options: OrderItemOptions = {
      starch,
      pressOnly,
      notes: notes.trim()
    };

    onSave(item, options);
  };

  const handleCancel = () => {
    // Reset form to original values
    if (item) {
      setStarch(item.options?.starch || 'none');
      setPressOnly(item.options?.pressOnly || false);
      setNotes(item.options?.notes || '');
    }
    onCancel();
  };

  if (!item) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Item Settings</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Item Info */}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.itemDescription}>{item.description}</Text>
          )}
          <Text style={styles.itemPrice}>
            ${(Number(item.price) || 0).toFixed(2)}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Starch Level Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Starch Level</Text>
            <View style={styles.optionsGrid}>
              {STARCH_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.optionButton,
                    starch === level && styles.optionButtonActive
                  ]}
                  onPress={() => setStarch(level)}
                >
                  <Text style={[
                    styles.optionText,
                    starch === level && styles.optionTextActive
                  ]}>
                    {formatStarchLevel(level)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Press Only Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Options</Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                pressOnly && styles.toggleButtonActive
              ]}
              onPress={() => setPressOnly(!pressOnly)}
            >
              <View style={styles.toggleContent}>
                <View>
                  <Text style={[
                    styles.toggleTitle,
                    pressOnly && styles.toggleTitleActive
                  ]}>
                    Press Only
                  </Text>
                  <Text style={[
                    styles.toggleDescription,
                    pressOnly && styles.toggleDescriptionActive
                  ]}>
                    Press without cleaning
                  </Text>
                </View>
                <View style={[
                  styles.checkbox,
                  pressOnly && styles.checkboxActive
                ]}>
                  {pressOnly && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any special instructions for this item..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
            />
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  itemInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  optionButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  toggleButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  toggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  toggleTitleActive: {
    color: '#007AFF',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  toggleDescriptionActive: {
    color: '#007AFF',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 80,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
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
});