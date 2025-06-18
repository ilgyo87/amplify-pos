#!/bin/bash

# Get the local IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

echo "Setting bundler host to: $IP"

# Update the RCTBundleURLProvider settings
defaults write com.expo-iggy.amplify-pos RCTBundleURLProviderDefaultHost $IP
defaults write com.expo-iggy.amplify-pos RCTBundleURLProviderDefaultPort 8081

echo "Bundler host set successfully!"
echo "Please restart the app on your device."