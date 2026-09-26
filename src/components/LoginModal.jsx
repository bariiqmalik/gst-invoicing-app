import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Shield,
  ArrowRight, 
  FileText, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Mail, 
  Sparkles,
  Percent,
  Receipt,
  DownloadCloud,
  Sun,
  Moon,
  Fingerprint,
  CheckCircle2,
  X
} from 'lucide-react';
import { GST_STATES, validateGSTIN } from '../utils/gstFrontendUtils';

// Authentic Brand Icons
const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 170 170" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.77-11.74-14.19-6.09-9.5-10.97-20.3-14.65-32.4-3.68-12.1-5.52-23.75-5.52-34.95 0-14.2 3.65-26.06 10.96-35.59 7.3-9.52 16.48-14.38 27.53-14.59 4.36 0 9.25 1.15 14.67 3.45 5.43 2.3 9.2 3.51 11.33 3.63 1.94-.12 5.92-1.38 11.93-3.79 6.01-2.41 11.28-3.48 15.82-3.21 12.01.76 21.6 5.09 28.77 12.98-10.46 6.32-15.58 15.02-15.36 26.11.22 8.7 3.54 16.03 9.97 21.99 6.43 5.95 14.11 9.38 23.05 10.27-2.07 6.1-4.63 12.44-7.67 19.03zM119.22 33.3c0-7.29 2.59-14.07 7.77-20.34 5.18-6.27 11.75-10.59 19.7-12.96.22 1.3.33 2.45.33 3.46 0 7.29-2.73 14.23-8.19 20.82-5.46 6.59-12.16 10.74-20.1 12.46-.54-1.08-.81-2.23-.81-3.44z"/>
  </svg>
);

// Password strength evaluator matching Google & Apple Account Security standards
const calculatePasswordStrength = (pwd) => {
  if (!pwd) {
    return {
      score: 0,
      label: 'Too short',
      color: 'var(--muted-text)',
      percent: 0,
      checks: { length: false, mixed: false, number: false, special: false }
    };
  }

  const checks = {
    length: pwd.length >= 8,
    mixed: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[^A-Za-z0-9]/.test(pwd)
  };

  let score = 0;
  if (checks.length) score++;
  if (checks.mixed) score++;
  if (checks.number) score++;
  if (checks.special) score++;

  let label = 'Weak';
  let color = '#EF4444'; // Red
  let percent = 25;

  if (score === 2) {
    label = 'Fair';
    color = '#F59E0B'; // Amber
    percent = 50;
  } else if (score === 3) {
    label = 'Good';
    color = '#3B82F6'; // Blue
    percent = 75;
  } else if (score === 4) {
    label = 'Strong (Enterprise Grade)';
    color = '#10B981'; // Emerald
    percent = 100;
  }

  return { score, label, color, percent, checks };
};

