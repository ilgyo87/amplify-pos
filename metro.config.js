const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude test files and problematic modules from the bundle
config.resolver.blockList = [
  // Jest configuration files
  /jest\.setup\.js$/,
  /jest\.config\.js$/,
  /jest\.setup\.js\.bak$/,
  /jest\.config\.js\.bak$/,
  
  // Test directories and files
  /__tests__\/.*/,
  /.*\.test\.(js|jsx|ts|tsx)$/,
  /.*\.spec\.(js|jsx|ts|tsx)$/,
  
  // Babel config (if causing issues)
  /babel\.config\.js$/,
  
  // Block core-js stable index that's causing issues
  /core-js\/stable\/index\.js$/,
];

// Also try using resolverMainFields to prioritize certain exports
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;