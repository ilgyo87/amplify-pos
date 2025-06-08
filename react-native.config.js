module.exports = {
  dependencies: {
    'react-native-vector-icons': {
      platforms: {
        ios: {
          project: './ios/amplifypos.xcodeproj',
          xcodeprojModulePath: 'Libraries/react-native-vector-icons/RNVectorIcons.xcodeproj',
          libraryFolder: 'Libraries',
        },
      },
    },
  },
  assets: ['./src/assets/fonts/'],
};