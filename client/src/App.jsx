import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LayoutGrid, ShoppingBag, History, Settings, LogOut, User, BarChart3, Clock } from 'lucide-react';
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

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTable, setSelectedTable] = useState(null); // { tableId, existingOrder }
  const [openTableId, setOpenTableId] = useState(null);     // full-screen TableView for tables
  const [openOrderId, setOpenOrderId] = useState(null);     // full-screen TableView for specific orders (parcels)
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchInitialData();
      fetchSubscription();
    }
  }, [token]);

  const fetchInitialData = async () => {
    try {
      const [menuRes, ordersRes, userRes] = await Promise.all([
        axios.get('/api/menu'),
        axios.get('/api/orders/active'),
        axios.get('/api/auth/me'),
      ]);
      setMenuItems(menuRes.data);
      setActiveOrders(ordersRes.data);
      setUser(userRes.data);
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
      <div className="flex items-center justify-center h-screen bg-white font-outfit">
        <div className="text-center">
          <CustomLogo size={48} className="mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400 font-bold animate-pulse">Loading ArcheArc Restro...</p>
        </div>
      </div>
    );
  }

  // ── FULL-SCREEN VIEW (replaces entire UI) ──────────────────────────────────
  if (openTableId || openOrderId) {
    return (
      <TableView
        tableId={openTableId}
        orderId={openOrderId}
        isHistoryView={activeTab === 'parcel'}
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
    { id: 'dashboard', icon: LayoutGrid, label: 'Tables' },
    { id: 'pos',       icon: ShoppingBag, label: 'POS' },
    { id: 'parcel',    icon: History,     label: 'History' },
    { id: 'sales',     icon: BarChart3,   label: 'Sales' },
    { id: 'settings',  icon: Settings,    label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-white text-arche-text font-outfit overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-20 lg:w-64 bg-white border-r border-gray-100 flex flex-col transition-all duration-500 z-20 shrink-0">
        {/* Logo */}
        <div className="p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-gray-50">
          <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm shrink-0">
            <CustomLogo size={28} />
          </div>
          <div className="hidden lg:block overflow-hidden">
            <h1 className="text-lg font-bold text-arche-text tracking-tight truncate">
              {user?.restaurantName || 'ArcheArc'}{' '}
              <span className="text-arche-blue-deep text-[10px] font-black uppercase align-middle ml-0.5">Restro</span>
            </h1>
          </div>
        </div>

        {/* Nav */}
        <nav className="mt-4 flex-1 px-3 space-y-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative text-sm ${
                activeTab === tab.id
                  ? 'bg-arche-text text-white shadow-lg shadow-arche-text/10'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-arche-text'
              }`}
            >
              <tab.icon size={20} className="shrink-0" />
              <span className={`hidden lg:block font-semibold ${activeTab === tab.id ? '' : 'opacity-80'}`}>
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <div className="hidden lg:block absolute right-3 w-1.5 h-1.5 bg-arche-blue-light rounded-full shadow-[0_0_6px_#38BDF8]" />
              )}
            </button>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-gray-50">
          {subscription?.plan === 'trial' && subscription?.isValid && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-2 mb-3 bg-amber-50 rounded-xl border border-amber-100">
              <Clock size={14} className="text-amber-500 shrink-0" />
              <span className="text-[10px] font-bold text-amber-600 truncate">
                Trial: {subscription.trialDaysRemaining}d left
              </span>
            </div>
          )}
          <div className="hidden lg:flex items-center gap-3 mb-4 px-2 py-3 bg-gray-50/50 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-arche-blue-light/10 flex items-center justify-center text-arche-blue-deep shrink-0">
              <User size={16} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-arche-text truncate">{user?.name || 'Staff'}</p>
              <p className="text-[10px] text-gray-400 font-medium capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center lg:justify-start gap-3 text-gray-400 hover:text-rose-500 transition-all w-full px-4 py-3 rounded-xl hover:bg-rose-50 group text-sm"
          >
            <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="hidden lg:block font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-gray-50/30 relative">
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto space-y-6">
          {!bannerDismissed && (
            <SubscriptionBanner subscription={subscription} onDismiss={() => setBannerDismissed(true)} />
          )}

          {/* Tables (dashboard) */}
          {activeTab === 'dashboard' && (
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
          {activeTab === 'parcel' && (
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
        </div>
      </main>
    </div>
  );
}

export default App;
