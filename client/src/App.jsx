import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LayoutGrid, ShoppingBag, History, Settings, LogOut, User, BarChart3, Clock, ChevronDown, MoreVertical, HelpCircle, Utensils, BookOpen, LineChart, Grid, Key, X, Loader2 } from 'lucide-react';
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
import WaiterDashboard from './components/WaiterDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import NotificationBell from './components/NotificationBell';
import { DashboardSkeleton } from './components/Skeleton';

const BrandLogo = ({ className = '' }) => (
  <img
    src="/brand-logo.png"
    alt="Annapurna"
    className={className}
  />
);

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

  // ── useCallback hooks MUST be before any early returns (Rules of Hooks) ────────
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    window.dispatchEvent(new Event('close-notifications'));
  }, []);

  // ── AUTH GATE ────────────────────────────────────────────────────────────────────
  if (!token) return <Login onLoginSuccess={handleLoginSuccess} />;

  // ── ROLE-BASED DASHBOARD ROUTING ────────────────────────────────────────────────
  // Staff (Waiter/Kitchen) skip subscription check — they use owner's subscription
  const userRole = user?.role;
  if (userRole === 'Waiter') {
    return <WaiterDashboard user={user} onLogout={handleLogout} />;
  }
  if (userRole === 'Kitchen') {
    return <KitchenDashboard user={user} onLogout={handleLogout} />;
  }

  // ── SUBSCRIPTION GATE (Admin only) ────────────────────────────────────────────
  if (!subLoading && (!subscription || !subscription.hasSubscription)) {
    return <ChoosePlan onPlanActivated={handlePlanActivated} />;
  }

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (subLoading || !user) {
    return (
      <div className="flex flex-col lg:flex-row h-[100dvh] bg-[#F3F5F8] lg:p-3 gap-2 lg:gap-3 overflow-hidden">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:flex w-56 bg-white rounded-3xl flex-col py-5 px-3.5 shrink-0 border border-slate-100">
          <div className="sk-shimmer h-10 w-full rounded-xl mb-6 bg-slate-100" />
          <div className="flex-1 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="sk-shimmer h-9 w-full rounded-xl bg-slate-100" />
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 flex items-center gap-3">
            <div className="sk-shimmer w-10 h-10 rounded-full bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="sk-shimmer h-3 w-24 rounded bg-slate-100" />
              <div className="sk-shimmer h-2.5 w-16 rounded bg-slate-100" />
            </div>
          </div>
        </aside>
        {/* Main content skeleton */}
        <main className="flex-1 overflow-hidden lg:rounded-3xl bg-[#F3F5F8] px-2 lg:px-0">
          <DashboardSkeleton />
        </main>
        <style>{`
          @keyframes sk-wave {
            0%   { background-position: -400px 0; }
            100% { background-position:  400px 0; }
          }
          .sk-shimmer {
            background: linear-gradient(90deg, #f1f5f9 25%, #e8edf3 50%, #f1f5f9 75%);
            background-size: 800px 100%;
            animation: sk-wave 1.4s ease-in-out infinite;
          }
        `}</style>
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
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'tables', icon: Grid, label: 'Tables' },
    { id: 'pos', icon: ShoppingBag, label: 'Orders' },
    { id: 'history', icon: History, label: 'History' },
    { id: 'sales', icon: LineChart, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-[#F3F5F8] lg:p-3 gap-2 lg:gap-3 overflow-hidden relative">
      {/* ── Mobile Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="lg:hidden flex items-center justify-between bg-white px-4 py-3 z-20 mx-2 mt-2 border border-slate-100 rounded-2xl">
        <div className="flex items-center">
          <BrandLogo className="h-10 sm:h-12 object-contain shrink-0" />
        </div>
        <div className="flex items-center gap-2">
          {subscription?.plan === 'trial' && subscription?.isValid && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
              <Clock size={12} className="text-amber-500" />
              <span className="text-[10px] font-bold text-amber-600">Trial: {subscription.trialDaysRemaining}d</span>
            </div>
          )}
          <NotificationBell />
        </div>
      </div>

      {/* ── Desktop Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-56 bg-white rounded-3xl flex-col py-5 px-3.5 shrink-0 transition-all duration-500 z-[110] border border-slate-100">
        {/* Logo */}
        <div className="flex items-center justify-center lg:justify-start pl-1 pr-1.5 mb-3 mt-1">
          <div className="shrink-0 h-10 w-full flex items-center justify-center lg:justify-start">
            <BrandLogo className="h-10 object-contain shrink-0" />
          </div>
        </div>


        {/* Nav: Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          <p className="text-[10px] text-gray-400 mb-1.5 px-2 font-semibold uppercase tracking-[0.12em]">Menu</p>
          <nav className="space-y-1 mb-8">
            {navTabs.filter(t => t.id !== 'settings').map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center justify-start gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 text-[11px] font-bold uppercase tracking-[0.02em] ${activeTab === tab.id
                    ? 'bg-[#FF5A36] text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <tab.icon size={17} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Nav: Others */}
          <p className="text-[10px] text-gray-400 mb-1.5 px-2 font-semibold uppercase tracking-[0.12em]">Others</p>
          <nav className="space-y-1">
            {navTabs.filter(t => t.id === 'settings').map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center justify-start gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 text-[11px] font-bold uppercase tracking-[0.02em] ${activeTab === tab.id
                    ? 'bg-[#FF5A36] text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <tab.icon size={17} className="shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* User + Logout */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
          {subscription?.plan === 'trial' && subscription?.isValid && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
              <Clock size={14} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-amber-600 truncate">
                Trial: {subscription.trialDaysRemaining}d
              </span>
            </div>
          )}
          <div className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-gray-200 transition-colors group relative cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden">
                <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=DBEAFE&color=2563EB`} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-gray-400 font-medium capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>
            <NotificationBell desktopOffset={true} />
          </div>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto no-scrollbar relative lg:rounded-3xl pb-24 lg:pb-0 px-2 lg:px-0">
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
                user={user}
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
                onShowPassword={() => setShowPasswordModal(true)}
                onLogout={handleLogout}
              />
            </div>
          )}

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

      {/* ── Mobile Bottom Nav ───────────────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-[72px] z-[110] pb-safe px-2 transition-transform duration-300">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${isActive ? 'text-[#FF5A36]' : 'text-gray-400 hover:text-gray-900'
                }`}
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#FF5A36]/10' : ''}`}>
                <tab.icon size={22} className={isActive ? 'fill-[#FF5A36]/20' : ''} />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest truncate max-w-full px-1 ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;

