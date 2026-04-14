import React, { useState } from 'react';
import axios from 'axios';
import { Send, AlertCircle, Fingerprint, Phone, Lock, Eye, EyeOff } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Switch modes and clear all state
  const switchMode = () => {
    setIsRegister(prev => !prev);
    setName('');
    setMobileNumber('');
    setPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (mobileNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (isRegister && name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name: name.trim(), mobileNumber: mobileNumber.trim(), password }
      : { mobileNumber: mobileNumber.trim(), password };

    try {
      const res = await axios.post(endpoint, payload);
      if (!res.data.token || !res.data.user) {
        throw new Error('Invalid response from server. Please try again.');
      }
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err) {
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '8px 0', background: 'transparent', border: 'none',
    borderBottom: '1px solid #dadce0', fontSize: '0.9rem', color: '#202124', outline: 'none',
    fontFamily: 'inherit', transition: 'border-color 0.2s ease', fontWeight: 500
  };

  return (
    <div className="flex flex-col page-enter" style={{ backgroundColor: '#F5F4E2', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        @keyframes dropdown-fade { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float-sticker {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
        }
        .contact-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          align-items: flex-start;
        }
        @media (max-width: 992px) {
          .contact-layout {
            grid-template-columns: 1fr;
            gap: 80px;
          }
          .contact-left-col {
            text-align: center;
            align-items: center;
          }
        }
        .form-input:focus {
          border-bottom-color: #1a73e8 !important;
        }
        .contact-form-card {
          background-color: #ffffff;
          border-radius: 24px;
          padding: 60px;
          box-shadow: 0 24px 80px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.05);
          position: relative;
          z-index: 5;
        }
        @media (max-width: 768px) {
          .contact-form-card {
            padding: 24px;
          }
          .sticker-wrap {
            top: -50px !important;
            right: -10px !important;
            width: 100px !important;
            height: 100px !important;
          }
          .sticker-wrap svg {
            width: 55px !important;
          }
        }
      `}</style>

      <section className="section" style={{ paddingTop: '80px', paddingBottom: '80px', position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-start' }}>
        <div className="wrap" style={{ width: '100%', padding: '0 24px' }}>
          <div className="contact-layout">

            {/* ── Left Column ── */}
            <div className="contact-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '26px', paddingTop: '18px' }}>
              <div style={{ minHeight: '160px' }}>
                <h1 style={{
                  fontSize: 'clamp(2.1rem, 3.4vw, 3.0rem)',
                  fontWeight: 400,
                  color: '#202124',
                  marginBottom: '14px',
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  minHeight: '60px'
                }}>
                  {isRegister ? 'Join the system.' : 'Welcome back.'}
                </h1>
                <p style={{ fontSize: '0.95rem', color: '#7b8088', lineHeight: 1.55, margin: 0, maxWidth: '500px' }}>
                  Everything your restaurant needs - orders, tables, billing - in one place. Built for the way Indian kitchens actually work.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <p style={{ color: '#3c4043', fontSize: '1rem', margin: 0, fontWeight: 600, letterSpacing: '0.015em' }}>Powered by ArcheArc</p>
                </div>
              </div>
            </div>

            {/* ── Right Column ── */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '480px', margin: '0 auto' }}>

              {/* Logo Sticker */}
              <div
                className="sticker-wrap flex items-center justify-center bg-white rounded-full border-4 border-white overflow-hidden shadow-2xl"
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-20px',
                  zIndex: 50,
                  pointerEvents: 'none',
                  width: '150px',
                  height: '150px',
                  animation: 'float-sticker 6s ease-in-out infinite',
                  boxShadow: '0 16px 32px rgba(0,0,0,0.15)',
                }}
              >
                <img
                  src="/logo.png"
                  alt="Restro logo"
                  width={112}
                  height={112}
                  className="w-[112px] h-auto object-contain"
                />
              </div>

              {/* Login Form Card */}
              <div className="contact-form-card">
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#202124', marginBottom: '4px' }}>
                      {isRegister ? 'Create Account' : 'System Access'}
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                      {isRegister ? 'Fill in your details to get started' : 'Enter your credentials to continue'}
                    </p>
                  </div>

                  {isRegister && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Name</label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Fingerprint size={16} style={{ position: 'absolute', left: 0, color: '#9ca3af' }} />
                        <input
                          type="text"
                          required
                          placeholder="John Doe"
                          className="form-input"
                          style={{...inputStyle, paddingLeft: '28px'}}
                          value={name}
                          onChange={e => { setName(e.target.value); setError(''); }}
                          autoComplete="name"
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mobile Number</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Phone size={16} style={{ position: 'absolute', left: 0, color: '#9ca3af' }} />
                      <input
                        type="tel"
                        required
                        placeholder="9876543210"
                        className="form-input"
                        style={{...inputStyle, paddingLeft: '28px'}}
                        value={mobileNumber}
                        onChange={e => { setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                        autoComplete="tel"
                        inputMode="numeric"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 0, color: '#9ca3af' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        className="form-input"
                        style={{...inputStyle, paddingLeft: '28px', paddingRight: '32px'}}
                        value={password}
                        onChange={e => { setPassword(e.target.value); setError(''); }}
                        autoComplete={isRegister ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        style={{ position: 'absolute', right: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px', display: 'flex', alignItems: 'center' }}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div
                      key={error}
                      style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', animation: 'shake 0.4s' }}>
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: '#111827', color: '#fff', border: 'none',
                      padding: '14px 24px', fontSize: '1rem', fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      borderRadius: 100, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 10, transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 8px 24px rgba(17,24,39,0.2)',
                      marginTop: '16px',
                      opacity: loading ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(17,24,39,0.25)'; } }}
                    onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(17,24,39,0.2)'; } }}
                  >
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        {isRegister ? 'Creating Account...' : 'Signing In...'}
                      </span>
                    ) : (
                      <>
                        {isRegister ? 'Create Account' : 'Login'} <Send size={16} />
                      </>
                    )}
                  </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center' }}>
                  <button
                    onClick={switchMode}
                    style={{ background: 'transparent', border: 'none', color: '#1a73e8', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {isRegister ? 'Already have an account? Login' : 'Need a new account? Register now'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Login;
