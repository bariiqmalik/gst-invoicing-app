import React, { useState } from 'react';
import { 
  Lock, 
  ShieldCheck, 
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
  Moon
} from 'lucide-react';
import { GST_STATES, validateGSTIN } from '../utils/gstFrontendUtils';

export default function LoginModal({ onLogin, onRegister, theme = 'light', onToggleTheme }) {
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

  // UI state
  const [error, setError] = useState('');
  const [gstinFeedback, setGstinFeedback] = useState({ valid: true, error: '' });
  const [isLoading, setIsLoading] = useState(false);

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

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await onLogin({ email: loginEmail.trim(), password: loginPassword });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
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

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      background: 'var(--primary-dark)',
      fontFamily: 'var(--font-sans)',
      color: '#FFFFFF'
    }}>

      {/* LEFT COLUMN: Premium Brand Showcase */}
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
        <div style={{ position: 'relative', zIndex: 1, margin: '40px 0' }}>
          
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
            marginBottom: '20px'
          }}>
            <Sparkles size={14} />
            <span>Built for Indian Freelancers, Agencies & Small Businesses</span>
          </div>

          <h1 style={{
            fontSize: '36px',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.8px',
            color: '#FFFFFF',
            marginBottom: '16px'
          }}>
            GST compliance simplified.<br />
            <span style={{ color: 'var(--accent)' }}>
              Zero calculation headaches.
            </span>
          </h1>

          <p style={{ fontSize: '15px', color: '#CBD5E1', lineHeight: 1.6, maxWidth: '520px', marginBottom: '32px' }}>
            Issue CBIC-compliant tax invoices with automatic CGST, SGST, and IGST tax determination, verified HSN/SAC lookups, and instant branded PDF generation.
          </p>

          {/* Feature Highlights Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxWidth: '560px' }}>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: 'var(--accent)', marginBottom: '8px' }}>
                <Percent size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>Auto Intra/Inter-State</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                Detects buyer vs seller state codes and splits CGST+SGST or applies IGST instantly.
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: 'var(--secondary-light)', marginBottom: '8px' }}>
                <Receipt size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>Strict HSN/SAC Checks</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                Strong validation of 4/6/8-digit Goods HSN & 6-digit Services SAC codes before issuance.
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: '#38BDF8', marginBottom: '8px' }}>
                <DownloadCloud size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>Branded A4 PDF Engine</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                Includes official GST HSN summary tables, bank remittance details, and signature seals.
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '16px',
              backdropFilter: 'blur(8px)'
            }}>
              <div style={{ color: '#C084FC', marginBottom: '8px' }}>
                <ShieldCheck size={20} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#FFFFFF' }}>Single-Tenant Privacy</div>
              <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                Isolated business workspace with sanitized API responses and zero raw database exposure.
              </div>
            </div>

          </div>

        </div>

        {/* Footer Trust Seal */}
        <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '20px' }}>
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
        padding: '40px 30px',
        background: 'var(--primary-dark)',
        position: 'relative'
      }}>
        {/* Floating Theme Toggle in Login Screen */}
        {onToggleTheme && (
          <button
            id="login-theme-toggle-btn"
            type="button"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              zIndex: 10,
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
                <Moon size={14} style={{ color: '#FFFFFF' }} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        )}
        
        <div style={{
          width: '100%',
          maxWidth: '500px',
          background: 'var(--cards)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          color: 'var(--text)',
          border: '1px solid var(--border)'
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

          <div style={{ padding: '32px' }}>
            
            {/* Error Message */}
            {error && (
              <div style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                fontSize: '13px',
                color: 'var(--danger)',
                marginBottom: '20px',
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
                <div style={{ marginBottom: '22px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                    Welcome back
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '2px' }}>
                    Access your single-business invoicing dashboard
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
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
                      <span style={{ fontSize: '12px', color: 'var(--accent-dark)', cursor: 'pointer', fontWeight: 500 }} onClick={handleFillDemo}>
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
                  marginTop: '24px',
                  background: 'var(--accent-subtle)',
                  border: '1px dashed var(--warning-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  fontSize: '12px',
                  color: 'var(--accent-dark)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={14} color="var(--accent-dark)" />
                      Demo Owner Workspace
                    </span>
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
                  </div>
                  <div>Email: <strong style={{ fontFamily: 'monospace' }}>owner@vanistudios.in</strong></div>
                  <div>Password: <strong style={{ fontFamily: 'monospace' }}>Admin@12345</strong></div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted-text)' }}>
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
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                    Set up your GST workspace
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--muted-text)', marginTop: '2px' }}>
                    Register your business entity and configure state GST parameters
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
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
                    <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '-8px' }}>
                      {gstinFeedback.error}
                    </div>
                  )}

                  {/* Password & Confirm */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Password (Min 6 chars) *</label>
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

          </div>

        </div>

      </div>

    </div>
  );
}
