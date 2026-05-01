import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Send, AlertCircle, Fingerprint, Phone, Lock, Eye, EyeOff,
  X, ChefHat, ClipboardList, Receipt, BarChart3, Wifi, Shield,
  ArrowLeft, ArrowRight, Zap, ChevronDown, Check, Star, Play,
  User, Plus, ChevronLeft, ChevronRight
} from 'lucide-react';

/* ─── Google Font Import Only ─── */
const FontLink = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
  `}</style>
);

/* ─── FAQ ─── */
const FAQ = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#E5E5E5]/60 group">
      <button
        className="w-full bg-transparent border-none cursor-pointer flex justify-between items-center py-6 gap-4 text-left font-inherit group-hover:text-[#FF5A36] transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <span className="text-[16px] font-medium text-[#111111] group-hover:text-[#FF5A36] transition-colors">{q}</span>
        <ChevronDown size={18} className={`text-[#888888] shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-[#111111]' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100 pb-6' : 'grid-rows-[0fr] opacity-0'}`}>
        <p className="text-[15px] text-[#555555] leading-[1.8] overflow-hidden">{a}</p>
      </div>
    </div>
  );
};

/* ─── AUTH PAGE ─── */
const AuthPage = ({ mode, onBack, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(mode === 'register');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsRegister(mode === 'register');
    setName(''); setMobile(''); setPassword(''); setError('');
  }, [mode]);

  const switchMode = () => {
    setIsRegister(p => !p);
    setName(''); setMobile(''); setPassword(''); setError(''); setShowPw(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mobile.length < 10) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (isRegister && name.trim().length < 2) { setError('Enter your full name.'); return; }
    setLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name: name.trim(), mobileNumber: mobile.trim(), password }
      : { mobileNumber: mobile.trim(), password };
    try {
      const res = await axios.post(endpoint, payload);
      if (!res.data.token || !res.data.user) throw new Error('Invalid response. Try again.');
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col font-['DM_Sans',sans-serif] bg-white text-[#111111] antialiased">
      <FontLink />
      <div className="h-20 flex items-center px-8 lg:px-12">
        <button
          className="flex items-center gap-2 bg-transparent border-none cursor-pointer font-inherit text-[14px] font-medium text-[#888888] transition-colors hover:text-[#111111] p-0"
          onClick={onBack}
        >
          <ArrowLeft size={16} /> Return to website
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Form side */}
        {/* Form side (Left) */}
        <div className="flex items-center justify-center p-8 lg:p-16 bg-white rounded-tr-3xl lg:rounded-none lg:rounded-r-3xl shadow-sm z-10">
          <div className="w-full max-w-[400px]">
            <h1 className="font-['DM_Serif_Display',serif] text-[40px] leading-tight text-[#111111] mb-3">
              {isRegister ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="text-[15px] text-[#555555] mb-10 leading-relaxed">
              {isRegister
                ? 'Join hundreds of modern restaurants optimizing their operations today.'
                : 'Enter your details to access your restaurant dashboard.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <div>
                  <label className="block text-[13px] font-medium text-[#111111] mb-2">Full Name</label>
                  <div className="relative flex items-center">
                    <Fingerprint size={16} className="absolute left-4 text-[#888888] pointer-events-none" />
                    <input
                      type="text" required placeholder="Ramesh Kumar"
                      value={name} onChange={e => { setName(e.target.value); setError(''); }}
                      className="w-full bg-[#F7F7F5] border border-transparent rounded-lg py-3.5 pl-11 pr-4 font-inherit text-[15px] text-[#111111] outline-none transition-all focus:border-[#FF5A36] focus:bg-white placeholder-[#A3A3A3]"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-2">Mobile Number</label>
                <div className="relative flex items-center">
                  <Phone size={16} className="absolute left-4 text-[#888888] pointer-events-none" />
                  <input
                    type="tel" required placeholder="9876543210"
                    value={mobile}
                    onChange={e => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                    className="w-full bg-[#F7F7F5] border border-transparent rounded-lg py-3.5 pl-11 pr-4 font-inherit text-[15px] text-[#111111] outline-none transition-all focus:border-[#FF5A36] focus:bg-white placeholder-[#A3A3A3]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#111111] mb-2">Password</label>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-4 text-[#888888] pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                    value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                    className="w-full bg-[#F7F7F5] border border-transparent rounded-lg py-3.5 pl-11 pr-11 font-inherit text-[15px] text-[#111111] outline-none transition-all focus:border-[#FF5A36] focus:bg-white placeholder-[#A3A3A3]"
                  />
                  <button type="button" className="absolute right-4 bg-transparent border-none cursor-pointer text-[#888888] flex items-center transition-colors hover:text-[#111111] p-0" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-[#FEF2F2] text-[#DC2626] text-[14px] px-4 py-3 rounded-lg">
                  <AlertCircle size={16} className="shrink-0" /> {error}
                </div>
              )}

              <button type="submit" className="w-full bg-[#FF5A36] text-white border-none cursor-pointer font-inherit text-[15px] font-semibold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-all hover:bg-[#D94420] disabled:opacity-60 disabled:cursor-not-allowed mt-2" disabled={loading}>
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</>
                ) : (
                  <>{isRegister ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-[#E5E5E5]/60 text-center">
              <p className="text-[14px] text-[#555555]">
                {isRegister ? 'Already have an account? ' : 'Need an account? '}
                <button className="bg-transparent border-none cursor-pointer font-inherit text-[14px] text-[#111111] font-semibold p-0 hover:text-[#FF5A36] transition-colors" onClick={switchMode}>
                  {isRegister ? 'Sign in' : 'Register now'}
                </button>
              </p>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

/* ─── LANDING ─── */
const AnnapurnaLanding = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState(null);

  if (authMode) {
    return (
      <AuthPage
        mode={authMode}
        onBack={() => setAuthMode(null)}
        onLoginSuccess={onLoginSuccess}
      />
    );
  }

  const features = [
    { icon: <ClipboardList size={22} />, title: 'Table Management', desc: 'Assign orders to tables in real time. Track occupancy, split bills, and merge tables seamlessly.' },
    { icon: <Receipt size={22} />, title: 'Smart Billing', desc: 'Generate GST-compliant bills instantly. Print, WhatsApp, or email receipts with a single tap.' },
    { icon: <ChefHat size={22} />, title: 'KOT System', desc: 'Kitchen order tickets auto-print the moment a waiter places an order. No more verbal confusion.' },
    { icon: <BarChart3 size={22} />, title: 'Live Reports', desc: 'Daily sales, item-wise revenue, peak hour analysis — all visible beautifully inside your dashboard.' },
    { icon: <Wifi size={22} />, title: 'Works Offline', desc: 'Power cut or no internet? The system keeps running and syncs automatically when back online.' },
    { icon: <Shield size={22} />, title: 'Role-based Access', desc: 'Give waiters, cashiers, and managers exactly the permissions they need — nothing more.' },
  ];

  const steps = [
    { n: '01', title: 'Register', desc: 'Create your account in under a minute.' },
    { n: '02', title: 'Set Up Menu', desc: 'Add categories, items, and pricing.' },
    { n: '03', title: 'Configure Tables', desc: 'Map your floor layout digitally.' },
    { n: '04', title: 'Train Staff', desc: 'Onboard your team with simple roles.' },
    { n: '05', title: 'Go Live', desc: 'Start billing on day one.' },
  ];

  const faqs = [
    { q: 'Does the system work offline?', a: 'Yes. Billing, KOT, and table management work fully offline. Data syncs automatically once connectivity is restored so you never lose a beat.' },
    { q: 'Is it compatible with my existing printers?', a: 'It supports most standard 58mm and 80mm thermal printers via USB, Bluetooth, or LAN. Plug and play for most models.' },
    { q: 'Can multiple staff use it simultaneously?', a: 'Absolutely — waiters on mobile, cashiers at the counter, and kitchen staff viewing KOTs, all working in real time without lag.' },
    { q: 'Is there a free trial?', a: 'Yes. You get a fully functional trial period to test every feature before committing to a plan. No credit card required.' },
  ];

  const testimonials = [
    { text: 'Our billing time dropped by 40% in the first week. The KOT system alone is worth it.', name: 'Priya Nair', role: 'Owner, Spice Garden' },
    { text: 'Finally a POS that works during power cuts. We never miss an order now.', name: 'Ravi Sharma', role: 'Manager, Hotel Annapoorna' },
    { text: 'Setup was done in a day. Staff adapted in hours. Clean UI makes all the difference.', name: 'Meera Joshi', role: 'Owner, Café Mithas' },
  ];

  return (
    <div className="font-['DM_Sans',sans-serif] bg-white text-[#111111] antialiased scroll-smooth selection:bg-[#FF5A36] selection:text-white">
      <FontLink />

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-[100] h-20 bg-white/90 backdrop-blur-xl flex items-center border-b border-[#E5E5E5]/60 transition-all">
        <div className="max-w-[1280px] w-full mx-auto px-6 sm:px-8 flex items-center justify-between">
          <img src="/brand-logo.png" alt="Restro Logo" className="h-10 sm:h-12 object-contain" />
          <div className="hidden lg:flex items-center gap-10">
            <a href="#features" className="text-[15px] font-medium text-[#555555] no-underline transition-colors hover:text-[#111111]">Features</a>
            <a href="#how-it-works" className="text-[15px] font-medium text-[#555555] no-underline transition-colors hover:text-[#111111]">How it works</a>
            <a href="#faqs" className="text-[15px] font-medium text-[#555555] no-underline transition-colors hover:text-[#111111]">FAQ</a>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <button className="bg-transparent border-none cursor-pointer text-[14px] sm:text-[15px] font-medium text-[#111111] transition-colors hover:text-[#FF5A36] p-0" onClick={() => setAuthMode('login')}>Log in</button>
            <button className="bg-[#111111] text-white border-none cursor-pointer font-inherit text-[13px] sm:text-[14px] font-medium px-5 py-2.5 sm:px-6 sm:py-3 rounded-full transition-all hover:bg-[#FF5A36] hover:shadow-lg hover:shadow-[#FF5A36]/20 active:scale-95" onClick={() => setAuthMode('register')}>
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-[180px] pb-24 px-8 max-w-[1280px] mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <div className="relative z-20">
            <div className="inline-flex items-center gap-2 bg-white text-[#111111] text-[12px] font-medium px-4 py-2 rounded-full border border-[#E5E5E5] shadow-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-[#FF5A36] animate-pulse"></span>
              India's Modern Restaurant POS
            </div>
            <h1 className="font-['DM_Serif_Display',serif] text-[clamp(40px,5vw,64px)] leading-[1.08] tracking-tight text-[#111111] mb-6">
              Manage your<br />
              restaurant <em className="text-[#FF5A36] italic not-italic">beautifully.</em>
            </h1>
            <p className="text-[16px] leading-[1.7] text-[#555555] max-w-[480px] mb-10">
              Orders, tables, billing, KOT, and advanced reports — stripped of clutter and built for fast-paced Indian kitchens.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-14">
              <button className="bg-[#FF5A36] text-white border-none cursor-pointer font-inherit text-[15px] font-medium px-8 py-4 rounded-full flex items-center gap-2 transition-all hover:bg-[#D94420] hover:shadow-xl hover:shadow-[#FF5A36]/20 active:scale-95" onClick={() => setAuthMode('register')}>
                Start free trial <ArrowRight size={16} />
              </button>
              <button className="bg-white border border-[#E5E5E5] cursor-pointer font-inherit text-[15px] font-medium text-[#111111] px-8 py-4 rounded-full flex items-center gap-2 transition-all hover:border-[#111111] hover:shadow-sm" onClick={() => setAuthMode('login')}>
                <Play size={16} className="fill-current" /> Watch Demo
              </button>
            </div>

            <div className="flex items-center gap-12 pt-8 border-t border-[#E5E5E5]/60">
              <div>
                <div className="font-['DM_Serif_Display',serif] text-[36px] text-[#111111] leading-none mb-1">500+</div>
                <div className="text-[14px] text-[#555555] font-medium">Active outlets</div>
              </div>
              <div>
                <div className="font-['DM_Serif_Display',serif] text-[36px] text-[#111111] leading-none mb-1">₹2Cr+</div>
                <div className="text-[14px] text-[#555555] font-medium">Daily volume</div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: REFINED VISUALS */}
          <div className="relative w-full max-w-[600px] mx-auto lg:ml-auto mt-16 lg:mt-0 perspective-1000">
            {/* Main Feature Image - Cleaner & More Focused */}
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#FF5A36]/10 to-transparent rounded-[40px] blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
              <img
                src="https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200&auto=format&fit=crop&q=90"
                alt="Restaurant Ambience"
                className="relative w-full h-[500px] object-cover rounded-[40px] border border-zinc-100 shadow-2xl transition-all duration-700 group-hover:scale-[1.01] group-hover:rotate-1"
              />
            </div>

            {/* Premium Glass UI Card - Floating & Sharp */}
            <div className="absolute -bottom-6 -left-6 md:-left-12 z-30 bg-white/80 backdrop-blur-3xl border border-white/50 rounded-[32px] p-8 w-[90%] max-w-[380px] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="flex justify-between items-center mb-8 pb-6 border-b border-zinc-950/5">
                <div>
                  <div className="text-[18px] font-bold text-zinc-900 tracking-tight">Live Orders</div>
                  <div className="text-[13px] text-zinc-500 mt-1 font-medium">Real-time KDS Sync</div>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900 text-white text-[11px] font-bold px-4 py-2 rounded-full shadow-lg shadow-zinc-900/20">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" /> LIVE
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { t: 'Table 04', items: 'Dal Makhani, Roti ×4', status: 'Ready', cls: 'text-[#10B981] bg-[#10B981]/8' },
                  { t: 'Table 07', items: 'Paneer Tikka, Lassi ×2', status: 'Cooking', cls: 'text-[#FF5A36] bg-[#FF5A36]/8' },
                  { t: 'Table 11', items: 'Thali ×3, Papad', status: 'New', cls: 'text-zinc-400 bg-zinc-100' },
                ].map((o, idx) => (
                  <div
                    className="flex justify-between items-center p-4 rounded-2xl hover:bg-white transition-all border border-transparent hover:border-zinc-100 group/item"
                    key={o.t}
                    style={{ animationDelay: `${idx * 150}ms` }}
                  >
                    <div>
                      <div className="text-[15px] font-bold text-zinc-900 mb-0.5">{o.t}</div>
                      <div className="text-[12px] text-zinc-500 font-medium">{o.items}</div>
                    </div>
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg tracking-wide uppercase ${o.cls}`}>
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decorative "Fast Tech" Element */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#FF5A36]/10 rounded-full blur-3xl animate-pulse" />
          </div>
        </div>
      </section>

      {/* TRUSTED BY */}
      <div className="py-8 px-8 bg-white border-y border-zinc-100">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <span className="text-[14px] text-zinc-500 font-semibold tracking-widest uppercase">Trusted by top restaurants</span>
          <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-[#FF5A36]" />
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-[#FF5A36]" fill="#FF5A36" />)}
            </div>
            <span className="text-[14px] font-bold text-zinc-900">4.9 / 5 rating</span>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="py-32 px-8 bg-white relative overflow-hidden">
        {/* Very subtle glow - barely there */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#FF5A36]/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

        <div className="max-w-[1280px] mx-auto relative z-10">
          <div className="text-center max-w-[600px] mx-auto mb-16">
            <h2 className="font-['DM_Serif_Display',serif] text-[40px] text-zinc-900 leading-[1.08] tracking-tight mb-6">
              Everything you need.<br />
              <span className="text-[#FF5A36]">Nothing you don't.</span>
            </h2>
            <p className="text-[16px] text-zinc-600 leading-[1.7]">
              A complete system purpose-built for restaurant operations. No bloat, no unnecessary complexity.
            </p>
          </div>

          {/* Minimalist Feature Image */}
          <div className="mb-24 rounded-[2rem] overflow-hidden border border-zinc-100 shadow-xl shadow-zinc-200/50 h-[300px] md:h-[450px] relative group">
            <img
              src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80"
              alt="Restaurant operations"
              className="w-full h-full object-cover grayscale opacity-90 transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105 group-hover:opacity-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
            {features.map((f, i) => (
              <div className="group" key={i}>
                <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-[#FF5A36] mb-6 group-hover:border-[#FF5A36]/30 transition-all duration-300">
                  {f.icon}
                </div>
                <div className="text-[18px] font-['DM_Serif_Display',serif] text-zinc-900 mb-3">{f.title}</div>
                <p className="text-[15px] leading-[1.7] text-zinc-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-40 px-8 bg-white border-t border-zinc-100">
        <div className="max-w-[1280px] mx-auto">
          <div className="max-w-[800px] mb-24">
            <h2 className="font-['DM_Serif_Display',serif] text-[40px] leading-[1.08] tracking-tight text-zinc-900 mb-8">
              Your digital presence,<br />
              <span className="text-[#FF5A36]">perfected in minutes.</span>
            </h2>
            <p className="text-[16px] text-zinc-500 leading-[1.7] max-w-[500px]">
              We’ve stripped away the complexity. Five intentional steps to transition your restaurant into the digital age.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 lg:gap-12 mb-24">
            {steps.map((s, i) => (
              <div className="relative group" key={i}>
                <div className="text-[48px] font-['DM_Serif_Display',serif] text-zinc-100 group-hover:text-[#FF5A36]/10 transition-colors duration-500 leading-none mb-4">
                  {s.n}
                </div>
                <div className="text-[16px] font-bold mb-2 text-zinc-900 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]" />
                  {s.title}
                </div>
                <p className="text-[15px] text-zinc-500 leading-[1.7]">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* LIVE PREVIEW CTA */}
          <div className="bg-zinc-950 rounded-[2.5rem] p-12 md:p-20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#FF5A36]/10 rounded-full blur-[100px] translate-x-1/4 -translate-y-1/4" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="max-w-[500px]">
                <h3 className="font-['DM_Serif_Display',serif] text-[28px] text-white leading-tight mb-6">
                  Curious how your <span className="text-[#FF5A36]">menu</span> will look?
                </h3>
                <p className="text-zinc-400 text-[16px] mb-8">
                  Experience the lightning-fast interface your customers will love. Mobile-optimized, visual-first, and high-conversion.
                </p>
                <a
                  href="/preview"
                  className="inline-flex items-center gap-3 bg-[#FF5A36] text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-zinc-950 transition-all duration-300 group"
                >
                  View Demo Menu
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>

              {/* Abstract Phone/Menu Mockup Element */}
              <div className="w-full md:w-1/3 aspect-[9/16] bg-zinc-900 rounded-[2rem] border-[6px] border-zinc-800 shadow-2xl relative overflow-hidden transform rotate-6 group-hover:rotate-3 transition-transform duration-700">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/80 z-10" />
                <img
                  src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80"
                  className="w-full h-full object-cover opacity-60"
                  alt="Digital menu preview"
                />
                <div className="absolute bottom-6 left-6 right-6 z-20">
                  <div className="h-4 w-2/3 bg-white/20 rounded-full mb-3" />
                  <div className="h-4 w-1/2 bg-white/10 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-8 bg-white border-t border-zinc-100">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="font-['DM_Serif_Display',serif] text-[40px] text-zinc-900 leading-tight">
                What our users say.
              </h2>
              <p className="text-[15px] text-zinc-500 mt-2">Smart restaurant management · India</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} className="text-[#FF5A36]" fill="#FF5A36" />
                ))}
              </div>
              <span className="text-[14px] font-semibold text-zinc-700">4.9 / 5 <span className="text-zinc-400 font-normal">· 130 reviews</span></span>
            </div>
          </div>

          {/* Review Card */}
          <div className="rounded-[24px] bg-zinc-50 border border-zinc-100 px-8 md:px-16 py-12">
            <div className="flex gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={16} className="text-[#FF5A36]" fill="#FF5A36" />
              ))}
            </div>
            <p className="text-[20px] leading-[1.5] text-zinc-800 font-['DM_Serif_Display',serif] mb-8 max-w-[800px]">
              "{testimonials[0].text}"
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 flex items-center justify-center">
                <User size={18} className="text-zinc-400" />
              </div>
              <div>
                <div className="text-[14px] font-bold text-zinc-900">{testimonials[0].name}</div>
                <div className="text-[13px] text-zinc-500">{testimonials[0].role}</div>
              </div>
            </div>
          </div>

          <p className="mt-8 text-[14px] text-zinc-400 leading-[1.7] max-w-[600px]">
            Hundreds of restaurants across India trust Restro for their daily operations.
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section id="faqs" className="py-24 px-8 bg-zinc-50 border-t border-zinc-100">
        <div className="max-w-[900px] mx-auto">
          <h2 className="font-['DM_Serif_Display',serif] text-[40px] text-zinc-900 mb-2">
            Common questions.
          </h2>
          <p className="text-[15px] text-zinc-500 mb-12">Everything you need to know before getting started.</p>

          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-zinc-100 overflow-hidden">
                <summary className="flex justify-between items-center px-7 py-5 cursor-pointer list-none select-none">
                  <span className="text-[15px] font-semibold text-zinc-900 pr-4">{f.q}</span>
                  <div className="shrink-0 w-7 h-7 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-[#FF5A36] group-open:bg-[#FF5A36] group-open:text-white group-open:border-[#FF5A36] transition-all duration-200">
                    <Plus size={16} className="group-open:rotate-45 transition-transform duration-200" />
                  </div>
                </summary>
                <div className="px-7 pb-6 text-[15px] text-zinc-500 leading-[1.7] border-t border-zinc-50 pt-4">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="py-32 px-8 bg-white">
        <div className="max-w-[1000px] mx-auto bg-[#FF5A36] rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="font-['DM_Serif_Display',serif] text-[40px] text-white leading-[1.08] tracking-tight mb-6">Ready to upgrade?</h2>
            <p className="text-[16px] text-white/90 mb-10 max-w-[500px] mx-auto">Join the new standard of restaurant operations today.</p>
            <button className="bg-white text-[#111111] border-none cursor-pointer font-inherit text-[15px] font-medium px-10 py-5 rounded-full transition-transform hover:scale-105" onClick={() => setAuthMode('register')}>
              Create free account
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-white pt-20 pb-10 px-8 border-t border-[#E5E5E5]/60">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 pb-16 border-b border-[#E5E5E5]/60 mb-8">
          <div>
            <img src="/brand-logo.png" alt="Restro Logo" className="h-10 object-contain mb-6" />
            <p className="text-[15px] text-[#555555] leading-[1.6] max-w-[300px]">
              The modern restaurant management platform built for speed, reliability, and growth.
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-[#111111] mb-6">Product</p>
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Features</a>
              <a href="#" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Pricing</a>
              <a href="#" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Changelog</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-[#111111] mb-6">Support</p>
            <div className="flex flex-col gap-4">
              <a href="#faqs" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">FAQ</a>
              <a href="#" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Help Center</a>
              <a href="#" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Contact</a>
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold tracking-widest uppercase text-[#111111] mb-6">Legal</p>
            <div className="flex flex-col gap-4">
              <a href="#" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Privacy Policy</a>
              <a href="#" className="text-[15px] text-[#555555] no-underline transition-colors hover:text-[#FF5A36]">Terms of Service</a>
            </div>
          </div>
        </div>
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between text-[14px] text-[#888888] gap-4">
          <span>© {new Date().getFullYear()} Annapurna POS. All rights reserved.</span>
          <span>Designed with care</span>
        </div>
      </footer>
    </div>
  );
};

export default AnnapurnaLanding;