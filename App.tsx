import React from "react";
import { Button, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import outputs from "./amplify_outputs.json";

Amplify.configure(outputs);

const SignOutButton = () => {
  const { signOut } = useAuthenticator();

  return (
    <View style={styles.signOutButton}>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        <Authenticator.Provider>
          <Authenticator>
            <SignOutButton />
          </Authenticator>
        </Authenticator.Provider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  signOutButton: {
    alignSelf: "flex-end",
    margin: 20,
  },
});

export default App;