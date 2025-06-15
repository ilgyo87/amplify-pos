import React, { memo, useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Text,
  useWindowDimensions,
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

const CONTAINER_PADDING = 40;
const ITEM_GAP = 50;

// Custom hook to get device orientation
const useOrientation = (): 'portrait' | 'landscape' => {
  const getScreenOrientation = () => {
    const screen = Dimensions.get('screen');
    return screen.width > screen.height ? 'landscape' : 'portrait';
  };

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(getScreenOrientation());

  useEffect(() => {
    const handleChange = () => {
      setOrientation(getScreenOrientation());
    };
    const subscription = Dimensions.addEventListener('change', handleChange);
    handleChange(); // Initial check after mount

    return () => {
      subscription?.remove();
    };
  }, []);

  return orientation;
};



export const DashboardMenu = memo(({ menuItems }: DashboardMenuProps) => {
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // Simple orientation detection
  const isLandscape = width > 600; // Simple breakpoint for tablets
  const itemsPerRow = isLandscape ? 3 : 2;
  
  const handlePress = (href: keyof Omit<RootStackParamList, 'Checkout'>) => {
    navigation.navigate(href as any);
  };
  


  // Calculate item dimensions with proper spacing
  const availableWidth = width - (CONTAINER_PADDING * 2);
  const totalGapWidth = (itemsPerRow - 1) * ITEM_GAP;
  const itemWidth = (availableWidth - totalGapWidth) / itemsPerRow;
  const itemHeight = itemWidth * 0.8;

  return (
    <View style={[styles.container, isLandscape && styles.landscapeContainer]}>
      <View style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <View 
            key={item.id}
            style={{
              width: itemWidth,
              height: itemHeight,
              marginRight: (index + 1) % itemsPerRow === 0 ? 0 : 0,
              marginBottom: index < menuItems.length - itemsPerRow ? ITEM_GAP : 0
            }}
          >
            <TouchableOpacity
              style={[
                styles.menuItem,
                { backgroundColor: item.color }
              ]}
              onPress={() => handlePress(item.href)}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Icon name={item.icon} size={28} color="#fff" />
              </View>
              <Text style={styles.menuItemText} numberOfLines={1}>
                {item.title}
              </Text>
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
    padding: CONTAINER_PADDING,
    paddingBottom: CONTAINER_PADDING + 30, // Extra bottom padding for categories
  },

  landscapeContainer: {
    paddingBottom: CONTAINER_PADDING + 50, // Extra padding at the bottom in landscape mode
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    justifyContent: 'space-between',
  },
  menuItem: {
    flex: 1,
    borderRadius: 12,
    padding: 10, // Reduced padding
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    marginBottom: 4, // Reduced space between icon and text
  },
  menuItemText: {
    color: '#fff',
    fontSize: 20, // Smaller font size
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2, // Reduced margin
    includeFontPadding: false,
  },
});