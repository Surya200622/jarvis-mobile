import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Animated, Easing, Vibration, Linking,
  PermissionsAndroid, Platform, KeyboardAvoidingView,
  Alert, ScrollView,
} from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import {useAuth} from '../context/AuthContext';
import {COLORS} from '../styles/theme';

// ─── Quick Action Buttons ───
const QUICK_ACTIONS = [
  {icon: '🔊', cmd: 'volume up', label: 'Vol+'},
  {icon: '🔉', cmd: 'volume down', label: 'Vol-'},
  {icon: '🔇', cmd: 'mute', label: 'Mute'},
  {icon: '⏯️', cmd: 'play pause', label: 'Play'},
  {icon: '📸', cmd: 'screenshot', label: 'Snap'},
  {icon: '🔒', cmd: 'lock screen', label: 'Lock'},
  {icon: '💡', cmd: 'brightness up', label: 'Bright'},
  {icon: '🌙', cmd: 'night light on', label: 'Night'},
];

// ─── Android Device Commands ───
const ANDROID_COMMANDS = {
  'turn on flashlight': 'flashlight_on',
  'turn off flashlight': 'flashlight_off',
  'flashlight on': 'flashlight_on',
  'flashlight off': 'flashlight_off',
  'torch on': 'flashlight_on',
  'torch off': 'flashlight_off',
  'vibrate': 'vibrate',
  'open camera': 'open_camera',
  'take a selfie': 'open_camera',
  'open settings': 'open_settings',
  'open wifi settings': 'open_wifi',
  'open bluetooth settings': 'open_bluetooth',
  'set alarm': 'set_alarm',
};

