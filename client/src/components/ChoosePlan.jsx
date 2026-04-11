import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { CustomLogo } from './Logo';
import { Check, ChevronRight, CreditCard, Sparkles, Shield, ArrowRight } from 'lucide-react';

const pricingPlans = [
    {
        id: 'pro',
        label: 'Starter', labelColor: '#1a73e8', name: 'Pro Plan', price: '₹1/mo',
        desc: '7-day free trial, then ₹1/month autopay. Cancel anytime.',
        cta: 'Start Trial', ctaVariant: 'secondary',
        features: ['Full POS Access', 'Table Management', 'Menu Builder', 'Sales Reports'],
    },
    {
        id: 'super',
        label: 'Premium', labelColor: '#1a73e8', name: 'Super Plan', price: '₹2/mo',
        desc: '7-day free trial, then ₹2/month autopay. Priority support included.',
        cta: 'Get Started', ctaVariant: 'primary',
        features: ['Everything in Pro', 'Auto-pay Setup', 'Backup of Data Option', 'Priority Support'],
    }
];

function PricingCard({ plan, delay, onSelect }) {
    const [visible, setVisible] = useState(false);
    const [hovered, setHovered] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold: 0.1 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: 24, padding: 'clamp(28px, 2.5vw, 40px)',
                display: 'flex', flexDirection: 'column', background: plan.ctaVariant === 'primary' ? '#ffffff' : '#F8F9FC',
                border: plan.ctaVariant === 'primary' ? '2px solid #202124' : '2px solid transparent',
                position: 'relative', transition: 'all 0.3s cubic-bezier(0.22,1,0.36,1)',
                transform: visible ? (hovered ? 'translateY(-4px)' : 'translateY(0)') : 'translateY(32px)',
                opacity: visible ? 1 : 0,
                transitionDelay: visible ? '0ms' : `${delay}ms`,
                boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.03)',
                zIndex: hovered ? 2 : 1,
                cursor: 'pointer'
            }}
            onClick={() => onSelect(plan.id)}
        >
            <div style={{ paddingBottom: '24px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '16px', backgroundColor: plan.ctaVariant === 'primary' ? '#f1f3f4' : '#fff', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.01em', color: plan.labelColor }}>
                        {plan.label}
                    </span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: 'clamp(1.4rem, 1.8vw, 1.6rem)', fontWeight: 600, color: '#202124', lineHeight: 1.2, marginBottom: 6 }}>{plan.name}</h2>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#202124' }}>{plan.price}</p>
                </div>
                <div style={{ marginBottom: '32px' }}>
                    <p style={{ fontSize: '0.95rem', color: '#5f6368', lineHeight: 1.5, margin: 0 }}>{plan.desc}</p>
                </div>
                <div style={{ marginBottom: '32px' }}>
                    <button style={{
                        width: '100%',
                        padding: '14px 24px', borderRadius: 24,
                        backgroundColor: plan.ctaVariant === 'primary' ? '#202124' : '#e8eaed',
                        color: plan.ctaVariant === 'primary' ? '#ffffff' : '#202124',
                        fontSize: '0.95rem', fontWeight: 600, border: 'none',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', transition: 'transform 0.2s',
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {plan.cta}
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderTop: '1px solid #e8eaed', paddingTop: '24px' }}>
                {plan.features.length > 0 && (
                    <>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#202124', marginBottom: 20 }}>Plan includes:</p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {plan.features.map((feature, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <Check size={18} color="#202124" strokeWidth={2} style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.9rem', color: '#3c4043', lineHeight: 1.4, fontWeight: 500 }}>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}

const ChoosePlan = ({ onPlanActivated }) => {
  const [step, setStep] = useState('choose');
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');
  const [activePlanName, setActivePlanName] = useState('Pro');

  const handleSelectPlan = async (planId) => {
    setLoadingPlan(planId);
    setError('');
    try {
      await axios.post('/api/subscription/activate', { plan: planId });
      setActivePlanName(planId === 'super' ? 'Super' : 'Pro');
      if (onPlanActivated) onPlanActivated();
      setStep('success');
    } catch (err) {
      if (!err.response) {
        setError('Unable to connect to server. Please ensure the backend is running.');
      } else {
        setError(err.response.data?.error || 'Failed to activate free trial. Please try again.');
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div style={{ backgroundColor: '#fcfcfc', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pricing-cards-wrapper { display: flex; justify-content: center; gap: 32px; align-items: stretch; position: relative; z-index: 10; flex-wrap: wrap; }
        .pricing-cards-wrapper > div { flex: 1; min-width: 320px; max-width: 400px; }
      `}</style>
      
      {/* Navbar area */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '32px 48px', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 100, animation: 'fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <CustomLogo size={32} />
        <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#202124', letterSpacing: '-0.02em', marginTop: '2px' }}>ArcheArc Restro</span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', padding: '120px 24px', position: 'relative', zIndex: 10 }}>
        {step === 'choose' && (
          <div style={{ width: '100%', maxWidth: '1000px' }}>
            <div style={{ textAlign: 'center', marginBottom: '64px' }}>
              <h1 style={{ fontSize: 'clamp(2.5rem, 4.5vw, 4.5rem)', fontWeight: 700, color: '#111827', letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: 20, animation: 'fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                  Choose your plan.
              </h1>
              <p style={{ fontSize: '1.15rem', color: '#6b7280', fontWeight: 500, animation: 'fadeSlideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' }}>
                Start with a 7-Day Free Trial. No credit card required.
              </p>
            </div>

            {error && (
              <div style={{ maxWidth: '600px', margin: '0 auto 32px', background: '#fef2f2', color: '#ef4444', padding: '16px', borderRadius: '16px', fontSize: '0.95rem', fontWeight: 500, textAlign: 'center', animation: 'fadeSlideUp 0.3s ease-out' }}>
                {error}
              </div>
            )}

            <div className="pricing-cards-wrapper">
              {pricingPlans.map((plan, i) => (
                <div key={plan.id} style={{ opacity: loadingPlan && loadingPlan !== plan.id ? 0.6 : 1, transition: 'opacity 0.3s', pointerEvents: loadingPlan ? 'none' : 'auto' }}>
                  <PricingCard 
                    plan={{...plan, cta: loadingPlan === plan.id ? 'Starting Trial...' : plan.cta}} 
                    delay={800 + (i * 200)} 
                    onSelect={handleSelectPlan} 
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'success' && (
          <div style={{ width: '100%', maxWidth: '540px', background: '#fff', borderRadius: '32px', padding: '60px 48px', boxShadow: '0 24px 80px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center', animation: 'dropdown-fade 0.5s cubic-bezier(0.22,1,0.36,1)' }}>
            <div style={{ display: 'inline-flex', padding: '20px', background: '#e6f4ea', borderRadius: '50%', marginBottom: '32px' }}>
              <Sparkles size={40} color="#1e8e3e" />
            </div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 600, color: '#202124', letterSpacing: '-0.03em', marginBottom: '16px' }}>You're all set!</h2>
            <p style={{ fontSize: '1.1rem', color: '#5f6368', marginBottom: '40px', lineHeight: 1.5 }}>
              Your <strong style={{ color: '#202124' }}>{activePlanName}</strong> trial is active.<br/> Enjoy 7 days entirely free.
            </p>
            
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '16px 24px', background: '#f8f9fc', borderRadius: '100px', marginBottom: '48px', border: '1px solid #e8eaed' }}>
              <Shield size={20} color="#1a73e8" />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#202124' }}>Full access to all features</span>
            </div>

            <button
              onClick={() => onPlanActivated && onPlanActivated()}
              style={{
                width: '100%', background: '#1a73e8', color: '#fff', border: 'none',
                padding: '16px', fontSize: '1.05rem', fontWeight: 600, borderRadius: '100px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 8px 24px rgba(26,115,232,0.25)'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Go to Dashboard <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChoosePlan;
