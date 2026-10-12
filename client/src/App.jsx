import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import axios from 'axios';
import { LayoutGrid, ShoppingBag, History, Settings, LogOut, User, BarChart3, Clock, ChevronDown, MoreVertical, HelpCircle, Utensils, BookOpen, LineChart, Grid, Key, X, Loader2, Package, Plus, Cookie, LayoutDashboard, Menu, Mic, Table2, Armchair, ChefHat, Coffee, ChartNoAxesColumnIncreasing, CheckCircle2, Wifi, WifiOff, Zap } from 'lucide-react';
import { useNavigate, useLocation, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';

// Lazy loaded page components
const TableGrid = lazy(() => import('./components/TableGrid'));
const TableView = lazy(() => import('./components/TableView'));
const POSInterface = lazy(() => import('./components/POSInterface'));
const OrderHistory = lazy(() => import('./components/OrderHistory'));
const ChoosePlan = lazy(() => import('./components/ChoosePlan'));
const SettingsPanel = lazy(() => import('./components/SettingsPanel'));
const SalesReport = lazy(() => import('./components/SalesReport'));
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const WaiterDashboard = lazy(() => import('./components/WaiterDashboard'));
const KitchenDashboard = lazy(() => import('./components/KitchenDashboard'));
const ParcelView = lazy(() => import('./components/ParcelView'));
const QuickOrder = lazy(() => import('./components/QuickOrder'));
const LoyaltyCustomerScan = lazy(() => import('./components/LoyaltyCustomerScan'));
const PublicRestaurantPage = lazy(() => import('./components/PublicRestaurantPage'));

// Eagerly loaded shared/auth layouts
import Login from './components/Login';
import SubscriptionBanner from './components/SubscriptionBanner';
import NotificationBell from './components/NotificationBell';
import { DashboardSkeleton } from './components/Skeleton';
import { NavigationProvider } from './navigation/NavigationManager';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const BrandLogo = ({ className = '' }) => (
  <img
    src="/brand-logo.png"
    alt="Annapurna"
    className={className}
  />
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tableNavAction, setTableNavAction] = useState('menu');
  const [settingsSubSection, setSettingsSubSection] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordState, setPasswordState] = useState({ current: '', new: '', confirm: '', error: '', loading: false, success: false });
  const [toast, setToast] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Sync state with URL
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path.startsWith('/dashboard')) {
      setActiveTab('dashboard');
    } else if (path.startsWith('/tables')) {
      setActiveTab('tables');
    } else if (path.startsWith('/menu')) {
      setActiveTab('tables');
    } else if (path.startsWith('/cart')) {
      setActiveTab('tables');
    } else if (path.startsWith('/parcel')) {
      setActiveTab('parcel');
    } else if (path.startsWith('/pos')) {
      setActiveTab('pos');
    } else if (path.startsWith('/quick')) {
      setActiveTab('quick');
    } else if (path.startsWith('/sales')) {
      setActiveTab('sales');
    } else if (path.startsWith('/settings')) {
      setActiveTab('settings');
    } else if (path.startsWith('/history')) {
      setActiveTab('history');
    }
  }, [location]);

  // Derive modal states from URL search params
  const openTableId = searchParams.get('tableId');
  const openOrderId = searchParams.get('orderId');
  const isCreatingParcel = searchParams.get('newParcel') === 'true';
  const tableScreen = searchParams.get('screen') || 'menu';

  const showToast = (message, sub) => {
    setToast({ message, sub });
    setTimeout(() => setToast(null), 3000);
  };

  // Offline sync listeners removed

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

  const handleTableClick = (tableId) => {
    setTableNavAction('menu');
    setSearchParams({ tableId, screen: 'menu' });
  };

  const handlePOSTableClick = (tableId, existingOrder) => {
    navigate(`?tableId=${encodeURIComponent(tableId)}&screen=menu`);
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

  const isPublicRestroRoute = location.pathname.startsWith('/restro/');
  const isLoyaltyScanRoute = location.pathname.startsWith('/loyalty/scan');
  const isPublicRoute = isPublicRestroRoute || isLoyaltyScanRoute;

  // History Stabilizer: Ensure /dashboard is ALWAYS the base entry behind any sub-page
  useEffect(() => {
    if (isPublicRoute) return;
    if (location.pathname === '/' || location.pathname === '') {
      navigate('/dashboard', { replace: true });
    } else if (window.history.length <= 2 && location.pathname !== '/dashboard') {
      // Ensure Dashboard is always the base root entry in history behind any sub-page
      navigate('/dashboard', { replace: true });
      if (location.pathname === '/settings' && location.search && location.search.includes('section=')) {
        navigate('/settings');
      }
      navigate(location.pathname + location.search);
    }
  }, [isPublicRoute]);

  const handleTabChange = useCallback((tabId, subSection = 'home') => {
    setSettingsSubSection(subSection);
    window.dispatchEvent(new Event('close-notifications'));
    if (location.pathname === `/${tabId}` && subSection === 'home') return;
    const isCurrentlyDashboard = location.pathname === '/dashboard' || location.pathname === '/';
    // If navigating from /dashboard, push the new tab onto history (so back goes to /dashboard).
    // If switching between sub-tabs (e.g. from /tables to /pos), replace current tab so /dashboard remains the immediate parent!
    navigate(`/${tabId}`, { replace: !isCurrentlyDashboard });
  }, [navigate, location.pathname]);

  if (isPublicRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <Routes>
          <Route path="/restro/:restro_name" element={<PublicRestaurantPage />} />
          <Route path="/loyalty/scan" element={<LoyaltyCustomerScan />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    );
  }

  if (!token) return <Login onLoginSuccess={handleLoginSuccess} />;

  const userRole = user?.role;
  if (userRole === 'Waiter') {
    return (
      <NavigationProvider user={user}>
        <WaiterDashboard user={user} onLogout={handleLogout} />
      </NavigationProvider>
    );
  }
  if (userRole === 'Kitchen') {
    return (
      <NavigationProvider user={user}>
        <KitchenDashboard user={user} onLogout={handleLogout} />
      </NavigationProvider>
    );
  }

  if (!subLoading && (!subscription || !subscription.hasSubscription)) {
    return <ChoosePlan onPlanActivated={handlePlanActivated} />;
  }

  if (subLoading || !user) {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-white">
        <span className="inline-block w-8 h-8 border-4 border-blue-500 lg:border-[#FF5A36] border-t-transparent rounded-full animate-spin" />
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

  const tableCount = user?.tableCount || 10;

  const navTabs = [
    { id: 'dashboard', icon: Cookie, label: 'Home' },
    { id: 'tables', icon: Grid, label: 'Tables' },
    { id: 'parcel', icon: Package, label: 'Parcel' },
    { id: 'pos', icon: ShoppingBag, label: 'Orders' },
    { id: 'quick', icon: Zap, label: 'Quick' },
    { id: 'sales', icon: BarChart3, label: 'Reports' },
    { id: 'settings', icon: Menu, label: 'More' },
  ];

  return (
    <NavigationProvider user={user}>
      <div className="flex flex-col lg:flex-row h-[100dvh] bg-white overflow-hidden">
      {/* ── Desktop Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`hidden lg:flex rounded-none flex-col py-5 px-2 shrink-0 transition-all duration-300 shadow-[5px_0_15px_-3px_rgba(0,0,0,0.05)] z-[110] relative ${sidebarExpanded ? 'w-[182px]' : 'w-20'}`}>

        {/* ── Background layers (absolute, behind all content) ── */}
        {/* Peach rail: always covers the full left 80px */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-[#FFD5C5] z-0 pointer-events-none" />
        {/* White panel: slides in to the right when expanded */}
        {sidebarExpanded && (
          <div className="absolute left-20 right-0 top-0 bottom-0 bg-white z-0 pointer-events-none" />
        )}

        {/* Header — hamburger sits in the peach zone */}
        <div className="relative z-10 flex items-center mb-6 mt-1 shrink-0">
          <div className="w-16 flex items-center justify-center">
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 rounded-xl transition-all duration-200 text-slate-600 hover:bg-[#FFA588]/40 hover:text-orange-950"
              title={sidebarExpanded ? 'Collapse' : 'Expand'}
            >
              {sidebarExpanded ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 relative z-10">
          <nav className="space-y-3.5">
            {navTabs.map((tab) => (
              <div key={tab.id} className="relative group">

                <button
                  onClick={() => handleTabChange(tab.id)}
                  className="w-full flex items-center transition-all duration-200"
                >
                  {/* Icon column — ALWAYS w-16 (= peach rail width minus px-2 sides).
                      Icon center stays at 40px from aside-left in both collapsed & expanded. */}
                  <div className={`w-16 flex items-center justify-center py-2.5 rounded-xl transition-all duration-200 shrink-0 ${activeTab === tab.id
                    ? 'bg-[#FF5A36] text-white shadow-lg shadow-orange-100'
                    : 'text-slate-700 group-hover:bg-[#FFA588]/40 group-hover:text-orange-950'
                    }`}>
                    <tab.icon size={21} />
                  </div>

                  {/* Label — styling matched to hover tooltip including bg, shadow, and rounded corner */}
                  {sidebarExpanded && (
                    <div className={`w-[110px] shrink-0 rounded-r-xl px-3 py-2.5 ml-3 flex items-center transition-all duration-200 ${activeTab === tab.id
                      ? 'bg-[#FF5A36]/90 shadow-lg shadow-orange-100'
                      : 'bg-[#FFD5C5] group-hover:bg-[#FFA588]/40 shadow-[4px_0_12px_rgba(255,90,54,0.08)]'
                      }`}>
                      <span className={`text-[13px] font-bold uppercase tracking-[0.02em] text-left truncate w-full transition-colors duration-200 ${activeTab === tab.id
                        ? 'text-white'
                        : 'text-orange-950'
                        }`}>
                        {tab.label}
                      </span>
                    </div>
                  )}
                </button>

                {/* Hover tooltip — collapsed only */}
                {!sidebarExpanded && (
                  <div className="absolute top-0 bottom-0 left-[calc(100%+8px)] w-36 bg-[#FFD5C5] text-orange-950 text-[13px] font-bold uppercase tracking-[0.02em] rounded-r-xl px-4 flex items-center opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 whitespace-nowrap z-[150] shadow-[4px_0_12px_rgba(255,90,54,0.08)]">
                    <span>{tab.label}</span>
                  </div>
                )}

              </div>
            ))}
          </nav>
        </div>

        {/* Bottom tray — fixed width, always same, never changes */}
        <div className="mt-4 pt-4 -mb-5 flex flex-col gap-1 shrink-0 relative z-[120] bg-[#FFD5C5] rounded-tr-2xl pb-2 w-56 -ml-2 pl-2 pr-4 shadow-[8px_0_15px_rgba(255,90,54,0.06)]">

          {/* Concave corner — always visible */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-20px',
              left: '64px',
              width: '20px',
              height: '20px',
              background: 'radial-gradient(circle at 100% 0%, transparent 20px, #FFD5C5 20.5px)'
            }}
          />

          {subscription?.plan === 'trial' && subscription?.isValid && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-[#FFA588]/30 rounded-xl border border-[#FFA588]/40 mb-1">
              <Clock size={13} className="text-orange-700 shrink-0" />
              <span className="text-[10px] font-bold text-orange-800 truncate">Trial: {subscription.trialDaysRemaining}d left</span>
            </div>
          )}

          {/* Profile — name always shown */}
          <div className="flex items-center gap-2.5 p-2 cursor-pointer rounded-xl hover:bg-white/40 transition-all duration-200">
            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#FF5A36] shrink-0 overflow-hidden shadow-sm">
              <img src={`https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=FF5A36&color=FFFFFF`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-[13px] font-bold text-gray-900 truncate tracking-tight">{user?.name || 'User'}</p>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest">{user?.role || 'Admin'}</p>
            </div>
          </div>

          {/* Notifications — label always shown */}
          <div className="flex items-center gap-2.5 p-2 cursor-pointer rounded-xl hover:bg-white/40 transition-all duration-200 relative group">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 relative z-20 pointer-events-auto">
              <NotificationBell desktopOffset={true} />
            </div>
            <div className="overflow-hidden flex-1 pointer-events-none">
              <p className="text-[13px] font-bold text-gray-900 truncate tracking-tight">Notifications</p>
            </div>
          </div>

        </div>

      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}


      <main className={`flex-1 overflow-y-auto no-scrollbar relative lg:rounded-none px-2 ${location.pathname.startsWith('/settings') ? 'pb-0 lg:pb-0 lg:p-6' : location.pathname === '/quick' ? 'pb-24 lg:pb-0 lg:p-0' : 'pb-24 lg:pb-0 lg:p-6'}`}>
        <div className="w-full h-full max-w-[1600px] mx-auto">

          {/* Offline indicator banner removed */}

          {!bannerDismissed && (
            <SubscriptionBanner subscription={subscription} onDismiss={() => setBannerDismissed(true)} />
          )}

          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-white lg:rounded-3xl h-[60vh]">
              <span className="inline-block w-8 h-8 border-4 border-blue-500 lg:border-[#FF5A36] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <Routes>
              <Route path="/dashboard" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <DashboardView
                    activeOrders={activeOrders}
                    tableCount={tableCount}
                    onTabChange={handleTabChange}
                    user={user}
                  />
                </div>
              } />

              <Route path="/tables" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <TableGrid
                    activeOrders={activeOrders}
                    onTableClick={handleTableClick}
                    tableCount={tableCount}
                  />
                </div>
              } />

              <Route path="/pos" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <POSInterface
                    activeOrders={activeOrders}
                    user={user}
                    onOrderUpdate={fetchActiveOrders}
                    onCheckoutComplete={() => {
                      fetchActiveOrders();
                      navigate('/tables', { replace: true });
                    }}
                    onBillClick={(order) => {
                      const params = { screen: 'cart', orderId: order._id };
                      if (order.tableId) params.tableId = order.tableId;
                      setSearchParams(params);
                    }}
                    onManageClick={(order) => {
                      const params = { screen: 'menu', orderId: order._id };
                      if (order.tableId) params.tableId = order.tableId;
                      setSearchParams(params);
                    }}
                  />
                </div>
              } />

              <Route path="/quick" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <QuickOrder
                    menuItems={menuItems}
                    user={user}
                    onOrderUpdate={fetchActiveOrders}
                  />
                </div>
              } />

              <Route path="/parcel" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <ParcelView
                    activeOrders={activeOrders}
                    onNewParcel={() => setSearchParams({ newParcel: 'true', screen: 'menu' })}
                    onOrderClick={(orderId) => setSearchParams({ orderId, screen: 'menu' })}
                  />
                </div>
              } />

              <Route path="/history" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <OrderHistory
                    activeOrders={activeOrders}
                    onOrderUpdate={fetchActiveOrders}
                    onOrderClick={(orderId) => setSearchParams({ orderId, screen: 'menu' })}
                  />
                </div>
              } />

              <Route path="/sales" element={
                <div className="animate-in fade-in duration-500">
                  <SalesReport />
                </div>
              } />

              <Route path="/settings" element={
                <div className="animate-in fade-in duration-500 h-full">
                  <SettingsPanel
                    user={user}
                    subscription={subscription}
                    initialSection={settingsSubSection}
                    onSettingsUpdate={handleSettingsUpdate}
                    onLogout={handleLogout}
                    onClose={() => navigate('/dashboard')}
                  />
                </div>
              } />

              <Route path="/loyalty/scan" element={
                <div className="animate-in fade-in duration-500">
                  <LoyaltyCustomerScan />
                </div>
              } />

              <Route path="/restro/:restro_name" element={
                <div className="animate-in fade-in duration-500">
                  <PublicRestaurantPage />
                </div>
              } />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>

          {/* Table / Order View overlay */}
          {(openTableId || openOrderId || isCreatingParcel) && (
            <div className="fixed inset-0 z-[150]">
              <TableView
                tableId={openTableId}
                orderId={openOrderId}
                isHistoryView={!!openOrderId && !activeOrders.some(o => o._id === openOrderId)}
                menuItems={menuItems}
                activeOrders={activeOrders}
                user={user}
                onClose={() => {
                  fetchActiveOrders();
                  setSearchParams({}, { replace: true });
                }}
                onCheckoutComplete={() => {
                  fetchActiveOrders();
                  navigate('/tables', { replace: true });
                }}
                initialScreen={tableScreen}
                showToast={showToast}
                onScreenChange={(screen) => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set('screen', screen);
                  setSearchParams(newParams);
                }}
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
      {!location.pathname.startsWith('/settings') && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] overflow-hidden" style={{ background: '#ffffff' }}>
          <nav className="flex items-center h-[74px] w-full ">

            {/* Left: Home, Items */}
            <div className="flex flex-1 justify-around items-center">
              <button
                onClick={() => handleTabChange('dashboard')}
                className="flex flex-col items-center gap-[3px] active:scale-95 transition-transform"
              >
                <Cookie
                  size={20}
                  strokeWidth={activeTab === 'dashboard' ? 2 : 1.6}
                  color={activeTab === 'dashboard' ? '#3B82F6' : 'rgba(0,0,0,0.4)'}
                />
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: activeTab === 'dashboard' ? '#3B82F6' : 'rgba(0,0,0,0.4)' }}
                >
                  Home
                </span>
              </button>

              <button
                onClick={() => handleTabChange('tables')}
                className="flex flex-col items-center gap-[3px] active:scale-95 transition-transform"
              >
                <Armchair
                  size={20}
                  strokeWidth={activeTab === 'tables' ? 2 : 1.6}
                  color={activeTab === 'tables' ? '#3B82F6' : 'rgba(0,0,0,0.4)'}
                />
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: activeTab === 'tables' ? '#3B82F6' : 'rgba(0,0,0,0.4)' }}
                >
                  Tables
                </span>
              </button>
            </div>

            {/* Center FAB: Parcel */}
            <div className="flex-shrink-0 mx-2">
              <button
                onClick={() => handleTabChange('parcel')}
                className="w-[52px] h-[52px] bg-blue-600 rounded-full flex items-center justify-center active:scale-90 transition-all duration-200 shadow-[0_4px_16px_rgba(37,99,235,0.4)]"
                style={{ marginBottom: '8px' }}
              >
                <Plus size={28} strokeWidth={2.8} color="#fff" />
              </button>
            </div>

            {/* Right: Orders, Reports */}
            <div className="flex flex-1 justify-around items-center">
              <button
                onClick={() => handleTabChange('pos')}
                className="flex flex-col items-center gap-[3px] active:scale-95 transition-transform"
              >
                <ShoppingBag
                  size={20}
                  strokeWidth={activeTab === 'pos' ? 2 : 1.6}
                  color={activeTab === 'pos' ? '#3B82F6' : 'rgba(0,0,0,0.4)'}
                />
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: activeTab === 'pos' ? '#3B82F6' : 'rgba(0,0,0,0.4)' }}
                >
                  Orders
                </span>
              </button>

              <button
                onClick={() => handleTabChange('sales')}
                className="flex flex-col items-center gap-[3px] active:scale-95 transition-transform"
              >
                <ChartNoAxesColumnIncreasing
                  size={20}
                  strokeWidth={activeTab === 'sales' ? 2 : 1.6}
                  color={activeTab === 'sales' ? '#3B82F6' : 'rgba(0,0,0,0.4)'}
                />
                <span
                  className="text-[11px] font-bold leading-none"
                  style={{ color: activeTab === 'sales' ? '#3B82F6' : 'rgba(0,0,0,0.4)' }}
                >
                  Reports
                </span>
              </button>
            </div>

            {/* More — restored purple gradient */}
            <button
              onClick={() => handleTabChange('settings')}
              className="flex-shrink-0 h-[64px] w-[62px] flex items-center justify-center active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #4F46E5 100%)',
                borderRadius: '14px 0 0 14px',
                marginLeft: '8px',
                marginBottom: '8px'
              }}
            >
              <Menu size={22} strokeWidth={2} color="#fff" />
            </button>

          </nav>
        </div>
      )}

      {/* ── GLOBAL TOAST NOTIFICATION ── */}
      {toast && (
        <div className="fixed bottom-32 right-4 z-[200] animate-in slide-in-from-right-5 fade-in duration-300 pointer-events-none">
          <div className="bg-white border border-slate-200 shadow-xl px-5 py-3 rounded-xl">
            <p className="text-[13px] font-black text-slate-900 tracking-tight uppercase">
              {toast.message} {toast.sub ? `#${toast.sub}` : ''}
            </p>
          </div>
        </div>
      )}


    </div>
    </NavigationProvider>
  );
}

export default App;