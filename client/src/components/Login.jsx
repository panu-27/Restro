import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send, AlertCircle, Fingerprint, Phone, Lock, Eye, EyeOff,
  X, ChefHat, ClipboardList, Receipt, BarChart3, Wifi, Shield,
  Check, ChevronDown, Star, Zap, Users, Coffee
} from 'lucide-react';

/* ─────────────────────────────────────────────
   AUTH MODAL  (original logic, zero changes)
───────────────────────────────────────────── */
const AuthModal = ({ mode, onClose, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(mode === 'register');
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsRegister(mode === 'register');
    setName(''); setMobileNumber(''); setPassword(''); setError('');
  }, [mode]);

  const switchMode = () => {
    setIsRegister(p => !p);
    setName(''); setMobileNumber(''); setPassword(''); setError(''); setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mobileNumber.length < 10) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (isRegister && name.trim().length < 2) { setError('Please enter your full name.'); return; }
    setLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name: name.trim(), mobileNumber: mobileNumber.trim(), password }
      : { mobileNumber: mobileNumber.trim(), password };
    try {
      const res = await axios.post(endpoint, payload);
      if (!res.data.token || !res.data.user) throw new Error('Invalid response from server. Please try again.');
      onLoginSuccess(res.data.token, res.data.user);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width: '100%', padding: '10px 0', background: 'transparent', border: 'none',
    borderBottom: '1.5px solid #e5e7eb', fontSize: '0.92rem', color: '#1a1a1a',
    outline: 'none', fontFamily: 'inherit', transition: 'border-color 0.2s', fontWeight: 500,
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,6,2,0.6)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '24px', padding: '48px 44px',
        width: '100%', maxWidth: '420px', position: 'relative',
        boxShadow: '0 32px 80px rgba(0,0,0,0.2)',
        animation: 'modalIn 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: '#f3f4f6',
          border: 'none', borderRadius: '50%', width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#6b7280',
        }}><X size={16} /></button>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, background: '#FEF3C7', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 24,
          }}>🍽️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', marginBottom: 4 }}>
            {isRegister ? 'Create Account' : 'Welcome back'}
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>
            {isRegister ? 'Join Annapurna to get started' : 'Sign in to your restaurant dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isRegister && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full Name</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Fingerprint size={15} style={{ position: 'absolute', left: 0, color: '#d1d5db' }} />
                <input type="text" required placeholder="Ramesh Kumar" className="modal-input"
                  style={{ ...inp, paddingLeft: 26 }} value={name}
                  onChange={e => { setName(e.target.value); setError(''); }} autoComplete="name" />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mobile Number</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Phone size={15} style={{ position: 'absolute', left: 0, color: '#d1d5db' }} />
              <input type="tel" required placeholder="9876543210" className="modal-input"
                style={{ ...inp, paddingLeft: 26 }} value={mobileNumber}
                onChange={e => { setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                autoComplete="tel" inputMode="numeric" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={15} style={{ position: 'absolute', left: 0, color: '#d1d5db' }} />
              <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" className="modal-input"
                style={{ ...inp, paddingLeft: 26, paddingRight: 32 }} value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete={isRegister ? 'new-password' : 'current-password'} />
              <button type="button" onClick={() => setShowPassword(p => !p)} style={{
                position: 'absolute', right: 0, background: 'none', border: 'none',
                cursor: 'pointer', color: '#d1d5db', padding: 4, display: 'flex', alignItems: 'center',
              }} tabIndex={-1}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            </div>
          </div>

          {error && (
            <div key={error} style={{
              background: '#fef2f2', color: '#ef4444', padding: '10px 14px',
              borderRadius: 10, fontSize: '0.83rem', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              animation: 'shake 0.4s',
            }}><AlertCircle size={14} />{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            background: '#C8860A', color: '#fff', border: 'none',
            padding: '13px 24px', fontSize: '0.95rem', fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s', marginTop: 4, opacity: loading ? 0.7 : 1,
            boxShadow: '0 6px 20px rgba(200,134,10,0.35)',
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                {isRegister ? 'Creating...' : 'Signing in...'}
              </span>
            ) : (
              <>{isRegister ? 'Create Account' : 'Login'} <Send size={14} /></>
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button onClick={switchMode} style={{
            background: 'transparent', border: 'none', color: '#C8860A',
            fontSize: '0.87rem', fontWeight: 600, cursor: 'pointer',
          }}>
            {isRegister ? 'Already have an account? Login' : 'Need an account? Register now'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   FAQ ITEM
───────────────────────────────────────────── */
const FAQ = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderBottom: '1px solid #f0ede0', padding: '20px 0',
    }}>
      <button onClick={() => setOpen(p => !p)} style={{
        background: 'none', border: 'none', width: '100%', textAlign: 'left',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', gap: 16,
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.97rem', color: '#1a1a1a' }}>{q}</span>
        <ChevronDown size={18} style={{ color: '#C8860A', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>
      {open && (
        <p style={{ margin: '12px 0 0', color: '#6b7280', fontSize: '0.9rem', lineHeight: 1.65, animation: 'fadeDown 0.2s ease' }}>{a}</p>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
const AnnapurnaLanding = ({ onLoginSuccess }) => {
  const [modal, setModal] = useState(null); // 'login' | 'register' | null

  const features = [
    { icon: <ClipboardList size={22} />, title: 'Table Management', desc: 'Assign orders to tables in real time. Track occupancy, split bills, and merge tables seamlessly.' },
    { icon: <Receipt size={22} />, title: 'Smart Billing', desc: 'Generate GST-compliant bills instantly. Print, WhatsApp, or email receipts with one tap.' },
    { icon: <ChefHat size={22} />, title: 'KOT System', desc: 'Kitchen order tickets auto-print the moment a waiter places an order. No more shouting.' },
    { icon: <BarChart3 size={22} />, title: 'Live Reports', desc: 'Daily sales, item-wise revenue, peak hour analysis — all inside your dashboard.' },
    { icon: <Wifi size={22} />, title: 'Works Offline', desc: 'Power cut? No internet? Annapurna keeps running. Syncs automatically when you\'re back online.' },
    { icon: <Shield size={22} />, title: 'Role-based Access', desc: 'Give waiters, cashiers, and managers exactly the permissions they need. Nothing more.' },
  ];

  const plans = [
    {
      name: 'Starter', price: '₹999', period: '/month', color: '#f9f5eb',
      badge: null,
      features: ['1 outlet', 'Up to 20 tables', 'Billing & KOT', 'WhatsApp receipts', 'Basic reports', 'Email support'],
    },
    {
      name: 'Pro', price: '₹2,499', period: '/month', color: '#1A0A00',
      badge: 'Most Popular',
      features: ['3 outlets', 'Unlimited tables', 'Advanced billing + GST', 'KOT + display screens', 'Full analytics dashboard', 'Inventory tracking', 'Priority support'],
      highlight: true,
    },
    {
      name: 'Enterprise', price: 'Custom', period: '', color: '#f9f5eb',
      badge: null,
      features: ['Unlimited outlets', 'White-label branding', 'API access', 'Dedicated onboarding', 'SLA guarantee', '24/7 phone support'],
    },
  ];

  const faqs = [
    { q: 'Does Annapurna work without internet?', a: 'Yes. The app works fully offline — billing, KOT, table management. Data syncs to the cloud the moment connectivity is restored.' },
    { q: 'Is it compatible with existing billing hardware?', a: 'Annapurna supports most 58mm and 80mm thermal printers via USB, Bluetooth, or LAN. Works with ESC/POS-compatible devices.' },
    { q: 'Can multiple staff use the system at once?', a: 'Absolutely. You can have waiters on tablets, cashiers at the counter, and the kitchen display running — all synced in real time.' },
    { q: 'How does the free trial work?', a: '14 days fully free, no credit card needed. All Pro features unlocked. After trial, choose a plan or downgrade to Starter.' },
    { q: 'Is my data secure?', a: 'All data is encrypted at rest and in transit. Daily backups to Indian data centres. We are fully compliant with IT Act 2000.' },
    { q: 'Do you provide onboarding support?', a: 'Every new account gets a 30-minute onboarding call with our team. We help you set up menus, tables, and printers before you go live.' },
  ];

  const testimonials = [
    { name: 'Rajesh Iyer', role: 'Owner, Saraswati Lunch Home', stars: 5, text: 'Billing time dropped from 5 minutes to under 30 seconds. My cashier loves it.' },
    { name: 'Priya Nair', role: 'Manager, Spice Garden Restaurant', stars: 5, text: 'The offline mode saved us during a power cut on a Saturday night. Absolute lifesaver.' },
    { name: 'Arun Mehta', role: 'Owner, Mehta Family Dhaba', stars: 5, text: 'Setup took 20 minutes. The WhatsApp bill feature is a huge hit with customers.' },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: '#FDFAF3', color: '#1a1a1a', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes modalIn { from{opacity:0;transform:scale(0.94) translateY(16px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        .hero-animate { animation: fadeUp 0.8s ease both; }
        .hero-animate-2 { animation: fadeUp 0.8s 0.15s ease both; }
        .hero-animate-3 { animation: fadeUp 0.8s 0.3s ease both; }
        .modal-input:focus { border-bottom-color: #C8860A !important; }
        .nav-link { color: #5a4a2f; font-size: 0.9rem; font-weight: 500; text-decoration: none; cursor: pointer; transition: color 0.15s; background: none; border: none; }
        .nav-link:hover { color: #C8860A; }
        .feature-card { background: #fff; border-radius: 16px; padding: 28px; border: 1px solid #f0ede0; transition: transform 0.2s, box-shadow 0.2s; }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(200,134,10,0.1); }
        .plan-card { border-radius: 20px; padding: 36px 32px; border: 1.5px solid #f0ede0; transition: transform 0.2s; }
        .plan-card:hover { transform: translateY(-4px); }
        .btn-primary { background: #C8860A; color: #fff; border: none; padding: 13px 28px; font-size: 0.95rem; font-weight: 700; cursor: pointer; border-radius: 100px; transition: all 0.2s; box-shadow: 0 6px 20px rgba(200,134,10,0.3); font-family: inherit; }
        .btn-primary:hover { background: #a86e06; transform: translateY(-2px); box-shadow: 0 10px 28px rgba(200,134,10,0.4); }
        .btn-ghost { background: transparent; color: #1a1a1a; border: 1.5px solid #e5e7eb; padding: 12px 24px; font-size: 0.9rem; font-weight: 600; cursor: pointer; border-radius: 100px; transition: all 0.2s; font-family: inherit; }
        .btn-ghost:hover { border-color: #C8860A; color: #C8860A; }
        .stat-pill { background: #fff; border-radius: 100px; padding: 10px 20px; border: 1px solid #f0ede0; display: flex; align-items: center; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); animation: float 5s ease-in-out infinite; }
        section { padding: 90px 24px; }
        .wrap { max-width: 1100px; margin: 0 auto; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .section-label { font-size: 0.75rem; font-weight: 700; color: #C8860A; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 12px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: clamp(2rem, 3.5vw, 2.8rem); font-weight: 800; color: #1a1a1a; line-height: 1.15; margin-bottom: 16px; }
        .section-sub { font-size: 1rem; color: #6b7280; line-height: 1.65; max-width: 560px; }
        @media(max-width: 900px) {
          .grid-2, .grid-3 { grid-template-columns: 1fr; }
          .hero-grid { grid-template-columns: 1fr !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(253,250,243,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #f0ede0',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, background: '#1A0A00', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🍽️</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1.1rem', color: '#1A0A00', lineHeight: 1 }}>अन्नपूर्णा</div>
            <div style={{ fontSize: '0.6rem', color: '#C8860A', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>by ArcheArc</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }} className="hide-mobile">
          {['Features', 'Pricing', 'FAQs'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`} className="nav-link">{l}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-ghost" onClick={() => setModal('login')}>Login</button>
          <button className="btn-primary" onClick={() => setModal('register')}>Get Started →</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ paddingTop: 80, paddingBottom: 80, background: '#FDFAF3' }}>
        <div className="wrap">
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
            {/* Left */}
            <div>
              <div className="hero-animate" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#FEF3C7', borderRadius: 100, padding: '6px 16px',
                marginBottom: 24, fontSize: '0.82rem', fontWeight: 600, color: '#92400E',
              }}>
                <Zap size={13} /> Made for Indian restaurants
              </div>

              <h1 className="hero-animate-2" style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 'clamp(2.4rem, 4.5vw, 3.8rem)',
                fontWeight: 800, lineHeight: 1.1, color: '#1A0A00', marginBottom: 20,
              }}>
                Everything your<br />
                <span style={{ color: '#C8860A' }}>restaurant needs,</span><br />
                one place.
              </h1>

              <p className="hero-animate-3" style={{ fontSize: '1.05rem', color: '#6b7280', lineHeight: 1.7, marginBottom: 36, maxWidth: 440 }}>
                Orders, tables, billing, KOT, reports — built for the way Indian kitchens actually work. No training required.
              </p>

              <div className="hero-animate-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
                <button className="btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }} onClick={() => setModal('register')}>
                  Start free trial →
                </button>
                <button className="btn-ghost" style={{ fontSize: '1rem', padding: '14px 24px' }} onClick={() => setModal('login')}>
                  Sign in
                </button>
              </div>

              <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                {[['500+', 'Restaurants'], ['₹2Cr+', 'Billed daily'], ['4.9★', 'Rating']].map(([n, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 800, color: '#1A0A00' }}>{n}</div>
                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 500 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – visual */}
            <div style={{ position: 'relative' }} className="hide-mobile">
              {/* Main dashboard card */}
              <div style={{
                background: '#1A0A00', borderRadius: 24, padding: 28,
                boxShadow: '0 40px 80px rgba(26,10,0,0.25)',
                position: 'relative', zIndex: 2,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <span style={{ color: '#C8860A', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em' }}>LIVE ORDERS</span>
                  <span style={{ background: '#2d1800', color: '#C8860A', borderRadius: 100, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600 }}>● Live</span>
                </div>
                {[
                  { table: 'T-04', items: 'Dal Makhani, Roti ×4', status: 'Ready', color: '#22c55e' },
                  { table: 'T-07', items: 'Paneer Tikka, Lassi ×2', status: 'Cooking', color: '#f59e0b' },
                  { table: 'T-11', items: 'Thali ×3, Papad', status: 'New', color: '#3b82f6' },
                  { table: 'T-02', items: 'Biryani ×2, Raita', status: 'Billed', color: '#8b5cf6' },
                ].map(o => (
                  <div key={o.table} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#2d1800', borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                  }}>
                    <div>
                      <div style={{ color: '#F5D78E', fontSize: '0.83rem', fontWeight: 700 }}>{o.table}</div>
                      <div style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{o.items}</div>
                    </div>
                    <span style={{ background: o.color + '22', color: o.color, borderRadius: 100, padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700 }}>{o.status}</span>
                  </div>
                ))}

                <div style={{ borderTop: '1px solid #3a2000', paddingTop: 16, marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ color: '#9ca3af', fontSize: '0.78rem' }}>Today's revenue</div>
                  <div style={{ color: '#F5D78E', fontSize: '0.95rem', fontWeight: 700 }}>₹18,430</div>
                </div>
              </div>

              {/* Floating pills */}
              <div className="stat-pill" style={{ position: 'absolute', top: -20, right: -20, animationDelay: '0s' }}>
                <span style={{ fontSize: 20 }}>🧾</span>
                <div><div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a1a1a' }}>Bill in 12 sec</div><div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>avg. billing time</div></div>
              </div>
              <div className="stat-pill" style={{ position: 'absolute', bottom: -20, left: -20, animationDelay: '2s' }}>
                <span style={{ fontSize: 20 }}>📶</span>
                <div><div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a1a1a' }}>Works offline</div><div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>no internet needed</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LOGOS / TRUST ── */}
      <div style={{ background: '#f9f5eb', borderTop: '1px solid #f0ede0', borderBottom: '1px solid #f0ede0', padding: '18px 24px' }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>Trusted by restaurants across India</span>
          {['Pune', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Ahmedabad'].map(c => (
            <span key={c} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#5a4a2f', background: '#fff', borderRadius: 100, padding: '4px 14px', border: '1px solid #f0ede0' }}>{c}</span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" style={{ background: '#fff' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-label">Features</div>
            <h2 className="section-title" style={{ margin: '0 auto 16px' }}>Built for real kitchens</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>Every feature designed around how Indian restaurants actually work — chaotic, fast, and full of heart.</p>
          </div>
          <div className="grid-3">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <div style={{ width: 44, height: 44, background: '#FEF3C7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8860A', marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 8, color: '#1a1a1a' }}>{f.title}</h3>
                <p style={{ fontSize: '0.88rem', color: '#6b7280', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ background: '#FDFAF3' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="hero-grid">
            <div>
              <div className="section-label">How it works</div>
              <h2 className="section-title">From setup to first order in under 20 minutes</h2>
              <p className="section-sub" style={{ marginBottom: 36 }}>No IT team required. No complicated configurations. Just open, set up your menu and tables, and go live.</p>
              {[
                ['1', 'Add your restaurant', 'Set up your outlet, tables, and menu in minutes.'],
                ['2', 'Train your team', 'Waiters learn the app in one shift — it\'s that simple.'],
                ['3', 'Start taking orders', 'KOT prints instantly, billing is one tap, reports update live.'],
              ].map(([n, t, d]) => (
                <div key={n} style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 36, height: 36, background: '#1A0A00', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8860A', fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1rem', flexShrink: 0 }}>{n}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: '#1a1a1a' }}>{t}</div>
                    <div style={{ fontSize: '0.87rem', color: '#6b7280', lineHeight: 1.6 }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hide-mobile" style={{ background: '#1A0A00', borderRadius: 24, padding: 32, position: 'relative' }}>
              {/* Mini KOT ticket */}
              <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px dashed #e5e7eb', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🍽️ KOT — Table 7</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>12:34 PM · Token #042</div>
                </div>
                {[['Paneer Butter Masala', '×2'], ['Garlic Naan', '×4'], ['Mango Lassi', '×2'], ['Papad', '×1 (extra crispy)']].map(([item, qty]) => (
                  <div key={item} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                    <span>{item}</span><span style={{ fontWeight: 700 }}>{qty}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px dashed #e5e7eb', marginTop: 12, paddingTop: 10, textAlign: 'center', fontSize: '0.7rem', color: '#9ca3af' }}>** KITCHEN COPY **</div>
              </div>
              {/* Bill card */}
              <div style={{ background: '#2d1800', borderRadius: 12, padding: 20 }}>
                <div style={{ color: '#F5D78E', fontWeight: 700, fontSize: '0.88rem', marginBottom: 12 }}>Bill Preview</div>
                {[['Subtotal', '₹640'], ['CGST 2.5%', '₹16'], ['SGST 2.5%', '₹16'], ['Total', '₹672']].map(([l, v], i) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: i === 3 ? '0.95rem' : '0.82rem', fontWeight: i === 3 ? 700 : 400, color: i === 3 ? '#C8860A' : '#d1d5db', marginBottom: 6 }}>
                    <span>{l}</span><span>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ background: '#fff' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-label">Testimonials</div>
            <h2 className="section-title">Loved by restaurant owners</h2>
          </div>
          <div className="grid-3">
            {testimonials.map(t => (
              <div key={t.name} style={{ background: '#FDFAF3', borderRadius: 20, padding: 28, border: '1px solid #f0ede0' }}>
                <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} fill="#C8860A" color="#C8860A" />
                  ))}
                </div>
                <p style={{ fontSize: '0.93rem', color: '#374151', lineHeight: 1.7, marginBottom: 20 }}>"{t.text}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, background: '#FEF3C7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8860A', fontWeight: 700, fontSize: '0.9rem' }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1a1a1a' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ background: '#FDFAF3' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-label">Pricing</div>
            <h2 className="section-title">Simple, honest pricing</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>No hidden fees. No per-transaction cuts. Pay once a month and keep everything you earn.</p>
          </div>
          <div className="grid-3">
            {plans.map(p => (
              <div key={p.name} className="plan-card" style={{
                background: p.highlight ? '#1A0A00' : '#fff',
                position: 'relative',
              }}>
                {p.badge && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: '#C8860A', color: '#fff', borderRadius: 100,
                    padding: '4px 16px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                  }}>{p.badge}</div>
                )}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: p.highlight ? '#C8860A' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{p.name}</span>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.4rem', fontWeight: 800, color: p.highlight ? '#F5D78E' : '#1a1a1a' }}>{p.price}</span>
                  <span style={{ fontSize: '0.85rem', color: p.highlight ? '#9ca3af' : '#9ca3af' }}>{p.period}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Check size={15} style={{ color: '#C8860A', flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: '0.87rem', color: p.highlight ? '#d1d5db' : '#4b5563' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button className="btn-primary" onClick={() => setModal('register')} style={{
                  width: '100%', background: p.highlight ? '#C8860A' : '#1A0A00',
                  boxShadow: p.highlight ? '0 6px 20px rgba(200,134,10,0.4)' : '0 6px 20px rgba(26,10,0,0.3)',
                }}>
                  {p.price === 'Custom' ? 'Contact us' : 'Start free trial'}
                </button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem', marginTop: 24 }}>All plans include 14-day free trial. No credit card required.</p>
        </div>
      </section>

      {/* ── FAQs ── */}
      <section id="faqs" style={{ background: '#fff' }}>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-label">FAQs</div>
            <h2 className="section-title">Common questions</h2>
          </div>
          {faqs.map(f => <FAQ key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ background: '#1A0A00', padding: '72px 24px' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.8rem, 3vw, 2.8rem)', fontWeight: 800, color: '#F5D78E', marginBottom: 16 }}>
            Ready to transform your restaurant?
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: 36, lineHeight: 1.7 }}>
            Join 500+ restaurants already running smarter with Annapurna.
          </p>
          <button className="btn-primary" style={{ fontSize: '1.05rem', padding: '15px 40px' }} onClick={() => setModal('register')}>
            Start your free trial →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0f0600', padding: '52px 24px 32px', color: '#9ca3af' }}>
        <div className="wrap">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 22 }}>🍽️</span>
                <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: '1.1rem', color: '#F5D78E' }}>अन्नपूर्णा</span>
              </div>
              <p style={{ fontSize: '0.87rem', lineHeight: 1.7, maxWidth: 280 }}>Restaurant management software built for Indian kitchens. Orders, billing, KOT — all in one place.</p>
              <div style={{ marginTop: 16, fontSize: '0.8rem', color: '#5a4a2f' }}>Powered by ArcheArc</div>
            </div>
            {[
              ['Product', ['Features', 'Pricing', 'Changelog', 'Roadmap']],
              ['Support', ['Documentation', 'WhatsApp Support', 'Contact Us', 'Status']],
              ['Legal', ['Privacy Policy', 'Terms of Service', 'Refund Policy']],
            ].map(([head, links]) => (
              <div key={head}>
                <div style={{ color: '#F5D78E', fontWeight: 700, fontSize: '0.85rem', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{head}</div>
                {links.map(l => (
                  <div key={l} style={{ marginBottom: 10 }}>
                    <a href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.87rem', transition: 'color 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#C8860A'}
                      onMouseOut={e => e.currentTarget.style.color = '#9ca3af'}>{l}</a>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #1a0e00', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: '0.82rem' }}>© 2025 ArcheArc Technologies. All rights reserved.</span>
            <span style={{ fontSize: '0.82rem' }}>Made with ❤️ in Pune, India</span>
          </div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {modal && (
        <AuthModal mode={modal} onClose={() => setModal(null)} onLoginSuccess={onLoginSuccess} />
      )}
    </div>
  );
};

export default AnnapurnaLanding;