export default function HomeScreen() {
  const {authToken, serverUrl, logout} = useAuth();
  
  // State
  const [messages, setMessages] = useState([
    {id: '0', role: 'ai', text: 'Awaiting orders, sir.', provider: 'System'},
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [pcConnected, setPcConnected] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [showSettings, setShowSettings] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  
  // Refs
  const flatListRef = useRef(null);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  
  // ─── Animations ───
  useEffect(() => {
    // Continuous rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1.15, duration: 800, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 800, useNativeDriver: true}),
        ]),
      ).start();
      Animated.timing(glowAnim, {toValue: 0.8, duration: 300, useNativeDriver: true}).start();
    } else {
      pulseAnim.setValue(1);
      Animated.timing(glowAnim, {toValue: 0.3, duration: 300, useNativeDriver: true}).start();
    }
  }, [isListening]);

  // ─── TTS Setup ───
  useEffect(() => {
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(0.9);
    
    // Try to get a male voice
    Tts.voices().then(voices => {
      const male = voices.find(v => 
        v.language === 'en-US' && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david'))
      );
      if (male) Tts.setDefaultVoice(male.id);
    });

    return () => {
      Tts.stop();
    };
  }, []);

  // ─── Voice Recognition Setup ───
  useEffect(() => {
    Voice.onSpeechStart = () => setPartialText('');
    Voice.onSpeechPartialResults = (e) => {
      if (e.value && e.value[0]) setPartialText(e.value[0]);
    };
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        const text = e.value[0].trim();
        setPartialText('');
        handleVoiceResult(text);
      }
    };
    Voice.onSpeechError = (e) => {
      console.warn('Voice error:', e);
      setIsListening(false);
      setPartialText('');
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // ─── Check Server Status ───
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch(`${serverUrl}/api/status`, {
        headers: {'X-Auth-Token': authToken},
      });
      const data = await res.json();
      setPcConnected(data.pc_connected || false);
    } catch {
      // Server unreachable
    }
  }

  // ─── Request Mic Permission ───
  async function requestMicPermission() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Jarvis Voice Permission',
          message: 'Jarvis needs microphone access for voice commands.',
          buttonPositive: 'Grant',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  // ─── Voice Control ───
  async function toggleListening() {
    if (isListening) {
      await Voice.stop();
      setIsListening(false);
      setPartialText('');
    } else {
      const hasPermission = await requestMicPermission();
      if (!hasPermission) {
        addMessage('ai', 'Microphone permission required for voice commands, sir.');
        return;
      }
      try {
        Tts.stop();
        await Voice.start('en-US');
        setIsListening(true);
        Vibration.vibrate(50);
      } catch (e) {
        console.warn('Voice start error:', e);
      }
    }
  }

  function handleVoiceResult(text) {
    setIsListening(false);
    let command = text.toLowerCase().replace(/hello jarvis/gi, '').replace(/jarvis/gi, '').trim();
    if (!command) command = 'Hello';
    addMessage('user', command);
    submitCommand(command);
  }

  // ─── Android Device Commands ───
  function handleAndroidCommand(lower) {
    if (lower.includes('vibrate')) {
      Vibration.vibrate(500);
      addMessage('ai', 'Vibrating, sir.', 'Device');
      speak('Vibrating, sir.');
      return true;
    }
    if (lower.includes('open camera') || lower.includes('selfie')) {
      Linking.openURL('content://media/internal/images/media');
      addMessage('ai', 'Opening camera, sir.', 'Device');
      speak('Opening camera, sir.');
      return true;
    }
    if (lower.includes('open settings')) {
      Linking.openSettings();
      addMessage('ai', 'Opening device settings, sir.', 'Device');
      speak('Opening device settings, sir.');
      return true;
    }
    if (lower.includes('call ')) {
      const contact = lower.replace('call ', '').trim();
      Linking.openURL(`tel:${contact}`);
      addMessage('ai', `Calling ${contact}, sir.`, 'Device');
      speak(`Calling ${contact}, sir.`);
      return true;
    }
    if (lower.includes('send message to') || lower.includes('text ')) {
      const contact = lower.replace(/send message to|text /gi, '').trim();
      Linking.openURL(`sms:${contact}`);
      addMessage('ai', `Opening messages for ${contact}, sir.`, 'Device');
      speak(`Opening messages for ${contact}, sir.`);
      return true;
    }
    if (lower.includes('open map') || lower.includes('navigate to')) {
      const dest = lower.replace(/open map|navigate to /gi, '').trim();
      Linking.openURL(`google.navigation:q=${encodeURIComponent(dest)}`);
      addMessage('ai', `Opening navigation to ${dest}, sir.`, 'Device');
      speak(`Opening navigation to ${dest}, sir.`);
      return true;
    }
    return false;
  }

  // ─── Submit to Server ───
  async function submitCommand(text) {
    setIsThinking(true);

    // Check Android-specific commands first
    const lower = text.toLowerCase();
    if (handleAndroidCommand(lower)) {
      setIsThinking(false);
      return;
    }

    // Update history
    const newHistory = [...conversationHistory, {role: 'user', content: text}].slice(-20);
    setConversationHistory(newHistory);

    try {
      const res = await fetch(`${serverUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': authToken,
        },
        body: JSON.stringify({
          command: text,
          provider: selectedProvider,
          history: newHistory,
          source: 'android',
        }),
      });

      if (res.status === 401) {
        Alert.alert('Session Expired', 'Please login again.');
        logout();
        return;
      }

      const data = await res.json();
      
      setConversationHistory(prev => [...prev, {role: 'assistant', content: data.response}].slice(-20));
      addMessage('ai', data.response, data.provider);
      
      if (data.action === 'open_url' && data.url) {
        Linking.openURL(data.url);
      }
      
      speak(data.response);
    } catch (e) {
      addMessage('ai', 'Connection to server failed. Check your internet, sir.', 'Error');
    }
    
    setIsThinking(false);
  }

  // ─── TTS Speak ───
  function speak(text) {
    Tts.stop();
    Tts.speak(text);
  }

  // ─── Message Helpers ───
  function addMessage(role, text, provider = null) {
    setMessages(prev => [
      ...prev,
      {id: Date.now().toString(), role, text, provider},
    ]);
    setTimeout(() => flatListRef.current?.scrollToEnd({animated: true}), 100);
  }

  function handleTextSubmit() {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    addMessage('user', text);
    submitCommand(text);
  }

  // ─── Render ───
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>J.A.R.V.I.S</Text>
        <View style={styles.headerRight}>
          <View style={[styles.pcBadge, pcConnected && styles.pcBadgeConnected]}>
            <View style={[styles.pcDot, pcConnected && styles.pcDotConnected]} />
            <Text style={[styles.pcText, pcConnected && styles.pcTextConnected]}>
              PC
            </Text>
          </View>
          <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsTitle}>⚡ AI Provider</Text>
          {['auto', 'gemini', 'groq', 'cohere', 'huggingface'].map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.providerItem, selectedProvider === p && styles.providerSelected]}
              onPress={() => { setSelectedProvider(p); setShowSettings(false); }}>
              <Text style={styles.providerName}>
                {p === 'auto' ? '⚡ Auto' : p === 'gemini' ? 'G Gemini' : p === 'groq' ? '⚙ Groq' : p === 'cohere' ? 'C Cohere' : '🤗 HuggingFace'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Arc Reactor */}
      <View style={styles.reactorArea}>
        <View style={styles.reactorContainer}>
          {/* Outer Ring */}
          <Animated.View style={[styles.outerRing, {transform: [{rotate: spin}]}]} />
          {/* Middle Ring */}
          <Animated.View style={[styles.middleRing, {transform: [{rotate: reverseSpin}]}]} />
          {/* Inner Ring */}
          <View style={styles.innerRing} />
          {/* Core Button */}
          <Animated.View style={{transform: [{scale: pulseAnim}]}}>
            <TouchableOpacity
              style={[
                styles.coreBtn,
                isListening && styles.coreBtnListening,
                isThinking && styles.coreBtnThinking,
              ]}
              onPress={toggleListening}
              activeOpacity={0.7}>
              <Text style={styles.coreText}>
                {isThinking ? 'THINKING' : isListening ? 'LISTENING' : 'ACTIVATE'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        {partialText ? <Text style={styles.partialText}>{partialText}</Text> : null}
      </View>

      {/* Quick Actions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActions} contentContainerStyle={styles.quickActionsContent}>
        {QUICK_ACTIONS.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickBtn}
            onPress={() => { addMessage('user', action.cmd); submitCommand(action.cmd); }}
            activeOpacity={0.6}>
            <Text style={styles.quickIcon}>{action.icon}</Text>
            <Text style={styles.quickLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chat */}
      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <View style={[styles.message, item.role === 'user' ? styles.userMsg : styles.aiMsg]}>
              <View style={[styles.msgContent, item.role === 'user' ? styles.userMsgContent : styles.aiMsgContent]}>
                <Text style={[styles.msgText, item.role === 'user' ? styles.userMsgText : styles.aiMsgText]}>
                  {item.text}
                </Text>
                {item.provider && item.role === 'ai' && (
                  <Text style={styles.providerTag}>{item.provider}</Text>
                )}
              </View>
            </View>
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({animated: true})}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatList}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputArea}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a command..."
              placeholderTextColor={COLORS.textMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleTextSubmit}
              returnKeyType="send"
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleTextSubmit} activeOpacity={0.7}>
              <Text style={styles.sendIcon}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '300',
    color: COLORS.primary,
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 243, 255, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pcBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 50, 50, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 50, 50, 0.2)',
  },
  pcBadgeConnected: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  pcDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff4444',
  },
  pcDotConnected: {
    backgroundColor: COLORS.success,
  },
  pcText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDim,
    letterSpacing: 1,
  },
  pcTextConnected: {
    color: COLORS.success,
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 243, 255, 0.1)',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 16,
    color: COLORS.primary,
  },

  // Settings Panel
  settingsPanel: {
    backgroundColor: COLORS.overlay,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  providerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  providerSelected: {
    backgroundColor: 'rgba(0, 243, 255, 0.12)',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  providerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '500',
  },
  logoutBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },

  // Reactor
  reactorArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  reactorContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: COLORS.primary,
    borderBottomColor: COLORS.secondary,
  },
  middleRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderLeftColor: COLORS.primary,
    borderRightColor: COLORS.secondary,
    borderStyle: 'dashed',
  },
  innerRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 243, 255, 0.4)',
  },
  coreBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 50, 100, 0.8)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  coreBtnListening: {
    backgroundColor: 'rgba(0, 119, 255, 0.9)',
    shadowOpacity: 0.8,
    shadowRadius: 25,
    elevation: 15,
  },
  coreBtnThinking: {
    backgroundColor: 'rgba(150, 0, 200, 0.7)',
    borderColor: COLORS.accent,
    shadowColor: COLORS.accent,
  },
  coreText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: '#fff',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 8,
  },
  partialText: {
    marginTop: 12,
    color: COLORS.textDim,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Quick Actions
  quickActions: {
    maxHeight: 70,
    flexGrow: 0,
  },
  quickActionsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickIcon: {
    fontSize: 18,
  },
  quickLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },

  // Chat
  chatContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'rgba(0, 20, 40, 0.3)',
    marginTop: 8,
  },
  chatList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  message: {
    marginBottom: 10,
  },
  userMsg: {
    alignItems: 'flex-end',
  },
  aiMsg: {
    alignItems: 'flex-start',
  },
  msgContent: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  userMsgContent: {
    backgroundColor: 'rgba(224, 250, 255, 0.1)',
    borderBottomRightRadius: 2,
  },
  aiMsgContent: {
    backgroundColor: 'rgba(0, 119, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 243, 255, 0.25)',
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMsgText: {
    color: '#fff',
  },
  aiMsgText: {
    color: COLORS.primary,
  },
  providerTag: {
    fontSize: 9,
    color: 'rgba(0, 243, 255, 0.5)',
    marginTop: 4,
    backgroundColor: 'rgba(0, 243, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },

  // Input
  inputArea: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 25,
    paddingHorizontal: 18,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 20,
  },
});
