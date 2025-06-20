import React, { memo, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import Icon from 'react-native-vector-icons/Ionicons';

export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  href: keyof Omit<RootStackParamList, 'Checkout'>; // Exclude checkout as it requires parameters
  color: string;
}

interface DashboardMenuProps {
  menuItems: MenuItem[];
}

export const DashboardMenu = memo(({ menuItems }: DashboardMenuProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  const handlePress = (href: keyof Omit<RootStackParamList, 'Checkout'>) => {
    navigation.navigate(href as any);
  };

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <View 
            key={item.id}
            style={[
              styles.itemWrapper,
              // Add margin-right except for the last item in each row
              index % 2 === 1 && { marginRight: 0 }
            ]}
          >
            <TouchableOpacity
              style={[
                styles.menuItem,
                { backgroundColor: item.color }
              ]}
              onPress={() => handlePress(item.href)}
              activeOpacity={0.7}
            >
              {/* Gradient overlay for depth */}
              <View style={styles.gradientOverlay} />
              
              <View style={styles.contentContainer}>
                <View style={styles.iconContainer}>
                  <View style={styles.iconBackground}>
                    <Icon 
                      name={item.icon} 
                      size={28} 
                      color="#fff" 
                    />
                  </View>
                </View>
                <Text 
                  style={styles.menuItemText} 
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {item.title}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-between',
  },
  itemWrapper: {
    width: '48%',
    height: 160,
    marginBottom: 16,
  },
  menuItem: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});