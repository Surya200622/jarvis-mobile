import React, {createContext, useState, useContext, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({children}) {
  const [authToken, setAuthToken] = useState(null);
  const [serverUrl, setServerUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSavedAuth();
  }, []);

  async function loadSavedAuth() {
    try {
      const token = await AsyncStorage.getItem('jarvis_auth_token');
      const url = await AsyncStorage.getItem('jarvis_server_url');
      if (token) setAuthToken(token);
      if (url) setServerUrl(url);
    } catch (e) {
      console.warn('Failed to load auth:', e);
    }
    setIsLoading(false);
  }

  async function login(url, token) {
    try {
      const res = await fetch(`${url}/api/auth`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token}),
      });
      const data = await res.json();
      if (data.authenticated) {
        setAuthToken(token);
        setServerUrl(url);
        await AsyncStorage.setItem('jarvis_auth_token', token);
        await AsyncStorage.setItem('jarvis_server_url', url);
        return {success: true};
      }
      return {success: false, error: 'Invalid access token'};
    } catch (e) {
      return {success: false, error: 'Cannot reach server'};
    }
  }

  async function logout() {
    setAuthToken(null);
    setServerUrl('');
    await AsyncStorage.removeItem('jarvis_auth_token');
    await AsyncStorage.removeItem('jarvis_server_url');
  }

  return (
    <AuthContext.Provider
      value={{authToken, serverUrl, isLoading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
