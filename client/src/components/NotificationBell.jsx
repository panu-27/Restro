import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bell, X, Check, CheckCheck, Clock, ShoppingBag, ArrowLeft, ChefHat } from 'lucide-react';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Track IDs we've already seen so we only beep for truly NEW ones
  const seenIdsRef = useRef(null); // null = "not yet initialized"
  const audioRef = useRef(null);

  // Create audio element lazily
  const getAudio = () => {
    if (!audioRef.current) {
      const a = new Audio();
      // Use a different sharp bell/ding sound that's unmistakable
      a.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
      a.preload = 'auto';
      audioRef.current = a;
    }
    return audioRef.current;
  };

  const playAlertSound = () => {
    try {
      const audio = getAudio();
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // Stop after exactly 1 second
          setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
          }, 1000);
        }).catch(err => {
          console.warn('Notification audio blocked by browser:', err.message);
        });
      }
    } catch (e) {
      console.warn('Audio error:', e);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      const fetched = res.data || [];

      if (seenIdsRef.current === null) {
        // First load — just record what exists, don't beep
        seenIdsRef.current = new Set(fetched.map(n => n._id));
      } else {
        // Check for any notification ID we haven't seen before
        const newOnes = fetched.filter(n => !seenIdsRef.current.has(n._id));
        if (newOnes.length > 0) {
          // Add them to seen set
          newOnes.forEach(n => seenIdsRef.current.add(n._id));
          // Play alert sound for 1 second
          playAlertSound();
        }
      }

      setNotifications(fetched);
    } catch (err) {
      console.error('Notification fetch error:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 4000); // poll every 4s
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    try {
      await axios.patch('/api/notifications/read');
      fetchNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const markOneRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/${id}/read`);
      fetchNotifications();
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const getTimeSince = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  const getNotifIcon = (type) => {
    if (type === 'order_update') return <ChefHat size={20} className="text-emerald-500" />;
    return <ShoppingBag size={20} />;
  };

  const getNotifColor = (n) => {
    if (!n.read && n.type === 'order_update') return 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-50/80';
    if (!n.read) return 'bg-blue-50/40 border-blue-100 hover:bg-blue-50/60';
    return 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200';
  };

  return (
    <>
      <button
        onClick={() => setShowDropdown(true)}
        className="relative p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-xl transition-all"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF5A36] text-white text-[9px] font-black rounded-full flex items-center justify-center animate-in zoom-in duration-200 shadow-lg shadow-red-500/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300">
          {/* Header */}
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 bg-gray-50/80 gap-4 shrink-0">
            <button 
              onClick={() => setShowDropdown(false)} 
              className="flex items-center gap-2 text-sm font-black text-gray-500 hover:text-slate-900 transition-colors uppercase tracking-widest w-fit"
            >
              <ArrowLeft size={18} /> Go back to dashboard
            </button>
            <div className="flex items-center justify-between sm:justify-end gap-4">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[#FF5A36]" />
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="text-xs font-black bg-[#FF5A36] text-white px-2.5 py-0.5 rounded-full shadow-sm">{unreadCount} New</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto bg-[#F3F5F8] p-4 sm:p-8 flex flex-col md:flex-row gap-6">
            
            {/* Image / Illustration Section */}
            <div className="hidden md:flex flex-col items-center justify-center w-1/3 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-orange-50 rounded-full blur-3xl opacity-60"></div>
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
              <img src="/brand-logo.png" alt="Restro Logo" className="h-24 object-contain mb-8 opacity-80" />
              <div className="w-24 h-24 bg-[#FF5A36]/10 rounded-full flex items-center justify-center mb-6">
                <Bell size={40} className="text-[#FF5A36]" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 text-center">Stay Updated</h3>
              <p className="text-sm font-medium text-gray-400 text-center max-w-xs">
                Order alerts and kitchen updates appear here in real-time.
              </p>
            </div>

            {/* Notifications List Section */}
            <div className="flex-1 flex flex-col bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="md:hidden flex flex-col items-center justify-center p-6 bg-gray-50/50 border-b border-gray-100">
                 <img src="/brand-logo.png" alt="Restro Logo" className="h-12 object-contain mb-3 opacity-80" />
                 <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Alerts & Updates</p>
              </div>

              <div className="flex-1 overflow-y-auto p-2 sm:p-4 no-scrollbar">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                      <Check size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-1">You're all caught up!</h3>
                    <p className="text-sm font-medium text-gray-400">No new notifications at the moment.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => { if (!n.read) markOneRead(n._id); }}
                        className={`p-4 sm:p-5 rounded-2xl flex items-start gap-4 transition-all cursor-pointer border ${getNotifColor(n)}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                          !n.read && n.type === 'order_update'
                            ? 'bg-emerald-50 text-emerald-500'
                            : !n.read ? 'bg-white text-blue-500 shadow-blue-100/50' : 'bg-gray-50 text-gray-400'
                        }`}>
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className={`text-sm sm:text-base leading-relaxed ${!n.read ? 'font-black text-slate-900' : 'font-semibold text-gray-600'}`}>
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Clock size={12} className={!n.read ? (n.type === 'order_update' ? 'text-emerald-400' : 'text-blue-400') : 'text-gray-300'} />
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${!n.read ? (n.type === 'order_update' ? 'text-emerald-500' : 'text-blue-500') : 'text-gray-400'}`}>
                              {getTimeSince(n.createdAt)}
                            </span>
                            {n.type === 'order_update' && (
                              <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-md">
                                Kitchen Ready
                              </span>
                            )}
                          </div>
                        </div>
                        {!n.read && (
                          <div className={`w-3 h-3 rounded-full shrink-0 mt-2 shadow-sm animate-pulse ${n.type === 'order_update' ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-blue-500 shadow-blue-500/40'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default NotificationBell;
