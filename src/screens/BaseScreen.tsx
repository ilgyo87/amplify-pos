import React from 'react';
import { View, StyleSheet, SafeAreaView, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export type BaseScreenProps = {
  title: string;
  children: React.ReactNode;
  showBackButton?: boolean;
  hideHeader?: boolean;
};

export function BaseScreen({ title, children, showBackButton = false, hideHeader = false }: BaseScreenProps) {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      {!hideHeader && (
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
        </View>
      )}
      <View style={[styles.content, hideHeader && styles.contentNoHeader]}>
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
  content: {
    flex: 1,
    padding: 16,
  },
  contentNoHeader: {
    paddingTop: 0,
  },
});
