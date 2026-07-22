import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';

export const VoiceToTextInput = ({ onSend, onOpenAttachment, onTyping }) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === 'web' && (window.SpeechRecognition || window.webkitSpeechRecognition)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => {
          const cleanPrev = prev.trim();
          return cleanPrev ? `${cleanPrev} ${transcript}` : transcript;
        });
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (Platform.OS === 'web' && recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          setIsListening(false);
        }
      }
    } else {
      setIsListening(!isListening);
      if (!isListening) {
        Alert.alert('Microphone Active', 'Simulating native voice-to-text recording...');
      }
    }
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    setIsListening(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.iconBtn} onPress={onOpenAttachment}>
        <Ionicons name="attach" size={24} color="#8696a0" />
      </TouchableOpacity>

      <View style={styles.inputWrapper}>
        <TextInput
          value={text}
          onChangeText={(val) => {
            setText(val);
            if (onTyping) onTyping();
          }}
          placeholder={isListening ? "Listening... Speak now..." : "Type a message..."}
          placeholderTextColor="#8696a0"
          style={styles.textInput}
        />
        {isListening && (
          <Text style={styles.recBadge}>REC ●</Text>
        )}
      </View>

      {/* Voice-to-Text Microphone Button */}
      <TouchableOpacity
        onPress={toggleListening}
        style={[styles.micBtn, isListening && styles.micBtnActive]}
      >
        <Ionicons name={isListening ? "mic-off" : "mic"} size={20} color="#fff" />
      </TouchableOpacity>

      {/* Send Button */}
      {text.trim().length > 0 && (
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#202c33',
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222d34'
  },
  iconBtn: {
    padding: 6,
    marginRight: 4
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#2a3942',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    marginRight: 6
  },
  textInput: {
    flex: 1,
    color: '#e9edef',
    fontSize: 15,
    padding: 4
  },
  recBadge: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4
  },
  micBtnActive: {
    backgroundColor: '#ef4444'
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
