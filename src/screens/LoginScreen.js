import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useAuth} from '../context/AuthContext';
import {COLORS} from '../styles/theme';

export default function LoginScreen() {
  const {login} = useAuth();
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {toValue: 1.1, duration: 1500, useNativeDriver: true}),
        Animated.timing(pulseAnim, {toValue: 1, duration: 1500, useNativeDriver: true}),
      ]),
    ).start();
  }, []);

  async function handleLogin() {
    if (!serverUrl.trim()) {
      setError('Enter your Jarvis server URL');
      return;
    }
    if (!token.trim()) {
      setError('Enter your access token');
      return;
    }

    setLoading(true);
    setError('');
    
    let url = serverUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    url = url.replace(/\/$/, '');

    const result = await login(url, token.trim());
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Arc Reactor Logo */}
      <Animated.View style={[styles.reactor, {transform: [{scale: pulseAnim}]}]}>
        <View style={styles.reactorOuter}>
          <View style={styles.reactorInner}>
            <Text style={styles.reactorText}>J</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={styles.title}>J.A.R.V.I.S</Text>
      <Text style={styles.subtitle}>Personal AI Assistant</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Server URL (e.g. jarvis.onrender.com)"
          placeholderTextColor={COLORS.textMuted}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TextInput
          style={styles.input}
          placeholder="Access Token"
          placeholderTextColor={COLORS.textMuted}
          value={token}
          onChangeText={setToken}
          secureTextEntry
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.7}>
          <Text style={styles.buttonText}>
            {loading ? 'CONNECTING...' : 'AUTHENTICATE'}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  reactor: {
    marginBottom: 32,
  },
  reactorOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  reactorInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 119, 255, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactorText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    textShadowColor: COLORS.primary,
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: COLORS.primary,
    letterSpacing: 8,
    textShadowColor: 'rgba(0, 243, 255, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 15,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginBottom: 40,
  },
  form: {
    width: '100%',
    gap: 14,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    color: COLORS.text,
    fontSize: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'rgba(0, 119, 255, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 4,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
});
