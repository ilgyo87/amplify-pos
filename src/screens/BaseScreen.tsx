import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useEmployeeAuth } from '../context/EmployeeAuthContext';

export type BaseScreenProps = {
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
};

export function BaseScreen({ title, children, showBackButton = false }: BaseScreenProps) {
  const navigation = useNavigation();
  const { currentEmployee, signOut } = useEmployeeAuth();

  const handleEmployeePress = () => {
    if (currentEmployee) {
      Alert.alert(
        'Sign Out',
        `Are you sure you want to sign out ${currentEmployee.firstName} ${currentEmployee.lastName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: signOut }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {showBackButton && (
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
        )}
        
        <Text style={[styles.headerText, showBackButton && styles.headerTextWithBack]}>
          {title}
        </Text>
        
        {currentEmployee && (
          <TouchableOpacity 
            style={[
              styles.employeeInfo,
              currentEmployee.id === 'temp-admin' && styles.adminEmployeeInfo
            ]}
            onPress={handleEmployeePress}
            activeOpacity={0.7}
          >
            <View style={[
              styles.employeeAvatar,
              currentEmployee.id === 'temp-admin' && styles.adminEmployeeAvatar
            ]}>
              <Text style={styles.employeeInitials}>
                {currentEmployee.firstName.charAt(0)}{currentEmployee.lastName.charAt(0)}
              </Text>
            </View>
            <View style={styles.employeeDetails}>
              <Text style={styles.employeeName}>
                {currentEmployee.firstName} {currentEmployee.lastName}
                {currentEmployee.id === 'temp-admin' && (
                  <Text style={styles.adminBadge}> (SETUP)</Text>
                )}
              </Text>
              <Text style={styles.employeeRole}>
                {currentEmployee.role || 'Employee'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTextWithBack: {
    flex: 1,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  employeeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  employeeInitials: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  employeeDetails: {
    alignItems: 'flex-end',
  },
  employeeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  employeeRole: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
  },
  adminEmployeeInfo: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  adminEmployeeAvatar: {
    backgroundColor: '#FF9800',
  },
  adminBadge: {
    fontSize: 10,
    color: '#FF6F00',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
