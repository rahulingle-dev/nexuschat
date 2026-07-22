import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendOtp, registerUser, loginUser, sendForgotPasswordOtp, resetPassword } from '../services/api';

export const AuthScreen = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login');
  const [step, setStep] = useState(1);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [bio, setBio] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSendOtp = async () => {
    if (!email || !username || !password || !fullName) {
      setError('Please fill in all mandatory fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(email, 'Register');
      setInfoMsg(`OTP code sent to ${email}. Check terminal log.`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFinal = async () => {
    if (!otpCode) {
      setError('Please enter the 6-digit OTP code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await registerUser({ username, email, password, fullName, otpCode, bio });
      onAuthSuccess(response.token, response.user);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please enter your username/email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await loginUser({ usernameOrEmail: username, password });
      onAuthSuccess(response.token, response.user);
    } catch (err) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.brandBox}>
        <View style={styles.iconCircle}>
          <Ionicons name="key-sharp" size={32} color="#fff" />
        </View>
        <Text style={styles.brandTitle}>NexusChat</Text>
        <Text style={styles.brandSubtitle}>Clean Architecture & Real-Time Platform</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => { setMode('login'); setStep(1); setError(''); setInfoMsg(''); }}
          style={[styles.tabBtn, mode === 'login' && styles.tabActive]}
        >
          <Text style={[styles.tabTxt, mode === 'login' && styles.tabTxtActive]}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setMode('register'); setStep(1); setError(''); setInfoMsg(''); }}
          style={[styles.tabBtn, mode === 'register' && styles.tabActive]}
        >
          <Text style={[styles.tabTxt, mode === 'register' && styles.tabTxtActive]}>Register</Text>
        </TouchableOpacity>
      </View>

      {error ? <View style={styles.errorBanner}><Text style={styles.errorTxt}>{error}</Text></View> : null}
      {infoMsg ? <View style={styles.infoBanner}><Text style={styles.infoTxt}>{infoMsg}</Text></View> : null}

      {mode === 'login' && (
        <View style={styles.form}>
          <Text style={styles.label}>Username or Email</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="e.g. alex or alex@nexus.com"
            placeholderTextColor="#8696a0"
            style={styles.input}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#8696a0"
            secureTextEntry
            style={styles.input}
          />

          <TouchableOpacity onPress={handleLogin} style={styles.submitBtn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'register' && step === 1 && (
        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput value={fullName} onChangeText={setFullName} placeholder="e.g. Alex Rivera" placeholderTextColor="#8696a0" style={styles.input} />

          <Text style={styles.label}>Unique @Username</Text>
          <TextInput value={username} onChangeText={setUsername} placeholder="e.g. alex" placeholderTextColor="#8696a0" style={styles.input} autoCapitalize="none" />

          <Text style={styles.label}>Email Address</Text>
          <TextInput value={email} onChangeText={setEmail} placeholder="e.g. alex@nexus.com" placeholderTextColor="#8696a0" style={styles.input} autoCapitalize="none" keyboardType="email-address" />

          <Text style={styles.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} placeholder="Password123!" placeholderTextColor="#8696a0" secureTextEntry style={styles.input} />

          <TouchableOpacity onPress={handleSendOtp} style={styles.submitBtn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>Send Verification OTP →</Text>}
          </TouchableOpacity>
        </View>
      )}

      {mode === 'register' && step === 2 && (
        <View style={styles.form}>
          <Text style={styles.label}>Enter 6-Digit Email OTP Code</Text>
          <TextInput
            value={otpCode}
            onChangeText={setOtpCode}
            placeholder="123456"
            placeholderTextColor="#8696a0"
            maxLength={6}
            keyboardType="number-pad"
            style={[styles.input, styles.otpInput]}
          />

          <TouchableOpacity onPress={handleRegisterFinal} style={styles.submitBtn} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitTxt}>Verify OTP & Complete</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: '#0b141a',
    justifyContent: 'center'
  },
  brandBox: {
    alignItems: 'center',
    marginBottom: 28
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00a884',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  brandTitle: {
    fontSize: 26,
    color: '#e9edef',
    fontWeight: 'bold'
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#8696a0',
    marginTop: 4
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#111b21',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222d34'
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  tabActive: {
    backgroundColor: '#00a884'
  },
  tabTxt: {
    color: '#8696a0',
    fontWeight: '600',
    fontSize: 13
  },
  tabTxtActive: {
    color: '#fff'
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  errorTxt: {
    color: '#f87171',
    fontSize: 13
  },
  infoBanner: {
    backgroundColor: 'rgba(0, 168, 132, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 132, 0.3)'
  },
  infoTxt: {
    color: '#00a884',
    fontSize: 13
  },
  form: {
    gap: 12
  },
  label: {
    fontSize: 12,
    color: '#8696a0',
    marginBottom: 4
  },
  input: {
    backgroundColor: '#202c33',
    borderWidth: 1,
    borderColor: '#2a3942',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#e9edef',
    fontSize: 14,
    marginBottom: 10
  },
  otpInput: {
    borderColor: '#00a884',
    fontSize: 22,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#00a884'
  },
  submitBtn: {
    backgroundColor: '#00a884',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  submitTxt: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  }
});
