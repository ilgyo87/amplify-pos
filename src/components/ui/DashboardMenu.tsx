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
  href: keyof RootStackParamList;
  color: string;
}

interface DashboardMenuProps {
  menuItems: MenuItem[];
}

const CONTAINER_PADDING = 16;
const ITEM_GAP = 16;

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
  const { width, height } = useWindowDimensions(); // For layout sizing
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const orientation = useOrientation(); // Get orientation from custom hook

  const isLandscape = orientation === 'landscape';
  // Fixed grid logic as per request
  const itemsPerRow = isLandscape ? 3 : 2;
  const maxItems = isLandscape ? 9 : 8; // 3x3 grid (up to 9 items) or 2x4 grid (up to 8 items)
  
  const displayItems = menuItems.slice(0, maxItems);
  // Console log removed for cleaner code
  
  const handlePress = (href: keyof RootStackParamList) => {
    navigation.navigate(href);
  };

  // Calculate item width with proper spacing
  const availableWidth = width - (CONTAINER_PADDING * 2);
  const itemWidth = (availableWidth - ((itemsPerRow - 1) * ITEM_GAP)) / itemsPerRow;

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {displayItems.map((item, index) => (
          <View 
            key={item.id}
            style={[
              styles.itemContainer,
              { 
                width: itemWidth,
                height: itemWidth, // Let's try making them square first, can adjust aspect ratio later
                marginRight: (index + 1) % itemsPerRow === 0 ? 0 : ITEM_GAP,
                marginBottom: isLandscape 
                  ? (index < 6 ? ITEM_GAP : 0) // 3 rows in landscape
                  : (index < 6 ? ITEM_GAP : 0) // 4 rows in portrait (2 items per row)
              }
            ]}
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
                <Icon name={item.icon} size={24} color="#fff" />
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
    paddingBottom: 0,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  itemContainer: {
    // This will be set dynamically
  },
  menuItem: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    marginBottom: 8,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    includeFontPadding: false,
  },
});
