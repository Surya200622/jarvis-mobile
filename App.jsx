/**
 * Jarvis AI — React Native Android App
 * Voice-controlled AI assistant with remote PC control
 */

import React from 'react';
import {SafeAreaView, StatusBar} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {AuthProvider} from './src/context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#050810" />
      <SafeAreaView style={{flex: 1, backgroundColor: '#050810'}}>
        <AppNavigator />
      </SafeAreaView>
    </AuthProvider>
  );
}

export default App;
