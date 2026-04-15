import React from 'react';
import {useAuth} from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import {ActivityIndicator, View} from 'react-native';
import {COLORS} from '../styles/theme';

export default function AppNavigator() {
  const {authToken, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg}}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return authToken ? <HomeScreen /> : <LoginScreen />;
}
