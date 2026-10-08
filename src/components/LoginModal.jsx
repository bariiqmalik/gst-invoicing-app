import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  FileText, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sun, 
  Moon, 
  Fingerprint, 
  ShieldCheck
} from 'lucide-react';
import { GST_STATES, validateGSTIN } from '../utils/gstFrontendUtils';
import { api } from '../services/api';
import { supabase } from '../lib/supabaseClient';

// Minimalist Brand Icons for Social Logins
const GithubIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
  </svg>
);

const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 170 170" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.77-11.74-14.19-6.09-9.5-10.97-20.3-14.65-32.4-3.68-12.1-5.52-23.75-5.52-34.95 0-14.2 3.65-26.06 10.96-35.59 7.3-9.52 16.48-14.38 27.53-14.59 4.36 0 9.25 1.15 14.67 3.45 5.43 2.3 9.2 3.51 11.33 3.63 1.94-.12 5.92-1.38 11.93-3.79 6.01-2.41 11.28-3.48 15.82-3.21 12.01.76 21.6 5.09 28.77 12.98-10.46 6.32-15.58 15.02-15.36 26.11.22 8.7 3.54 16.03 9.97 21.99 6.43 5.95 14.11 9.38 23.05 10.27-2.07 6.1-4.63 12.44-7.67 19.03zM119.22 33.3c0-7.29 2.59-14.07 7.77-20.34 5.18-6.27 11.75-10.59 19.7-12.96.22 1.3.33 2.45.33 3.46 0 7.29-2.73 14.23-8.19 20.82-5.46 6.59-12.16 10.74-20.1 12.46-.54-1.08-.81-2.23-.81-3.44z"/>
  </svg>
);

// Password strength evaluator
const calculatePasswordStrength = (pwd) => {
  if (!pwd) return { score: 0, label: '', percent: 0, color: 'transparent' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score, label: 'Weak', percent: 25, color: '#EF4444' };
  if (score === 2) return { score, label: 'Fair', percent: 50, color: '#F59E0B' };
  if (score === 3) return { score, label: 'Good', percent: 75, color: '#8ECA3C' };
  return { score, label: 'Strong', percent: 100, color: '#499A13' };
};

