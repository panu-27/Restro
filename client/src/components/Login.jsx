import React, { useState } from 'react';
import axios from 'axios';
import { CustomLogo } from './Logo';
import { Phone, Lock, LogIn, AlertCircle, UserPlus, Fingerprint, ChevronRight } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister ? { name, mobileNumber, password } : { mobileNumber, password };

    try {
      const res = await axios.post(endpoint, payload);
      onLoginSuccess(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-outfit relative overflow-hidden">
      {/* Decorative Dots - Background is already set in index.css */}
      
      {/* Navigation Simulation (Matches Image) */}
      <div className="absolute top-0 w-full flex items-center justify-between px-12 py-8 no-print">
        <div className="flex items-center gap-3">
          <CustomLogo size={32} />
          <span className="text-xl font-bold text-arche-text">ArcheArc</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <span className="text-gray-500 font-medium hover:text-arche-blue-deep cursor-pointer transition-colors">Products</span>
          <span className="text-gray-500 font-medium hover:text-arche-blue-deep cursor-pointer transition-colors">Services</span>
          <span className="text-gray-500 font-medium hover:text-arche-blue-deep cursor-pointer transition-colors">Pricing</span>
          <span className="text-gray-500 font-medium hover:text-arche-blue-deep cursor-pointer transition-colors">Blog</span>
          <span className="bg-gray-100 text-arche-text px-4 py-1.5 rounded-full font-medium">About Us</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-gray-600 font-medium cursor-pointer">Contact Us</span>
          <button className="bg-arche-text text-white px-6 py-2.5 rounded-full font-bold flex items-center gap-2 hover:bg-black transition-all">
            Download <LogIn size={16} />
          </button>
        </div>
      </div>

      {/* Hero Content */}
      <div className="max-w-4xl w-full text-center mt-20 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="flex items-center justify-center gap-3 mb-6 transition-transform hover:scale-105 duration-300">
          <CustomLogo size={38} />
          <span className="text-2xl font-bold text-arche-text tracking-tight">ArcheArc <span className="text-gray-400 font-normal">Developers</span></span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black text-arche-text mb-8 leading-[1.05] tracking-tight">
          Great restro products are <span className="text-arche-blue-light italic">engineered</span>, not improvised. We project-manage <span className="text-arche-blue-deep">complexity</span> into clarity.
        </h1>

        {/* Stats Row (Inspired by Image) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 max-w-5xl mx-auto px-4 opacity-80">
          {[
            { id: 'ID_01', label: 'DELIVERIES', val: '50+' },
            { id: 'ID_02', label: 'SUCCESS RATE', val: '99%' },
            { id: 'ID_03', label: 'STABILITY', val: '98%' },
            { id: 'ID_04', label: 'REACH_CAP', val: '+5M' }
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-arche-blue-light tracking-[0.2em] mb-2">{stat.id}</span>
              <div className="text-4xl md:text-5xl font-black text-arche-text mb-2">
                {stat.val.replace(/[+%]/, '')}<span className="text-arche-blue-light">{stat.val.match(/[+%]/)?.[0]}</span>
              </div>
              <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Authentication Form */}
      <div className="w-full max-w-lg bg-white/80 backdrop-blur-xl rounded-[3rem] border border-gray-100 p-8 md:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] relative z-10">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold text-arche-text">
            {isRegister ? 'Create your account' : 'System Access'}
          </h2>
          <p className="text-gray-400 mt-2">Manage your restaurant with precision.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-6">Full Name</label>
              <div className="relative">
                <Fingerprint className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input 
                  type="text" 
                  required
                  className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-5 pl-16 pr-8 focus:outline-none focus:ring-2 focus:ring-arche-blue-light/20 focus:border-arche-blue-light transition-all text-lg font-medium text-arche-text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-6">Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input 
                type="tel" 
                required
                className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-5 pl-16 pr-8 focus:outline-none focus:ring-2 focus:ring-arche-blue-light/20 focus:border-arche-blue-light transition-all text-lg font-medium text-arche-text"
                placeholder="9876543210"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 ml-6">Password</label>
            <div className="relative">
              <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
              <input 
                type="password" 
                required
                className="w-full bg-gray-50/50 border border-gray-100 rounded-full py-5 pl-16 pr-8 focus:outline-none focus:ring-2 focus:ring-arche-blue-light/20 focus:border-arche-blue-light transition-all text-lg font-medium text-arche-text"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex items-center gap-3 text-rose-500 text-sm font-bold animate-shake">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-arche-text text-white py-5 rounded-full font-bold text-xl hover:bg-black active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {loading ? 'AUTHENTICATING...' : (
              <>
                {isRegister ? 'CREATE ACCOUNT' : 'ACCESS SYSTEM'}
                <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
            <button 
                onClick={() => setIsRegister(!isRegister)}
                className="text-arche-blue-deep font-bold hover:text-arche-blue-light transition-colors"
            >
                {isRegister ? 'Already have an account? Login' : 'Need a new account? Register now'}
            </button>
        </div>
      </div>

      {/* Floating Chat Button (Matches Image) */}
      <div className="fixed bottom-8 right-8 bg-arche-text text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all z-50">
        <div className="relative">
          <LogIn size={20} className="rotate-90" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-arche-text"></span>
        </div>
        <span className="font-bold">Ask Saturn</span>
      </div>

      <div className="mt-12 text-[10px] font-bold text-gray-300 uppercase tracking-[0.4em] z-0">
        ARCHEARC ENGINE • STABILITY MODULE v2.1
      </div>
    </div>
  );
};

export default Login;
