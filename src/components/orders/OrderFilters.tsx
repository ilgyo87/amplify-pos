import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderStatus } from '../../types/order';

interface OrderFiltersProps {
  selectedStatus: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
  orderCounts: {
    all: number;
    pending: number;
    in_progress: number;
    ready: number;
    completed: number;
    cancelled: number;
    picked_up?: number;
  };
}

export function OrderFilters({ selectedStatus, onStatusChange, orderCounts }: OrderFiltersProps) {
  const filters: Array<{
    status: OrderStatus | 'all';
    label: string;
    icon: string;
    color: string;
  }> = [
    { status: 'all', label: 'All', icon: 'list', color: '#333' },
    { status: 'pending', label: 'Pending', icon: 'time', color: '#ff9500' },
    { status: 'in_progress', label: 'In Progress', icon: 'reload-circle', color: '#007AFF' },
    { status: 'ready', label: 'Ready', icon: 'checkmark-circle', color: '#34c759' },
    { status: 'completed', label: 'Completed', icon: 'checkmark-done-circle', color: '#5856d6' },
    { status: 'picked_up', label: 'Picked Up', icon: 'checkmark-done', color: '#32d74b' },
    { status: 'cancelled', label: 'Cancelled', icon: 'close-circle', color: '#ff3b30' },
  ];

  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {filters.map((filter) => {
        const isSelected = selectedStatus === filter.status;
        const count = orderCounts[filter.status];
        
        return (
          <TouchableOpacity
            key={filter.status}
            style={[
              styles.filterButton,
              isSelected && styles.filterButtonActive,
              isSelected && { borderColor: filter.color }
            ]}
            onPress={() => onStatusChange(filter.status)}
            activeOpacity={0.7}
          >
            <View style={styles.filterIconContainer}>
              <Ionicons 
                name={filter.icon as any} 
                size={20} 
                color={isSelected ? filter.color : '#666'} 
              />
              {count !== undefined && count > 0 && filter.status !== 'all' && (
                <View style={[styles.badge, { backgroundColor: filter.color }]}>
                  <Text style={styles.badgeText}>{count}</Text>
                </View>
              )}
            </View>
            <Text style={[
              styles.filterText,
              isSelected && styles.filterTextActive,
              isSelected && { color: filter.color }
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: 'white',
  },
  filterIconContainer: {
    position: 'relative',
    marginRight: 6,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTextActive: {
    fontWeight: '600',
  },
});