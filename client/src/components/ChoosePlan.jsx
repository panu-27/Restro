import React, { useState } from 'react';
import axios from 'axios';
import { CustomLogo } from './Logo';
import { Zap, Shield, Clock, ChevronRight, Check, CreditCard, Sparkles, ArrowRight } from 'lucide-react';

const ChoosePlan = ({ onPlanActivated }) => {
  const [selectedPlan, setSelectedPlan] = useState(null); // 'trial' or 'pro'
  const [step, setStep] = useState('choose'); // 'choose' | 'autopay' | 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan);
    setStep('autopay');
  };

  const handleSetupAutopay = async () => {
    setLoading(true);
    setError('');
    try {
      // Step 1: Activate subscription
      await axios.post('/api/subscription/activate', { plan: selectedPlan });
      
      // Autopay is automatically configured during activation based on the new logic
      if (onPlanActivated) onPlanActivated();
      
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate plan');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    onPlanActivated();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-outfit relative overflow-hidden">
      {/* Decorative blurs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-arche-blue-light/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-arche-blue-deep/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 mb-12 relative z-10">
        <CustomLogo size={38} />
        <span className="text-2xl font-bold text-arche-text tracking-tight">ArcheArc <span className="text-gray-400 font-normal">Restro</span></span>
      </div>

      {step === 'choose' && (
        <div className="relative z-10 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-black text-arche-text tracking-tight mb-4">
              Choose your <span className="text-arche-blue-deep italic">plan</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">
              Start with a free trial. No credit card required. Upgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Pro Plan */}
            <button
              onClick={() => handleSelectPlan('pro')}
              className="group bg-white border-2 border-gray-100 rounded-[2.5rem] p-10 text-left hover:border-arche-blue-light hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-arche-blue-light/10 p-3 rounded-2xl">
                  <Clock className="text-arche-blue-light" size={24} />
                </div>
                <span className="text-[10px] font-black text-arche-blue-light uppercase tracking-[0.3em]">Pro Plan</span>
              </div>
              
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-arche-text">₹1</span>
                  <span className="text-gray-400 font-bold">/month</span>
                </div>
                <p className="text-gray-400 mt-2 font-medium">7-day free trial, then ₹1/month autopay.</p>
              </div>

              <div className="space-y-3 mb-8">
                {['Full POS Access', 'Table Management', 'Menu Builder', 'Sales Reports'].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                     <Check size={16} className="text-arche-blue-light" />
                    <span className="text-sm font-medium text-gray-600">{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-arche-blue-deep font-bold">
                <span>Start Trial</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Super Plan */}
            <button
              onClick={() => handleSelectPlan('super')}
              className="group bg-arche-text border-2 border-arche-text rounded-[2.5rem] p-10 text-left hover:shadow-[0_40px_80px_-20px_rgba(15,23,42,0.3)] transition-all duration-500 hover:-translate-y-1 active:scale-[0.98] relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-arche-blue-deep/20 blur-3xl -mr-16 -mt-16" />
              
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="bg-arche-blue-deep/20 p-3 rounded-2xl">
                  <Zap className="text-arche-blue-light" size={24} />
                </div>
                <span className="text-[10px] font-black text-arche-blue-light uppercase tracking-[0.3em]">Super Plan</span>
                <span className="ml-auto bg-arche-blue-deep px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-wider">Premium</span>
              </div>
              
              <div className="mb-6 relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">₹2</span>
                  <span className="text-gray-400 font-bold">/month</span>
                </div>
                <p className="text-gray-400 mt-2 font-medium">7-day free trial, then ₹2/month autopay.</p>
              </div>

              <div className="space-y-3 mb-8 relative z-10">
                {['Everything in Pro', 'Auto-pay Setup', 'Backup of Data Option', 'Priority Support'].map((f) => (
                  <div key={f} className="flex items-center gap-3">
                    <Check size={16} className="text-arche-blue-light" />
                    <span className="text-sm font-medium text-gray-400">{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-arche-blue-light font-bold relative z-10">
                <span>Get Started</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>
        </div>
      )}

      {step === 'autopay' && (
        <div className="relative z-10 w-full max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white border border-gray-100 rounded-[3rem] p-10 md:p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)]">
            <div className="text-center mb-10">
              <div className="bg-arche-text p-5 rounded-3xl inline-block mb-6 shadow-xl shadow-arche-text/20">
                <CreditCard className="text-white" size={32} />
              </div>
              <h2 className="text-2xl font-black text-arche-text mb-2">
                Setup Auto-Pay
              </h2>
              <p className="text-gray-400 font-medium">
                {selectedPlan === 'pro' 
                  ? '7 days free, then ₹1/month. Cancel anytime.'
                  : '7 days free, then ₹2/month. Cancel anytime.'
                }
              </p>
            </div>

            <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Plan</span>
                <span className="text-sm font-black text-arche-text capitalize">{selectedPlan} Monthly</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Trial</span>
                <span className="text-sm font-black text-arche-blue-deep">7 Days Free</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">After Trial</span>
                <span className="text-lg font-black text-arche-text">₹{selectedPlan === 'super' ? '2' : '1'}/month</span>
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-rose-500 text-sm font-bold mb-6">
                {error}
              </div>
            )}

            <button
              onClick={handleSetupAutopay}
              disabled={loading}
              className="w-full bg-arche-text text-white py-5 rounded-full font-bold text-lg hover:bg-black active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <span className="animate-pulse">Activating...</span>
              ) : (
                <>
                  Confirm & Setup Autopay
                  <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </>
              )}
            </button>

            <button
              onClick={() => setStep('choose')}
              className="w-full mt-4 text-gray-400 font-bold text-sm hover:text-arche-text transition-colors"
            >
              ← Back to plans
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="relative z-10 w-full max-w-lg animate-in fade-in zoom-in-95 duration-700 text-center">
          <div className="bg-white border border-gray-100 rounded-[3rem] p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)]">
            <div className="bg-arche-blue-deep p-6 rounded-full inline-block mb-8 shadow-xl shadow-arche-blue-deep/30">
              <Sparkles className="text-white" size={40} />
            </div>
            <h2 className="text-3xl font-black text-arche-text mb-3">You're all set!</h2>
            <p className="text-gray-400 font-medium text-lg mb-8">
              Your {selectedPlan === 'super' ? 'Super' : 'Pro'} plan is active with 7 days free.
            </p>
            
            <div className="bg-arche-blue-light/5 rounded-[2rem] p-6 mb-8 inline-block">
              <div className="flex items-center gap-3 text-arche-blue-deep">
                <Shield size={20} />
                <span className="font-bold text-sm">Full access to all features</span>
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-arche-text text-white py-5 rounded-full font-bold text-lg hover:bg-black active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-3 group"
            >
              Go to Dashboard
              <ChevronRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChoosePlan;