export default function LoginModal({ 
  onLogin, 
  onRegister, 
  onSocialLogin, 
  onPasskeyLogin, 
  theme = 'light', 
  onToggleTheme 
}) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'

  // Login form state - clean, zero demo accounts
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('27'); // Maharashtra default
  const [gstin, setGstin] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Status & loading
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passkeyActive, setPasskeyActive] = useState(false);

  // Auto-detect if no accounts exist yet to default to registration
  useEffect(() => {
    let isMounted = true;
    api.getAuthStatus()
      .then(res => {
        if (isMounted && res && res.hasUsers === false) {
          setActiveTab('register');
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const pwdStrength = calculatePasswordStrength(registerPassword);

  // Submit Login
  const handleLoginSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    const email = loginEmail.trim();
    const pwd = loginPassword;

    if (!email) {
      setError('Please enter your business email.');
      return;
    }
    if (!pwd) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      await onLogin({ email, password: pwd });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please verify your credentials or create a workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!businessName.trim()) {
      setError('Please provide your business legal name.');
      return;
    }
    if (!registerEmail.trim()) {
      setError('Please provide an email address.');
      return;
    }
    if (registerPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    const strippedGstin = gstin.trim().replace(/[\s-]/g, '').toUpperCase();
    if (strippedGstin) {
      const res = validateGSTIN(strippedGstin, stateCode);
      if (!res.valid) {
        setError(`GSTIN validation error: ${res.error}`);
        return;
      }
    }

    const stateObj = GST_STATES.find(s => s.code === stateCode);

    setIsLoading(true);
    try {
      if (onRegister) {
        await onRegister({
          name: fullName.trim(),
          businessName: businessName.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
          phone: phone.trim(),
          state: stateObj ? stateObj.name : 'Maharashtra',
          stateCode,
          gstin: strippedGstin
        });
      } else {
        await onLogin({ email: registerEmail.trim(), password: registerPassword });
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please check details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Supabase GitHub OAuth
  const handleGitHubLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      console.error('OAuth error:', error.message);
      setError(`OAuth error: ${error.message}`);
    }
  };

  // Quick Social SSO
  const handleSocialClick = async (provider) => {
    setError('');
    const emailToUse = (activeTab === 'register' ? registerEmail : loginEmail).trim();
    if (!emailToUse) {
      setError(`Please enter your email above to continue with ${provider === 'google' ? 'Google' : 'Apple'} Sign-In.`);
      return;
    }
    setIsLoading(true);
    try {
      const nameToUse = fullName.trim() || emailToUse.split('@')[0];
      const bizToUse = businessName.trim() || `${nameToUse}'s Workspace`;
      if (onSocialLogin) {
        await onSocialLogin({ provider, email: emailToUse, name: nameToUse, businessName: bizToUse });
      }
    } catch (err) {
      setError(err.message || `${provider} authentication failed.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Passkey Biometric
  const handlePasskeyClick = async () => {
    setError('');
    const emailToUse = (loginEmail || registerEmail).trim();
    if (!emailToUse) {
      setError('Please enter your account email above to authenticate with Passkey / Touch ID.');
      return;
    }
    setPasskeyActive(true);
    try {
      if (onPasskeyLogin) {
        await onPasskeyLogin({ email: emailToUse });
      }
    } catch (err) {
      setError(err.message || 'Passkey verification failed.');
    } finally {
      setPasskeyActive(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--background)',
      position: 'relative',
      padding: '24px 16px',
      overflow: 'hidden'
    }}>
      
      {/* Subtle organic background ambient glow using the palette */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(187, 220, 18, 0.12) 0%, rgba(73, 154, 19, 0.04) 60%, transparent 80%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-10%',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(39, 111, 39, 0.15) 0%, rgba(142, 202, 60, 0.05) 60%, transparent 80%)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />

      {/* Top Bar: Theme Toggle & Status */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        zIndex: 10
      }}>
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            style={{
              background: 'var(--cards)',
              border: '1px solid var(--border)',
              borderRadius: '999px',
              padding: '6px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} color="var(--palette-lime)" />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={14} color="var(--palette-forest)" />
                <span>Dark</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Minimalist Login Card */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'var(--cards)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        boxShadow: 'var(--shadow-xl)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 5,
        animation: 'fadeIn 0.25s ease-out'
      }}>

        {/* ── Top 4-Color Swatch Accent Band (User Swatch: #499A13, #BBDC12, #8ECA3C, #276F27) ── */}
        <div style={{ display: 'flex', height: '5px', width: '100%' }}>
          <div style={{ flex: 1, background: '#499A13' }} title="#499A13 (Meadow Green)" />
          <div style={{ flex: 1, background: '#BBDC12' }} title="#BBDC12 (Electric Lime)" />
          <div style={{ flex: 1, background: '#8ECA3C' }} title="#8ECA3C (Apple Leaf)" />
          <div style={{ flex: 1, background: '#276F27' }} title="#276F27 (Deep Forest)" />
        </div>

        {/* Card Content with Breathing Room */}
        <div style={{ padding: '36px 32px 32px 32px' }}>
          
          {/* Minimal Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--palette-forest) 0%, var(--palette-green) 100%)',
              color: '#FFFFFF',
              boxShadow: '0 6px 16px rgba(39, 111, 39, 0.25)',
              marginBottom: '14px',
              position: 'relative'
            }}>
              <FileText size={24} color="#FFFFFF" />
              {/* Luminous Lime dot accent */}
              <div style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--palette-lime)',
                boxShadow: '0 0 8px var(--palette-lime)'
              }} />
            </div>

            <h1 style={{
              fontSize: '22px',
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span>BillGST</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                background: 'var(--palette-lime)',
                color: '#142914',
                padding: '2px 7px',
                borderRadius: '6px',
                letterSpacing: '0.4px',
                textTransform: 'uppercase'
              }}>
                PRO
              </span>
            </h1>

            <p style={{
              fontSize: '13px',
              color: 'var(--muted-text)',
              marginTop: '4px',
              fontWeight: 500
            }}>
              CBIC-Compliant Indian GST Tax Invoicing
            </p>
          </div>

          {/* Minimal Tab Switcher (Sign In vs Register) */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-subtle)',
            padding: '4px',
            borderRadius: '10px',
            marginBottom: '22px',
            border: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: activeTab === 'login' ? 700 : 500,
                color: activeTab === 'login' ? 'var(--primary)' : 'var(--muted-text)',
                background: activeTab === 'login' ? 'var(--cards)' : 'transparent',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === 'login' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: activeTab === 'register' ? 700 : 500,
                color: activeTab === 'register' ? 'var(--primary)' : 'var(--muted-text)',
                background: activeTab === 'register' ? 'var(--cards)' : 'transparent',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: activeTab === 'register' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Create Account
            </button>
          </div>

          {/* Inline Error Alert */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'var(--danger-light)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              fontSize: '12px',
              marginBottom: '18px',
              lineHeight: 1.4
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          {/* ═════════ TAB 1: MINIMALIST SIGN IN ═════════ */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              
              {/* Email Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '6px'
                }}>
                  Business Email
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@company.in"
                    className="form-control"
                    style={{ paddingLeft: '38px', height: '42px', fontSize: '13px' }}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  marginBottom: '6px'
                }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="form-control"
                    style={{ paddingLeft: '38px', paddingRight: '38px', height: '42px', fontSize: '13px' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'var(--muted-text)'
                    }}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember me row */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '18px',
                fontSize: '12px'
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: 'var(--muted-text)' }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: 'var(--palette-green)' }}
                  />
                  <span>Remember this device</span>
                </label>
                <span style={{ color: 'var(--muted-text)', fontSize: '11px' }}>
                  Single-business secure
                </span>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '44px',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

            </form>
          )}

          {/* ═════════ TAB 2: MINIMALIST REGISTRATION ═════════ */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Business Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patel Exports"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Business Email
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="contact@business.in"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    State / UT
                  </label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px', paddingRight: '20px' }}
                  >
                    {GST_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="27ABCDE1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px', fontFamily: 'monospace' }}
                    maxLength={15}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                  Create Password (min 6 characters)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="form-control"
                    style={{ height: '38px', fontSize: '12px', paddingRight: '36px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      color: 'var(--muted-text)'
                    }}
                  >
                    {showRegisterPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {registerPassword && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ height: '3px', width: '100%', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pwdStrength.percent}%`, background: pwdStrength.color, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Register Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '42px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '16px'
                }}
              >
                {isLoading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <span>Create GST Workspace</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

            </form>
          )}

          {/* ═════════ MINIMALIST SSO & PASSKEY ROW ═════════ */}
          <div style={{
            position: 'relative',
            textAlign: 'center',
            margin: '14px 0 16px 0'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: '1px',
              background: 'var(--border)'
            }} />
            <span style={{
              position: 'relative',
              background: 'var(--cards)',
              padding: '0 10px',
              fontSize: '11px',
              color: 'var(--muted-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              or continue with
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {/* GitHub OAuth via Supabase */}
            <button
              id="github-login-btn"
              type="button"
              onClick={handleGitHubLogin}
              disabled={isLoading}
              title="Sign in with GitHub OAuth"
              style={{
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
                transition: 'all 0.15s ease'
              }}
            >
              <GithubIcon size={16} />
              <span>GitHub</span>
            </button>

            {/* Google */}
            <button
              id="google-login-btn"
              type="button"
              onClick={() => handleSocialClick('google')}
              disabled={isLoading}
              title="Sign in with Google Workspace"
              style={{
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
                transition: 'all 0.15s ease'
              }}
            >
              <GoogleIcon size={16} />
              <span>Google</span>
            </button>

            {/* Apple */}
            <button
              id="apple-login-btn"
              type="button"
              onClick={() => handleSocialClick('apple')}
              disabled={isLoading}
              title="Sign in with Apple ID"
              style={{
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
                transition: 'all 0.15s ease'
              }}
            >
              <AppleIcon size={16} />
              <span>Apple</span>
            </button>

            {/* Biometric Passkey */}
            <button
              id="passkey-login-btn"
              type="button"
              onClick={handlePasskeyClick}
              disabled={isLoading || passkeyActive}
              title="Authenticate via Biometric Passkey"
              style={{
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text)',
                transition: 'all 0.15s ease'
              }}
            >
              <Fingerprint size={16} color="var(--palette-green)" />
              <span>Touch ID</span>
            </button>
          </div>

          {/* Minimal Trust Indicator */}
          <div style={{
            marginTop: '20px',
            paddingTop: '14px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--muted-text)'
          }}>
            <ShieldCheck size={13} color="var(--palette-green)" />
            <span>256-Bit TLS • CBIC Standard Compliant</span>
          </div>

        </div>

      </div>

      {/* Footer Minimalist Swatch Legend */}
      <div style={{
        marginTop: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '11px',
        color: 'var(--muted-text)',
        zIndex: 5
      }}>
        <span>BillGST Pro</span>
        <span>•</span>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#499A13' }} title="#499A13" />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#BBDC12' }} title="#BBDC12" />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8ECA3C' }} title="#8ECA3C" />
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#276F27' }} title="#276F27" />
        </div>
        <span>•</span>
        <span>Minimalist & Clean</span>
      </div>

    </div>
  );
}
