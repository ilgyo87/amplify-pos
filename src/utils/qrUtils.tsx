import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import QRCodeSvg from 'react-native-qrcode-svg';

type QRCodeProps = {
  value: string;
  size: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  quietZone?: number;
  logoSize?: number;
};

// QR code component using react-native-qrcode-svg
export function QRCode({
  value,
  size,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  style,
  quietZone = 0,
  logoSize = 0,
}: QRCodeProps) {
  return (
    <View style={[styles.container, style]}>
      <QRCodeSvg
        value={value}
        size={size}
        color={color}
        backgroundColor={backgroundColor}
        quietZone={quietZone}
        logoSize={logoSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
});
