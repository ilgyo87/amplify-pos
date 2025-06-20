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
  const { width, height } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const orientation = useOrientation();
  
  const handlePress = (href: keyof Omit<RootStackParamList, 'Checkout'>) => {
    navigation.navigate(href as any);
  };

  // Simple responsive layout
  const isLandscape = orientation === 'landscape';
  const itemHeight = isLandscape ? 187 : 238;

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {menuItems.map((item, index) => (
          <View 
            key={item.id}
            style={[
              styles.itemWrapper,
              { 
                flexBasis: isLandscape ? '31%' : '48%',
                height: itemHeight,
              }
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
                      size={isLandscape ? 26 : 32} 
                      color="#fff" 
                    />
                  </View>
                </View>
                <Text 
                  style={[
                    styles.menuItemText, 
                    isLandscape && styles.landscapeText
                  ]} 
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
    padding: 24,
    justifyContent: 'flex-start',
    backgroundColor: '#f8f9fa',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  itemWrapper: {
    marginBottom: 20,
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  landscapeText: {
    fontSize: 15,
  },
});