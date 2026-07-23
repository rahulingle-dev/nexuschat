import React, { useState } from 'react';
import { KeyRound, User, Mail, Lock, Sparkles, Eye, EyeOff, ShieldCheck, Video, MessageSquare, ArrowRight } from 'lucide-react';
import { sendOtp, registerUser, loginUser, sendForgotPasswordOtp, resetPassword } from '../services/api';

export const AuthScreen = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [step, setStep] = useState(1);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [bio, setBio] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleSendOtp = async () => {
    if (!email || !username || !password || !fullName) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendOtp(email, 'Register');
      setInfoMsg(`Verification OTP sent to ${email}. Check terminal log.`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFinal = async (e) => {
    if (e) e.preventDefault();
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

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
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

  const handleSendForgotOtp = async () => {
    if (!email) {
      setError('Please enter your account email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendForgotPasswordOtp(email);
      setInfoMsg(`Password reset OTP sent to ${email}.`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordFinal = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || !newPassword) {
      setError('Please enter OTP code and new password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await resetPassword({ email, otpCode, newPassword });
      setInfoMsg('Password reset successful! You can now sign in.');
      setMode('login');
      setStep(1);
    } catch (err) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-hero-wrapper">
      {/* Dynamic Background Image Overlay */}
      <div className="auth-bg-overlay" />

      {/* Main Container */}
      <div className="auth-desktop-container">
        {/* Left Side: Brand Showcase */}
        <div className="auth-showcase-panel">
          <div className="showcase-badge">
            <Sparkles size={16} className="text-cyan-400" />
            <span>Next-Gen Real-Time Platform</span>
          </div>

          <h1 className="showcase-title">
            Connect, Chat & Call <br />
            <span className="text-gradient">Without Boundaries.</span>
          </h1>

          <p className="showcase-description">
            Experience ultra-fast real-time messaging, end-to-end SignalR WebSockets, WebRTC voice/video calls, and voice dictation in one unified web workspace.
          </p>

          <div className="showcase-features-grid">
            <div className="feature-card">
              <MessageSquare size={20} className="feature-icon text-indigo-400" />
              <div>
                <h4>Real-Time Chat</h4>
                <p>Instant SignalR WebSocket synchronization</p>
              </div>
            </div>

            <div className="feature-card">
              <Video size={20} className="feature-icon text-cyan-400" />
              <div>
                <h4>HD Video Calls</h4>
                <p>Low-latency browser WebRTC calling</p>
              </div>
            </div>

            <div className="feature-card">
              <ShieldCheck size={20} className="feature-icon text-emerald-400" />
              <div>
                <h4>Secure Security</h4>
                <p>6-digit OTP account verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Glassmorphic Card */}
        <div className="auth-card-panel">
          <div className="auth-card-glass">
            {/* Header Brand Icon */}
            <div className="auth-card-header">
              <div className="auth-brand-icon">
                <KeyRound size={26} className="text-white" />
              </div>
              <h2 className="auth-card-title">Welcome to NexusChat</h2>
              <p className="auth-card-subtitle">Sign in to your account or register to get started</p>
            </div>

            {/* Tab Selection */}
            <div className="auth-tab-switch">
              <button
                type="button"
                className={`tab-switch-btn ${mode === 'login' ? 'active' : ''}`}
                onClick={() => { setMode('login'); setStep(1); setError(''); setInfoMsg(''); }}
              >
                <span>Sign In</span>
              </button>
              <button
                type="button"
                className={`tab-switch-btn ${mode === 'register' ? 'active' : ''}`}
                onClick={() => { setMode('register'); setStep(1); setError(''); setInfoMsg(''); }}
              >
                <span>Register</span>
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="auth-alert alert-error">
                <span>{error}</span>
              </div>
            )}
            {infoMsg && (
              <div className="auth-alert alert-info">
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="auth-form-body">
                <div className="form-input-group">
                  <label>Username or Email</label>
                  <div className="input-field-box">
                    <User size={18} className="field-icon" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex or alex@nexus.com"
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Password</label>
                  <div className="input-field-box">
                    <Lock size={18} className="field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-forgot-row">
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => { setMode('forgot'); setStep(1); setError(''); setInfoMsg(''); }}
                  >
                    Forgot Password?
                  </button>
                </div>

                <button type="submit" className="auth-action-btn" disabled={loading}>
                  {loading ? <div className="btn-spinner" /> : <><span>Sign In to NexusChat</span> <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            {/* Register Step 1 */}
            {mode === 'register' && step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }} className="auth-form-body">
                <div className="form-input-group">
                  <label>Full Name</label>
                  <div className="input-field-box">
                    <User size={18} className="field-icon" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Rivera"
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Unique @Username</label>
                  <div className="input-field-box">
                    <Sparkles size={18} className="field-icon" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex"
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Email Address</label>
                  <div className="input-field-box">
                    <Mail size={18} className="field-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@nexus.com"
                    />
                  </div>
                </div>

                <div className="form-input-group">
                  <label>Password</label>
                  <div className="input-field-box">
                    <Lock size={18} className="field-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password123!"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="auth-action-btn" disabled={loading}>
                  {loading ? <div className="btn-spinner" /> : <><span>Send Verification OTP</span> <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            {/* Register Step 2 */}
            {mode === 'register' && step === 2 && (
              <form onSubmit={handleRegisterFinal} className="auth-form-body">
                <div className="form-input-group text-center">
                  <label>Enter 6-Digit Verification OTP</label>
                  <input
                    type="text"
                    className="otp-boxed-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>

                <button type="submit" className="auth-action-btn" disabled={loading}>
                  {loading ? <div className="btn-spinner" /> : <><span>Verify OTP & Complete</span> <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            {/* Forgot Password Step 1 */}
            {mode === 'forgot' && step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); handleSendForgotOtp(); }} className="auth-form-body">
                <div className="form-input-group">
                  <label>Account Email Address</label>
                  <div className="input-field-box">
                    <Mail size={18} className="field-icon" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@nexus.com"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-action-btn" disabled={loading}>
                  {loading ? <div className="btn-spinner" /> : <><span>Send Reset Code</span> <ArrowRight size={18} /></>}
                </button>
              </form>
            )}

            {/* Forgot Password Step 2 */}
            {mode === 'forgot' && step === 2 && (
              <form onSubmit={handleResetPasswordFinal} className="auth-form-body">
                <div className="form-input-group">
                  <label>6-Digit OTP Code</label>
                  <input
                    type="text"
                    className="otp-boxed-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                  />
                </div>

                <div className="form-input-group">
                  <label>New Password</label>
                  <div className="input-field-box">
                    <Lock size={18} className="field-icon" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="NewPassword123!"
                    />
                  </div>
                </div>

                <button type="submit" className="auth-action-btn" disabled={loading}>
                  {loading ? <div className="btn-spinner" /> : <><span>Reset Password</span> <ArrowRight size={18} /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