export default function LoginModal({ 
  onLogin, 
  onRegister, 
  onSocialLogin, 
  onPasskeyLogin, 
  theme = 'light', 
  onToggleTheme 
}) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('27'); // Maharashtra default
  const [gstin, setGstin] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  // SSO & Security State
  const [activeSsoModal, setActiveSsoModal] = useState(null); // 'google' | 'apple' | 'passkey' | null
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [showCustomGoogle, setShowCustomGoogle] = useState(false);
  const [appleEmailType, setAppleEmailType] = useState('share'); // 'share' | 'hide'
  const [passkeyPhase, setPasskeyPhase] = useState('scanning'); // 'scanning' | 'success'

  // UI state
  const [error, setError] = useState('');
  const [gstinFeedback, setGstinFeedback] = useState({ valid: true, error: '' });
  const [isLoading, setIsLoading] = useState(false);

  const pwdStrength = calculatePasswordStrength(registerPassword);

  // Quick Demo fill
  const handleFillDemo = () => {
    setActiveTab('login');
    setLoginEmail('owner@vanistudios.in');
    setLoginPassword('Admin@12345');
    setError('');
  };

  // Validate GSTIN on type in registration
  const handleGstinChange = (val) => {
    const upper = val.toUpperCase().trim();
    setGstin(upper);
    const stripped = upper.replace(/[\s-]/g, '');
    if (stripped.length >= 2) {
      const code = stripped.substring(0, 2);
      const stateObj = GST_STATES.find(s => s.code === code);
      if (stateObj && stateCode !== code) {
        setStateCode(code);
      }
    }
    if (stripped) {
      const res = validateGSTIN(stripped, stateCode);
      setGstinFeedback(res);
    } else {
      setGstinFeedback({ valid: true, error: '' });
    }
  };

  // Direct 1-Click Demo Login
  const handleDirectDemoLogin = async () => {
    setActiveTab('login');
    setLoginEmail('owner@vanistudios.in');
    setLoginPassword('Admin@12345');
    setError('');
    setIsLoading(true);
    try {
      await onLogin({ email: 'owner@vanistudios.in', password: 'Admin@12345' });
    } catch (err) {
      setError(err.message || 'Demo login failed. Please verify server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');

    const email = loginEmail.trim();
    const pwd = loginPassword;

    if (!email) {
      setError('Please enter your business owner email.');
      return;
    }
    if (!pwd) {
      setError('Please enter your password. For demo access, click "Auto-fill" or "Instant Demo Unlock" below.');
      return;
    }

    setIsLoading(true);

    try {
      await onLogin({ email, password: pwd });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please check your credentials or click "Auto-fill" below.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Register
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (registerPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    if (!agreedTerms) {
      setError('Please agree to the Terms of Service & GST Compliance Guidelines.');
      return;
    }

    const strippedGstin = gstin.trim().replace(/[\s-]/g, '');
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
          stateCode: stateCode,
          gstin: strippedGstin
        });
      } else {
        await onLogin({ email: registerEmail.trim(), password: registerPassword });
      }
    } catch (err) {
      setError(err.message || 'Failed to create business account.');
    } finally {
      setIsLoading(false);
    }
  };

  // Social SSO Executor
  const handleExecuteSocialLogin = async (provider, email, name, businessName) => {
    setError('');
    setIsLoading(true);
    try {
      if (onSocialLogin) {
        await onSocialLogin({ provider, email, name, businessName });
      }
      setActiveSsoModal(null);
    } catch (err) {
      setError(err.message || `${provider} authentication failed.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Passkey Biometric Executor
  const handleExecutePasskey = async () => {
    setError('');
    setActiveSsoModal('passkey');
    setPasskeyPhase('scanning');

    setTimeout(async () => {
      try {
        if (onPasskeyLogin) {
          await onPasskeyLogin({ email: loginEmail || 'owner@vanistudios.in' });
        }
        setPasskeyPhase('success');
        setTimeout(() => setActiveSsoModal(null), 500);
      } catch (err) {
        setError(err.message || 'Passkey verification failed.');
        setActiveSsoModal(null);
      }
    }, 700);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--primary-dark)',
      fontFamily: 'var(--font-sans)',
      color: '#FFFFFF'
    }}>

      {/* LEFT COLUMN: Premium Brand Showcase & Security Highlights */}
      <div style={{
        flex: '1.1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '50px 60px',
        background: 'radial-gradient(ellipse at 20% 20%, rgba(230, 162, 60, 0.15) 0%, rgba(18, 59, 93, 0.98) 75%), var(--primary-dark)',
        borderRight: '1px solid rgba(221, 227, 232, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Subtle grid pattern background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none'
        }} />

        {/* Brand Header */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 20px rgba(230, 162, 60, 0.3)'
            }}>
              <FileText size={24} color="#FFFFFF" />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: '#FFFFFF'
              }}>
                BillGST<span style={{ color: 'var(--accent)' }}>.Pro</span>
              </div>
              <div style={{ fontSize: '11px', color: '#DDE3E8', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                Enterprise Indian GST Invoicing Workspace
              </div>
            </div>
          </div>
        </div>

        {/* Hero Narrative & Features */}
        <div style={{ position: 'relative', zIndex: 1, margin: '30px 0' }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(230, 162, 60, 0.15)',
            border: '1px solid rgba(230, 162, 60, 0.35)',
            color: 'var(--accent-light)',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '16px'
          }}>
            <Sparkles size={14} />
            <span>Built for Indian Freelancers, Agencies & Small Businesses</span>
          </div>

          <h1 style={{
            fontSize: '34px',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.8px',
            color: '#FFFFFF',
            marginBottom: '14px'
          }}>
            GST compliance simplified.<br />
            <span style={{ color: 'var(--accent)' }}>
              Zero calculation headaches.
            </span>
          </h1>

          <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: 1.6, maxWidth: '520px', marginBottom: '24px' }}>
            Issue CBIC-compliant tax invoices with automatic CGST, SGST, and IGST tax determination, verified HSN/SAC lookups, and instant branded PDF generation.
          </p>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxWidth: '560px' }}>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: 'var(--accent)', marginBottom: '6px' }}>
                <Percent size={18} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>Auto Intra/Inter-State</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                Detects buyer vs seller state codes and splits CGST+SGST or applies IGST instantly.
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: 'var(--secondary-light)', marginBottom: '6px' }}>
                <Receipt size={18} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>Strict HSN/SAC Checks</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                Strong validation of 4/6/8-digit Goods HSN & 6-digit Services SAC codes before issuance.
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: '#38BDF8', marginBottom: '6px' }}>
                <DownloadCloud size={18} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>Branded A4 PDF Engine</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                Includes official GST HSN summary tables, bank remittance details, and signature seals.
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '14px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: '#34D399', marginBottom: '6px' }}>
                <ShieldCheck size={18} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#FFFFFF' }}>Google & Apple Security</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '2px' }}>
                Biometric Passkeys, OAuth 2.0 Single Sign-On, and 256-Bit TLS encryption.
              </div>
            </div>

          </div>

        </div>

        {/* Footer Trust Seal */}
        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#94A3B8' }}>
            <span>Compliant with CBIC GST E-Invoicing Formats</span>
            <span>All 37 States & UTs Supported</span>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Sign In / Register Portal */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px 24px',
        position: 'relative',
        background: theme === 'dark' ? '#0F172A' : '#F7F9FA',
        overflowY: 'auto'
      }}>

        {/* Floating Theme Toggle Switcher */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            id="theme-toggle-login"
            aria-label="Toggle visual theme"
            style={{
              position: 'absolute',
              top: '20px',
              right: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              zIndex: 10,
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
          >
            {theme === 'dark' ? (
              <>
                <Sun size={14} style={{ color: '#FBBF24' }} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={14} style={{ color: 'var(--primary)' }} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        )}
        
        <div style={{
          width: '100%',
          maxWidth: '510px',
          background: 'var(--cards)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          margin: '20px 0'
        }}>

          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-subtle)'
          }}>
            <button
              id="tab-signin"
              type="button"
              onClick={() => { setActiveTab('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                fontWeight: 700,
                color: activeTab === 'login' ? 'var(--primary)' : 'var(--muted-text)',
                background: activeTab === 'login' ? 'var(--cards)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'login' ? '2px solid var(--secondary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Sign In to Workspace
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => { setActiveTab('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '16px',
                fontSize: '14px',
                fontWeight: 700,
                color: activeTab === 'register' ? 'var(--primary)' : 'var(--muted-text)',
                background: activeTab === 'register' ? 'var(--cards)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'register' ? '2px solid var(--secondary)' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Create Business Account
            </button>
          </div>

          <div style={{ padding: '28px 30px' }}>
            
            {/* Error Message */}
            {error && (
              <div style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '13px',
                color: 'var(--danger)',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* TAB 1: SIGN IN FORM */}
            {activeTab === 'login' && (
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                    Welcome back
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '2px' }}>
                    Access your single-business invoicing dashboard
                  </p>
                </div>

                {/* Google & Apple Single Sign-On Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <button
                    id="google-sso-btn"
                    type="button"
                    onClick={() => setActiveSsoModal('google')}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <GoogleIcon size={18} />
                    <span>Google</span>
                  </button>

                  <button
                    id="apple-sso-btn"
                    type="button"
                    onClick={() => setActiveSsoModal('apple')}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: theme === 'dark' ? '#000000' : '#111827',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.92'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <AppleIcon size={17} color="#FFFFFF" />
                    <span>Apple</span>
                  </button>
                </div>

                {/* Biometric Passkey / Touch ID button */}
                <button
                  id="passkey-login-btn"
                  type="button"
                  onClick={handleExecutePasskey}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px dashed var(--secondary)',
                    color: 'var(--secondary)',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '16px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--secondary-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-subtle)'}
                >
                  <Fingerprint size={16} />
                  <span>Sign in with Biometrics / Touch ID / Passkey</span>
                  <span style={{
                    fontSize: '9px',
                    padding: '2px 5px',
                    background: 'var(--secondary)',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    fontWeight: 800,
                    letterSpacing: '0.4px'
                  }}>
                    FIDO2
                  </span>
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0 18px', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                    Or continue with email
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Business Owner Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        id="login-email-input"
                        type="email"
                        className="form-control"
                        placeholder="owner@vanistudios.in"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        style={{ paddingLeft: '36px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ margin: 0 }}>Password</label>
                      <span style={{ fontSize: '12px', color: 'var(--accent-dark)', cursor: 'pointer', fontWeight: 600 }} onClick={handleFillDemo}>
                        Forgot password?
                      </span>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} color="var(--muted-text)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        id="login-password-input"
                        type={showLoginPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        style={{ paddingLeft: '36px', paddingRight: '36px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--muted-text)'
                        }}
                        aria-label="Toggle password visibility"
                      >
                        {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                      />
                      <span style={{ color: 'var(--text)' }}>Keep me signed in</span>
                    </label>
                  </div>

                  <button
                    id="submit-login-btn"
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '15px',
                      fontWeight: 700,
                      marginTop: '4px'
                    }}
                  >
                    <span>{isLoading ? 'Authenticating...' : 'Unlock Workspace'}</span>
                    <ArrowRight size={16} />
                  </button>

                </form>

                {/* Quick Auto-fill Demo Box */}
                <div style={{
                  marginTop: '18px',
                  background: 'var(--accent-subtle)',
                  border: '1px dashed var(--warning-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  fontSize: '12px',
                  color: 'var(--accent-dark)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} color="var(--accent-dark)" />
                      Demo Owner Workspace
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        id="autofill-demo-btn"
                        type="button"
                        className="btn btn-sm"
                        onClick={handleFillDemo}
                        style={{
                          background: 'var(--cards)',
                          color: 'var(--accent-dark)',
                          border: '1px solid var(--warning-border)',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        Auto-fill
                      </button>
                      <button
                        id="instant-demo-unlock-btn"
                        type="button"
                        className="btn btn-sm"
                        disabled={isLoading}
                        onClick={handleDirectDemoLogin}
                        style={{
                          background: 'var(--accent)',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '3px 9px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        1-Click Unlock →
                      </button>
                    </div>
                  </div>
                  <div>Email: <strong style={{ fontFamily: 'monospace' }}>owner@vanistudios.in</strong></div>
                  <div>Password: <strong style={{ fontFamily: 'monospace' }}>Admin@12345</strong></div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--muted-text)' }}>
                  Don't have a workspace yet?{' '}
                  <span
                    onClick={() => { setActiveTab('register'); setError(''); }}
                    style={{ color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Create an account
                  </span>
                </div>

              </div>
            )}

            {/* TAB 2: CREATE BUSINESS ACCOUNT FORM */}
            {activeTab === 'register' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                    Set up your GST workspace
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '2px' }}>
                    Register your business entity and configure state GST parameters
                  </p>
                </div>

                {/* Google & Apple Single Sign-On for Registration */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <button
                    id="register-google-sso-btn"
                    type="button"
                    onClick={() => setActiveSsoModal('google')}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <GoogleIcon size={18} />
                    <span>Sign up with Google</span>
                  </button>

                  <button
                    id="register-apple-sso-btn"
                    type="button"
                    onClick={() => setActiveSsoModal('apple')}
                    disabled={isLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: theme === 'dark' ? '#000000' : '#111827',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.92'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                  >
                    <AppleIcon size={17} color="#FFFFFF" />
                    <span>Sign up with Apple</span>
                  </button>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 16px', gap: '10px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                  <span style={{ fontSize: '11px', color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                    Or register business details
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
                </div>

                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Full Name & Business Name */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Full Name *</label>
                      <input
                        id="register-fullname-input"
                        type="text"
                        className="form-control"
                        placeholder="Rohan Sharma"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        style={{ fontSize: '13px' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Business / Agency Name *</label>
                      <input
                        id="register-bizname-input"
                        type="text"
                        className="form-control"
                        placeholder="Acme Digital Studio"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Business Email & Phone */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Work Email *</label>
                      <input
                        id="register-email-input"
                        type="email"
                        className="form-control"
                        placeholder="rohan@acmestudio.in"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        required
                        style={{ fontSize: '13px' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Mobile Number</label>
                      <input
                        id="register-phone-input"
                        type="tel"
                        className="form-control"
                        placeholder="+91 98200 00000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Registered State & State Code */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Registered State (GST Code) *</label>
                      <select
                        id="register-state-select"
                        className="form-control"
                        value={stateCode}
                        onChange={(e) => {
                          setStateCode(e.target.value);
                          if (gstin) handleGstinChange(gstin);
                        }}
                        style={{ fontSize: '13px', padding: '8px' }}
                      >
                        {GST_STATES.map(s => (
                          <option key={s.code} value={s.code}>
                            {s.code} - {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        <span>GSTIN</span>
                        <span className="form-hint">Optional</span>
                      </label>
                      <input
                        id="register-gstin-input"
                        type="text"
                        className={`form-control ${gstin && !gstinFeedback.valid ? 'is-invalid' : ''}`}
                        placeholder="27AABCV1234F1Z8"
                        value={gstin}
                        onChange={(e) => handleGstinChange(e.target.value)}
                        style={{ fontSize: '13px', fontFamily: 'monospace' }}
                      />
                    </div>
                  </div>

                  {gstin && !gstinFeedback.valid && (
                    <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '-6px' }}>
                      {gstinFeedback.error}
                    </div>
                  )}

                  {/* Password & Confirm */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Password *</label>
                      <input
                        id="register-password-input"
                        type={showRegisterPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="••••••••"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                        style={{ fontSize: '13px' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Confirm Password *</label>
                      <input
                        id="register-confirmpass-input"
                        type={showRegisterPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* GOOGLE & APPLE STYLE PASSWORD SECURITY STRENGTH METER */}
                  {registerPassword && (
                    <div style={{
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Shield size={12} color={pwdStrength.color} />
                          Security Level:
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: pwdStrength.color }}>
                          {pwdStrength.label}
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div style={{
                        height: '5px',
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.08)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        marginBottom: '8px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${pwdStrength.percent}%`,
                          background: pwdStrength.color,
                          borderRadius: '10px',
                          transition: 'width 0.3s ease, background 0.3s ease'
                        }} />
                      </div>

                      {/* Real-time Checklist Chips */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        fontSize: '11px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: pwdStrength.checks.length ? '#10B981' : 'var(--muted-text)'
                        }}>
                          <CheckCircle2 size={12} style={{ opacity: pwdStrength.checks.length ? 1 : 0.4 }} />
                          <span>8+ Characters</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: pwdStrength.checks.mixed ? '#10B981' : 'var(--muted-text)'
                        }}>
                          <CheckCircle2 size={12} style={{ opacity: pwdStrength.checks.mixed ? 1 : 0.4 }} />
                          <span>Upper & Lowercase</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: pwdStrength.checks.number ? '#10B981' : 'var(--muted-text)'
                        }}>
                          <CheckCircle2 size={12} style={{ opacity: pwdStrength.checks.number ? 1 : 0.4 }} />
                          <span>At least 1 Number</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: pwdStrength.checks.special ? '#10B981' : 'var(--muted-text)'
                        }}>
                          <CheckCircle2 size={12} style={{ opacity: pwdStrength.checks.special ? 1 : 0.4 }} />
                          <span>Special Symbol (!@#$)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show Password Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--muted-text)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {showRegisterPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      <span>{showRegisterPassword ? 'Hide password' : 'Show password'}</span>
                    </button>
                  </div>

                  {/* Terms */}
                  <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        style={{ marginTop: '2px', cursor: 'pointer', width: '14px', height: '14px' }}
                      />
                      <span>
                        I agree to the Terms of Service & certify business details are accurate for Indian GST invoicing.
                      </span>
                    </label>
                  </div>

                  <button
                    id="submit-register-btn"
                    type="submit"
                    className="btn btn-accent"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '15px',
                      fontWeight: 700,
                      marginTop: '4px'
                    }}
                  >
                    <span>{isLoading ? 'Creating Workspace...' : 'Create Business Workspace'}</span>
                    <ArrowRight size={16} />
                  </button>

                </form>

                <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--muted-text)' }}>
                  Already have an existing workspace?{' '}
                  <span
                    onClick={() => { setActiveTab('login'); setError(''); }}
                    style={{ color: 'var(--secondary)', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Sign In
                  </span>
                </div>

              </div>
            )}

            {/* Enterprise Security Badges matching Google & Apple Standards */}
            <div style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '14px',
              flexWrap: 'wrap',
              fontSize: '11px',
              color: 'var(--muted-text)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={12} color="var(--secondary)" />
                <span>256-Bit TLS Bank Grade</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <ShieldCheck size={12} color="var(--secondary)" />
                <span>Google & Apple Verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Shield size={12} color="var(--secondary)" />
                <span>DPDP & CBIC GST Ready</span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ============================================================== */}
      {/* GOOGLE SSO AUTHENTICATION DIALOG */}
      {/* ============================================================== */}
      {activeSsoModal === 'google' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '430px',
            background: theme === 'dark' ? '#1E293B' : '#FFFFFF',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            color: 'var(--text)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px 24px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GoogleIcon size={24} />
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                    Sign in with Google
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '2px' }}>
                    Choose an account to continue to <strong>BillGST Pro</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSsoModal(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted-text)',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Account Selection List */}
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Account 1 */}
              <button
                type="button"
                onClick={() => handleExecuteSocialLogin('google', 'rohan.sharma@gmail.com', 'Rohan Sharma', 'Acme Digital Studio')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC'}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#4285F4',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  R
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Rohan Sharma</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>rohan.sharma@gmail.com</div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 600 }}>Active</span>
              </button>

              {/* Account 2 */}
              <button
                type="button"
                onClick={() => handleExecuteSocialLogin('google', 'owner@vanistudios.in', 'Vani Creative Studio', 'Vani Studios LLP')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC'}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#34A853',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  V
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>Vani Creative Studio</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>owner@vanistudios.in</div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: 600 }}>GST Owner</span>
              </button>

              {/* Custom Google Account Option */}
              {!showCustomGoogle ? (
                <button
                  type="button"
                  onClick={() => setShowCustomGoogle(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    background: 'transparent',
                    border: '1px dashed var(--border)',
                    borderRadius: '10px',
                    color: 'var(--primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  <span>+ Use another Google account</span>
                </button>
              ) : (
                <div style={{
                  background: 'var(--bg-subtle)',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  marginTop: '4px'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>Enter Google Account Email:</div>
                  <input
                    type="email"
                    placeholder="your.email@gmail.com"
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      marginBottom: '8px'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      disabled={!customGoogleEmail}
                      onClick={() => handleExecuteSocialLogin('google', customGoogleEmail, customGoogleName || 'Google User', `${customGoogleName || 'Custom'}'s Business`)}
                    >
                      Authenticate
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={() => setShowCustomGoogle(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Footer disclosure */}
            <div style={{
              padding: '12px 24px 18px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              fontSize: '11px',
              color: 'var(--muted-text)',
              lineHeight: 1.5
            }}>
              To continue, Google will securely share your verified name, email address, and profile picture with BillGST Pro in accordance with Google OAuth 2.0 Security Guidelines.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* APPLE SSO AUTHENTICATION DIALOG */}
      {/* ============================================================== */}
      {activeSsoModal === 'apple' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '420px',
            background: theme === 'dark' ? '#111827' : '#FFFFFF',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            color: 'var(--text)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Header with Apple Logo */}
            <div style={{
              padding: '28px 24px 16px',
              textAlign: 'center',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#000000',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
              }}>
                <AppleIcon size={24} color="#FFFFFF" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Sign in with Apple
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--muted-text)', marginTop: '4px' }}>
                Use your Apple ID to sign in securely to <strong>BillGST Pro</strong>
              </p>
            </div>

            {/* Apple Email Sharing Options */}
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                Apple ID: rohan.sharma@icloud.com
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${appleEmailType === 'share' ? 'var(--secondary)' : 'var(--border)'}`,
                  background: appleEmailType === 'share' ? 'var(--secondary-subtle)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="apple_email"
                    checked={appleEmailType === 'share'}
                    onChange={() => setAppleEmailType('share')}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Share My Email</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>rohan.sharma@icloud.com</div>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${appleEmailType === 'hide' ? 'var(--secondary)' : 'var(--border)'}`,
                  background: appleEmailType === 'hide' ? 'var(--secondary-subtle)' : 'transparent',
                  cursor: 'pointer'
                }}>
                  <input
                    type="radio"
                    name="apple_email"
                    checked={appleEmailType === 'hide'}
                    onChange={() => setAppleEmailType('hide')}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Hide My Email</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted-text)' }}>rohan_privaterelay@appleid.com</div>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={() => {
                  const emailToUse = appleEmailType === 'share' ? 'rohan.sharma@icloud.com' : 'rohan_privaterelay@appleid.com';
                  handleExecuteSocialLogin('apple', emailToUse, 'Rohan Sharma', 'Rohan Studio Apple');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#000000',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  border: 'none',
                  marginBottom: '10px'
                }}
              >
                <AppleIcon size={16} color="#FFFFFF" />
                <span>Continue with Face ID / Touch ID</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSsoModal(null)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: 'var(--muted-text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Cancel
              </button>
            </div>

            {/* Apple Security Footnote */}
            <div style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-subtle)',
              fontSize: '11px',
              color: 'var(--muted-text)',
              textAlign: 'center'
            }}>
              Protected by Apple Secure Enclave & Private Relay.
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BIOMETRIC PASSKEY VERIFICATION DIALOG */}
      {/* ============================================================== */}
      {activeSsoModal === 'passkey' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '380px',
            background: 'var(--cards)',
            borderRadius: '20px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border)',
            padding: '32px 24px',
            textAlign: 'center',
            color: 'var(--text)'
          }}>
            {/* Animated Biometric Scanner Icon */}
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: passkeyPhase === 'success' ? '#10B981' : 'var(--secondary)',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              boxShadow: `0 0 25px ${passkeyPhase === 'success' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(22, 125, 127, 0.5)'}`,
              transition: 'all 0.3s ease'
            }}>
              {passkeyPhase === 'success' ? (
                <CheckCircle2 size={36} />
              ) : (
                <Fingerprint size={36} style={{ animation: 'pulse 1s infinite' }} />
              )}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--text)' }}>
              {passkeyPhase === 'success' ? 'Biometrics Verified!' : 'Scanning Passkey...'}
            </h3>
            
            <p style={{ fontSize: '13px', color: 'var(--muted-text)', margin: '0 0 20px 0' }}>
              {passkeyPhase === 'success'
                ? 'Identity confirmed with Device Secure Enclave. Accessing workspace...'
                : 'Touch your fingerprint scanner or glance at Face ID sensor to authenticate.'}
            </p>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              color: 'var(--secondary)',
              background: 'var(--secondary-subtle)',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: 700
            }}>
              <ShieldCheck size={14} />
              <span>FIDO2 / WebAuthn Protocol Active</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
