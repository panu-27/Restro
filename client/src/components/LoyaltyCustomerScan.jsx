import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, RotateCcw, Utensils, AlertTriangle } from 'lucide-react';

function getOrCreateCustomerId() {
  let id = localStorage.getItem('loyalty_customer_id');
  if (!id) {
    id = 'cust_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('loyalty_customer_id', id);
  }
  return id;
}

export default function LoyaltyCustomerScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  const [visitCount, setVisitCount] = useState(0);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantSlug, setRestaurantSlug] = useState('');
  const [restaurantLogo, setRestaurantLogo] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  const restaurantId = searchParams.get('r');
  const code = searchParams.get('c');
  const customerId = getOrCreateCustomerId();

  useEffect(() => {
    if (!restaurantId) {
      setStatus('error');
      setMessage('Invalid or missing restaurant ID.');
      return;
    }

    // Seamlessly forward to the restaurant's public page
    const codeParam = code ? `?c=${encodeURIComponent(code)}` : '';
    navigate(`/restro/${encodeURIComponent(restaurantId)}${codeParam}`, { replace: true });
  }, [restaurantId, code, navigate]);

  const handleResetAttendance = async () => {
    setResetting(true);
    try {
      const res = await axios.post('/api/loyalty/customer-reset', {
        restaurantId,
        customerId
      });
      setVisitCount(0);
      localStorage.removeItem(`loyalty_scan_${restaurantId}`);
      setShowResetModal(false);
      setResetSuccessMsg(res.data.message || 'Your attendance ticks have been reset.');
      setTimeout(() => setResetSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset attendance. Please try again.');
    } finally {
      setResetting(false);
    }
  };

  const renderPunchCard = () => {
    const totalSlots = 10;
    let currentCardFilled = visitCount % totalSlots;
    if (currentCardFilled === 0 && visitCount > 0) {
      currentCardFilled = totalSlots;
    }

    const slots = [];
    for (let i = 1; i <= totalSlots; i++) {
      slots.push(
        <div
          key={i}
          className={`w-[46px] h-[46px] rounded-full border-2 flex items-center justify-center transition-all ${
            i <= currentCardFilled
              ? 'border-orange-500 bg-orange-50 text-orange-500 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-300'
          }`}
        >
          {i <= currentCardFilled ? <CheckCircle2 size={24} strokeWidth={2.5} /> : <span className="font-bold text-[14px]">{i}</span>}
        </div>
      );
    }

    return (
      <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 mt-5 shadow-sm">
        <div className="flex justify-between items-center mb-4 px-1">
          <p className="text-[14px] font-bold text-slate-800">Attendance Card</p>
          <p className="text-[11px] font-black tracking-widest text-orange-500 uppercase bg-orange-50 px-3 py-1 rounded-full">
            {currentCardFilled} / {totalSlots}
          </p>
        </div>
        <div className="grid grid-cols-5 gap-y-4 gap-x-2 justify-items-center">
          {slots}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans">
      <div className="bg-white max-w-[380px] w-full p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center relative">
        {restaurantLogo && (
          <img
            src={restaurantLogo}
            alt={restaurantName}
            className="w-14 h-14 object-cover rounded-2xl border border-slate-100 mb-3 shadow-sm"
          />
        )}

        {resetSuccessMsg && (
          <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-2xl animate-in fade-in duration-200 flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            <span>{resetSuccessMsg}</span>
          </div>
        )}

        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Verifying Attendance...</h2>
            <p className="text-sm text-slate-500">Please wait while we record your visit.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1 leading-tight">{code ? "You're Checked In!" : message}</h2>
            <p className="text-sm font-semibold text-slate-500 mb-4">{restaurantName}</p>

            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Lifetime Visits</p>
            <p className="text-3xl font-black text-slate-800">{visitCount}</p>

            {renderPunchCard()}

            {code && (
              <p className="text-[11px] font-bold text-emerald-600 mt-4 bg-emerald-50 px-4 py-2 rounded-full inline-block tracking-wide">
                Attendance marked for today
              </p>
            )}

            {/* Customer Actions */}
            <div className="w-full mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5">
              {(restaurantSlug || restaurantId) && (
                <button
                  onClick={() => navigate(`/restro/${restaurantSlug || restaurantId}`)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Utensils size={15} />
                  View Restaurant & Menu
                </button>
              )}

              {visitCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="w-full py-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={13} />
                  Reset My Attendance Count
                </button>
              )}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-4">
              <XCircle size={36} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Notice</h2>
            <p className="text-sm font-semibold text-slate-500 mb-4 px-2">{message}</p>

            {visitCount > 0 && (
              <>
                <p className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-1">Total Lifetime Visits</p>
                <p className="text-2xl font-black text-slate-800">{visitCount}</p>
                {renderPunchCard()}
              </>
            )}

            <div className="w-full mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
              {(restaurantSlug || restaurantId) && (
                <button
                  onClick={() => navigate(`/restro/${restaurantSlug || restaurantId}`)}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Utensils size={15} />
                  View Restaurant & Menu
                </button>
              )}

              {visitCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="w-full py-2 text-slate-400 hover:text-rose-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={13} />
                  Reset My Attendance Count
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-left shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Reset Your Attendance?</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              This will reset your current attendance ticks back to 0 for {restaurantName}. Only your own attendance count will be cleared. Other customer visits and restaurant data will remain unaffected.
            </p>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={resetting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAttendance}
                disabled={resetting}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resetting ? <Loader2 size={14} className="animate-spin" /> : 'Yes, Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
