import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutGrid, ShoppingBag, History, Settings, LogOut, User, BarChart3, Clock, ChevronDown, MoreVertical, HelpCircle, Utensils, BookOpen, LineChart, Grid, Key, X } from 'lucide-react';
import { CustomLogo } from './components/Logo';
import TableGrid from './components/TableGrid';
import TableView from './components/TableView';
import POSInterface from './components/POSInterface';
import OrderHistory from './components/OrderHistory';
import Login from './components/Login';
import ChoosePlan from './components/ChoosePlan';
import SubscriptionBanner from './components/SubscriptionBanner';
import SettingsPanel from './components/SettingsPanel';
import SalesReport from './components/SalesReport';
import { DashboardView } from './components/DashboardView';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTable, setSelectedTable] = useState(null); // { tableId, existingOrder }
  const [openTableId, setOpenTableId] = useState(null);     // full-screen TableView for tables
  const [openOrderId, setOpenOrderId] = useState(null);     // full-screen TableView for specific orders (parcels)
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordState, setPasswordState] = useState({ current: '', new: '', confirm: '', error: '', loading: false, success: false });
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchInitialData();
      fetchSubscription();
    }
  }, [token]);

  const fetchInitialData = async () => {
    try {
      const [menuRes, ordersRes, userRes, tablesRes] = await Promise.all([
        axios.get('/api/menu'),
        axios.get('/api/orders/active'),
        axios.get('/api/auth/me'),
        axios.get('/api/tables'),
      ]);
      setMenuItems(menuRes.data);
      setActiveOrders(ordersRes.data);
      setUser(userRes.data);
      setTables(tablesRes.data);
    } catch (err) {
      console.error('Initial fetch failed:', err);
      if (err.response?.status === 401) handleLogout();
    }
  };

  const fetchSubscription = async () => {
    setSubLoading(true);
    try {
      const res = await axios.get('/api/subscription/status');
      setSubscription(res.data);
    } catch (err) {
      console.error('Subscription fetch failed:', err);
    } finally {
      setSubLoading(false);
    }
  };

  const handleLoginSuccess = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setSubscription(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const fetchActiveOrders = async () => {
    if (!token) return;
    try {
      const res = await axios.get('/api/orders/active');
      setActiveOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  useEffect(() => {
    if (token) {
      const interval = setInterval(fetchActiveOrders, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

  /* Table click → open full-screen TableView */
  const handleTableClick = (tableId) => {
    setOpenTableId(tableId);
  };

  /* POS table click (from POS tab) → old behaviour */
  const handlePOSTableClick = (tableId, existingOrder) => {
    setSelectedTable({ tableId, existingOrder });
  };

  const handlePlanActivated = () => {
    setActiveTab('dashboard');
    fetchSubscription();
    fetchInitialData();
  };

  const handleSettingsUpdate = () => {
    fetchInitialData();
    fetchSubscription();
  };

  // ── AUTH GATE ──────────────────────────────────────────────────────────────
  if (!token) return <Login onLoginSuccess={handleLoginSuccess} />;

  // ── SUBSCRIPTION GATE ──────────────────────────────────────────────────────
  if (!subLoading && (!subscription || !subscription.hasSubscription)) {
    return <ChoosePlan onPlanActivated={handlePlanActivated} />;
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (subLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <CustomLogo size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em] text-[10px]">Loading ArcheArc Restro...</p>
        </div>
      </div>
    );
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordState.new !== passwordState.confirm) {
      return setPasswordState(prev => ({ ...prev, error: 'New passwords do not match' }));
    }
    if (passwordState.new.length < 6) {
      return setPasswordState(prev => ({ ...prev, error: 'Password must be at least 6 characters' }));
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

  // ── FULL-SCREEN VIEW (replaces entire UI) ──────────────────────────────────
  if (openTableId || openOrderId) {
    return (
      <TableView
        tableId={openTableId}
        orderId={openOrderId}
        isHistoryView={activeTab === 'history'}
        menuItems={menuItems}
        user={user}
        onClose={() => {
          fetchActiveOrders();
          setOpenTableId(null);
          setOpenOrderId(null);
        }}
        onCheckoutComplete={() => {
          fetchActiveOrders();
          setOpenTableId(null);
          setOpenOrderId(null);
        }}
      />
    );
  }

  // ── MAIN APP SHELL ─────────────────────────────────────────────────────────
  const tableCount = user?.tableCount || 10;

  const navTabs = [
    { id: 'dashboard', icon: LayoutGrid,  label: 'Dashboard' },
    { id: 'tables',    icon: Grid,        label: 'Tables' },
    { id: 'pos',       icon: ShoppingBag, label: 'Orders' },
    { id: 'history',   icon: History,     label: 'History' },
    { id: 'sales',     icon: LineChart,   label: 'Analytics' },
    { id: 'settings',  icon: Settings,    label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-100 p-2 lg:p-4 gap-4 overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-20 lg:w-64 bg-white rounded-3xl flex flex-col py-6 px-4 shrink-0 shadow-sm transition-all duration-500 z-20">
        {/* Logo */}
        <div className="flex items-center justify-center lg:justify-start gap-4 px-2 mb-10">
          <div className="shrink-0">
            <CustomLogo size={36} />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="font-black text-2xl tracking-tighter text-gray-900 leading-none ">
              RESTRO
            </span>
            <span className="text-[10px] font-black text-gray-500 tracking-[0.2em] mt-1 leading-none ">
              BY ARCHEARC
            </span>
          </div>
        </div>


        {/* Nav: Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          <p className="text-[11px] text-gray-400 mb-2 px-2 hidden lg:block font-medium uppercase tracking-wider">Menu</p>
          <nav className="space-y-1 mb-8">
            {navTabs.filter(t => t.id !== 'settings').map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 lg:px-4 rounded-xl transition-all duration-300 text-sm font-black  uppercase tracking-tight ${
                  activeTab === tab.id
                    ? 'bg-[#FF5A36] text-white shadow-xl shadow-[#FF5A36]/30'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon size={20} className="shrink-0" />
                <span className="hidden lg:block">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Nav: Others */}
          <p className="text-[11px] text-gray-400 mb-2 px-2 hidden lg:block font-medium uppercase tracking-wider">Others</p>
          <nav className="space-y-1">

            {navTabs.filter(t => t.id === 'settings').map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-3 lg:px-4 rounded-xl transition-all duration-300 text-sm font-black  uppercase tracking-tight ${
                  activeTab === tab.id
                    ? 'bg-[#FF5A36] text-white shadow-xl shadow-[#FF5A36]/30'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <tab.icon size={20} className="shrink-0" />
                <span className="hidden lg:block">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User + Logout */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
          {subscription?.plan === 'trial' && subscription?.isValid && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
              <Clock size={14} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-amber-600 truncate">
                Trial: {subscription.trialDaysRemaining}d
              </span>
            </div>
          )}
          <div className="flex items-center justify-between p-2 lg:p-2 rounded-xl border border-transparent hover:border-gray-200 transition-colors group relative cursor-pointer pt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=DBEAFE&color=2563EB`} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="hidden lg:block overflow-hidden">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-gray-400 font-medium capitalize">Admin</p>
              </div>
            </div>
            <div className="hidden lg:flex flex-col items-center gap-1">
              <button onClick={() => setShowPasswordModal(true)} className="p-1 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Change Password">
                <Key size={14} />
              </button>
              <button onClick={handleLogout} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
                <LogOut size={14} />
              </button>
            </div>
            {/* Mobile actions */}
            <div className="lg:hidden absolute flex flex-col top-0 right-0 h-full p-2 gap-2">
               <button onClick={() => setShowPasswordModal(true)} className="p-1 text-gray-400 rounded-lg" title="Change Password"><Key size={16}/></button>
               <button onClick={handleLogout} className="p-1 text-gray-400 rounded-lg" title="Logout"><LogOut size={16}/></button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative rounded-3xl">
        <div className="w-full h-full !pb-10 max-w-[1600px] mx-auto">
          {!bannerDismissed && (
            <SubscriptionBanner subscription={subscription} onDismiss={() => setBannerDismissed(true)} />
          )}

          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              activeOrders={activeOrders} 
              tableCount={tableCount} 
              onTabChange={setActiveTab}
            />
          )}

          {/* Tables */}
          {activeTab === 'tables' && (
            <div className="animate-in fade-in duration-500">
              <TableGrid
                activeOrders={activeOrders}
                onTableClick={handleTableClick}
                tableCount={tableCount}
              />
            </div>
          )}

          {/* POS */}
          {activeTab === 'pos' && (
            <div className="animate-in fade-in duration-500">
              <POSInterface
                activeOrders={activeOrders}
                onOrderUpdate={fetchActiveOrders}
                onOrderClick={(orderId) => setOpenOrderId(orderId)}
              />
            </div>
          )}

          {/* History */}
          {activeTab === 'history' && (
            <div className="animate-in fade-in duration-500">
              <OrderHistory 
                activeOrders={activeOrders} 
                onOrderUpdate={fetchActiveOrders} 
                onOrderClick={(orderId) => setOpenOrderId(orderId)}
              />
            </div>
          )}

          {/* Sales */}
          {activeTab === 'sales' && (
            <div className="animate-in fade-in duration-500">
              <SalesReport />
            </div>
          )}

          {/* Settings */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-500">
              <SettingsPanel 
                user={user} 
                subscription={subscription} 
                onSettingsUpdate={handleSettingsUpdate} 
              />
            </div>
          )}

          {/* Change Password Modal */}
          {showPasswordModal && (
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                        <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100">
                          {passwordState.error}
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Current Password</label>
                        <input
                          type="password"
                          required
                          value={passwordState.current}
                          onChange={e => setPasswordState(prev => ({ ...prev, current: e.target.value, error: '' }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300 font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">New Password</label>
                        <input
                          type="password"
                          required
                          value={passwordState.new}
                          onChange={e => setPasswordState(prev => ({ ...prev, new: e.target.value, error: '' }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300 font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                        <input
                          type="password"
                          required
                          value={passwordState.confirm}
                          onChange={e => setPasswordState(prev => ({ ...prev, confirm: e.target.value, error: '' }))}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all placeholder:text-gray-300 font-medium"
                          placeholder="••••••••"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={passwordState.loading}
                        className="w-full mt-2 py-3.5 bg-gray-900 border-2 border-gray-900 hover:bg-transparent hover:text-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {passwordState.loading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;

