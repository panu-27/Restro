import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import TableGrid from './TableGrid';
import TableView from './TableView';
import { LogOut, Grid, ChefHat, Bell, BellOff, Key, X } from 'lucide-react';
import NotificationBell from './NotificationBell';

const WaiterDashboard = ({ user, onLogout }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [openTableId, setOpenTableId] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordState, setPasswordState] = useState({ current: '', new: '', confirm: '', error: '', loading: false, success: false });

  const fetchData = async () => {
    try {
      const [menuRes, ordersRes, tablesRes] = await Promise.all([
        axios.get('/api/menu'),
        axios.get('/api/orders/active'),
        axios.get('/api/tables'),
      ]);
      setMenuItems(menuRes.data);
      setActiveOrders(ordersRes.data);
      setTables(tablesRes.data);
    } catch (err) {
      console.error('Waiter fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordState.new !== passwordState.confirm) {
      return setPasswordState(prev => ({ ...prev, error: 'New passwords do not match' }));
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
      setPasswordState(prev => ({ ...prev, loading: false, error: err.response?.data?.error || 'Failed to change password' }));
    }
  };

  // Full-screen table view
  if (openTableId) {
    return (
      <TableView
        tableId={openTableId}
        menuItems={menuItems}
        user={user}
        onClose={() => { fetchData(); setOpenTableId(null); }}
        onCheckoutComplete={() => { fetchData(); setOpenTableId(null); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F3F5F8] overflow-hidden">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
            <ChefHat size={18} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-900">{user?.name || 'Waiter'}</p>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Waiter</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => setShowPasswordModal(true)} className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Change Password">
            <Key size={18} />
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Tables Grid */}
      <main className="flex-1 overflow-y-auto no-scrollbar p-2">
        <TableGrid
          activeOrders={activeOrders}
          onTableClick={(tableId) => setOpenTableId(tableId)}
          tableCount={user?.tableCount || 10}
          readOnly={true}
        />
      </main>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-black text-gray-900 text-lg">Change Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {passwordState.success ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key size={24} className="text-emerald-500" />
                  </div>
                  <h4 className="font-black text-emerald-600 text-lg">Password Changed!</h4>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {passwordState.error && (
                    <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">{passwordState.error}</div>
                  )}
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Current Password</label>
                    <input type="password" required value={passwordState.current}
                      onChange={e => setPasswordState(prev => ({ ...prev, current: e.target.value, error: '' }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                      placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">New Password</label>
                    <input type="password" required value={passwordState.new}
                      onChange={e => setPasswordState(prev => ({ ...prev, new: e.target.value, error: '' }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                      placeholder="••••••••" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                    <input type="password" required value={passwordState.confirm}
                      onChange={e => setPasswordState(prev => ({ ...prev, confirm: e.target.value, error: '' }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
                      placeholder="••••••••" />
                  </div>
                  <button type="submit" disabled={passwordState.loading}
                    className="w-full mt-2 py-3.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50">
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

export default WaiterDashboard;
