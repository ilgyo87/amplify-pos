import React from 'react';
import { View, Text } from 'react-native';
import { BaseScreen } from '../BaseScreen';

export default function SettingsScreen() {
  return (
    <BaseScreen title="Settings">
      <View>
        <Text>Settings content goes here</Text>
      </View>
    </BaseScreen>
  );
}
