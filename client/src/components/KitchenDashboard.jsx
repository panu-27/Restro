import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { LogOut, ChefHat, Clock, Bell, BellOff, Volume2, VolumeX, Key, X, CheckCircle2, Flame, Timer, Utensils } from 'lucide-react';

const KitchenDashboard = ({ user, onLogout }) => {
  const [activeOrders, setActiveOrders] = useState([]);
  const prevOrderIdsRef = useRef(new Set());
  const [newOrderFlash, setNewOrderFlash] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordState, setPasswordState] = useState({ current: '', new: '', confirm: '', error: '', loading: false, success: false });
  const audioRef = useRef(null);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders/active');
      const orders = res.data;
      
      // Detect new orders
      const currentIds = new Set(orders.map(o => o._id));
      const newIds = new Set();
      currentIds.forEach(id => {
        if (!prevOrderIdsRef.current.has(id) && prevOrderIdsRef.current.size > 0) {
          newIds.add(id);
        }
      });
      
      if (newIds.size > 0) {
        setNewOrderFlash(newIds);
        // Play notification sound for exactly 2 seconds
        if (soundEnabled && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
            }
          }, 2000);
        }
        // Clear flash after 5 seconds
        setTimeout(() => setNewOrderFlash(new Set()), 5000);
      }
      
      prevOrderIdsRef.current = currentIds;
      setActiveOrders(orders);
    } catch (err) {
      console.error('Kitchen fetch error:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordState.new !== passwordState.confirm) {
      return setPasswordState(prev => ({ ...prev, error: 'Passwords do not match' }));
    }
    if (passwordState.new.length < 4) {
      return setPasswordState(prev => ({ ...prev, error: 'Password must be at least 4 characters' }));
    }
    setPasswordState(prev => ({ ...prev, loading: true, error: '' }));
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword: passwordState.current,
        newPassword: passwordState.new
      });
      setPasswordState(prev => ({ ...prev, loading: false, success: true }));
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordState({ current: '', new: '', confirm: '', error: '', loading: false, success: false });
      }, 1500);
    } catch (err) {
      setPasswordState(prev => ({ ...prev, loading: false, error: err.response?.data?.error || 'Failed' }));
    }
  };

  const getTimeSince = (dateStr) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const statusConfig = {
    Pending: { color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: Timer, label: 'NEW' },
    Served: { color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, label: 'SERVED' },
  };

  // 1) Filter only TODAY'S orders (empty after 24h / new day)
  const todayString = new Date().toDateString();
  const todaysOrders = activeOrders.filter(o => new Date(o.createdAt).toDateString() === todayString);

  // Group today's orders by status for visual priority
  const pendingOrders = todaysOrders.filter(o => o.status === 'Pending');
  const servedOrders = todaysOrders.filter(o => o.status === 'Served');

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 text-slate-900 overflow-hidden">
      {/* Audio element for notifications - new restaurant bell chime */}
      <audio ref={audioRef} preload="auto">
        <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-500 shadow-inner">
            <ChefHat size={22} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">Kitchen Display</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{user?.name || 'Kitchen'} • Live</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Order count */}
          <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-amber-500" />
              <span className="text-sm font-black text-slate-900">{pendingOrders.length}</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest">WAITING</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-sm font-black text-slate-900">{servedOrders.length}</span>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest">SERVED</span>
            </div>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl transition-all shadow-sm ${soundEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'}`}
            title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Password */}
          <button onClick={() => setShowPasswordModal(true)} className="p-2.5 rounded-xl bg-white text-slate-400 hover:text-emerald-500 border border-slate-200 transition-colors shadow-sm hover:bg-slate-50">
            <Key size={16} />
          </button>

          {/* Logout */}
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-500 rounded-xl text-xs font-bold border border-rose-200 hover:bg-rose-100 transition-all shadow-sm">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>

      {/* Orders Grid */}
      <main className="flex-1 overflow-y-auto p-3 lg:p-4 bg-slate-50">
        {todaysOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-6">
              <Utensils size={40} className="text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-400 mb-2">No Active Orders</h2>
            <p className="text-sm text-slate-500 font-medium">Waiting for new orders from waiters...</p>
            <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Listening for orders</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 lg:gap-4">
            {/* Pending orders first (priority), then served */}
            {[...pendingOrders, ...servedOrders].map(order => {
              const config = statusConfig[order.status] || statusConfig.Pending;
              const isNew = newOrderFlash.has(order._id);
              const isServed = order.status === 'Served';
              const StatusIcon = config.icon;
              
              return (
                <div
                  key={order._id}
                  className={`rounded-2xl border overflow-hidden transition-all duration-500 shadow-sm ${
                    isNew ? 'border-amber-400 shadow-lg shadow-amber-500/20 animate-pulse ring-4 ring-amber-400/20 bg-white scale-[1.02]' :
                    isServed ? 'border-emerald-100 bg-emerald-50/30 opacity-75 hover:opacity-100' :
                    'border-slate-200 bg-white hover:shadow-md'
                  }`}
                >
                  {/* Card Header */}
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${isNew ? 'bg-amber-50 border-amber-100' : isServed ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg shadow-sm ${config.bg} ${config.border} border`}>
                        <StatusIcon size={12} className={config.text} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${config.text}`}>{config.label}</span>
                      </div>
                      {order.tableId && (
                        <span className="text-sm font-black text-slate-800">{order.tableId}</span>
                      )}
                      {order.orderType === 'Parcel' && (
                        <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 shadow-sm">PARCEL</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={12} />
                      <span className="text-[11px] font-bold">{getTimeSince(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3 space-y-1.5">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className={`flex items-center justify-between py-1.5 border-b border-dashed last:border-0 ${isServed ? 'border-emerald-100' : 'border-slate-100'}`}>
                        <div className="flex items-center gap-2">
                          {item.round > 1 && (
                            <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shadow-sm border border-amber-200">R{item.round}</span>
                          )}
                          <span className={`text-sm font-bold ${isServed ? 'text-slate-500' : 'text-slate-700'}`}>{item.name}</span>
                        </div>
                        <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg min-w-[32px] text-center shadow-sm ${isServed ? 'text-slate-500 bg-slate-100' : 'text-slate-700 bg-slate-100'}`}>×{item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Order meta */}
                  <div className={`px-4 py-2 border-t flex items-center justify-between ${isServed ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50'}`}>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      #{order.orderNumber} • {order.items?.length || 0} items
                    </span>
                    {order.customerName && (
                      <span className="text-[10px] font-bold text-slate-400 truncate max-w-[120px] uppercase tracking-widest">{order.customerName}</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className={`px-4 py-3 border-t flex gap-2 ${isServed ? 'border-emerald-100 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
                    {!isServed && (
                      <button
                        onClick={() => updateOrderStatus(order._id, 'Served')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle2 size={16} /> Mark Ready
                      </button>
                    )}
                    {isServed && (
                      <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-emerald-500 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-200 shadow-sm">
                        <CheckCircle2 size={16} /> Served ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-black text-slate-900 text-lg">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {passwordState.success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key size={24} className="text-emerald-500" />
                  </div>
                  <h4 className="font-black text-emerald-500 text-lg">Password Changed!</h4>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordState.error && (
                    <div className="bg-rose-50 text-rose-500 text-xs font-bold p-3 rounded-xl border border-rose-100">{passwordState.error}</div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Password</label>
                    <input type="password" required value={passwordState.current}
                      onChange={e => setPasswordState(prev => ({ ...prev, current: e.target.value, error: '' }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-medium"
                      placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                    <input type="password" required value={passwordState.new}
                      onChange={e => setPasswordState(prev => ({ ...prev, new: e.target.value, error: '' }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-medium"
                      placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                    <input type="password" required value={passwordState.confirm}
                      onChange={e => setPasswordState(prev => ({ ...prev, confirm: e.target.value, error: '' }))}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-medium"
                      placeholder="••••••••" />
                  </div>
                  <button type="submit" disabled={passwordState.loading}
                    className="w-full mt-2 py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 hover:bg-slate-800 shadow-md">
                    {passwordState.loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;
