import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, Text } from 'react-native';
import { InputBox } from '../components/ui/InputBox';
import { DashboardMenu, MenuItem } from '../components/ui/DashboardMenu';

export default function Dashboard() {
  const [businessName] = useState('No Business');
  
  const menuItems: MenuItem[] = [
    { id: '1', title: 'Customers', icon: 'people', href: 'Customers', color: '#4CAF50' },
    { id: '2', title: 'Products', icon: 'cube', href: 'Products', color: '#2196F3' },
    { id: '3', title: 'Orders', icon: 'document', href: 'Orders', color: '#FF9800' },
    { id: '4', title: 'Employees', icon: 'person', href: 'Employees', color: '#9C27B0' },
    { id: '5', title: 'Settings', icon: 'settings', href: 'Settings', color: '#607D8B' },
    { id: '6', title: 'Reports', icon: 'bar-chart', href: 'Reports', color: '#795548' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{businessName}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <InputBox
            placeholder="Customer Search"
          />
        </View>

        <DashboardMenu menuItems={menuItems} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
});
