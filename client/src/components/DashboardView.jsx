import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  CheckCircle2, Clock, Utensils, ChevronDown, ChevronRight,
  Store, X, TrendingUp, ShoppingBag, BarChart3, Printer, Bluetooth, Users
} from 'lucide-react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const cn = (...c) => c.filter(Boolean).join(' ');

export const DashboardView = ({ activeOrders = [], tableCount = 10, onTabChange, user }) => {
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/analytics/sales?period=week');
        setSalesData(res.data);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Derived stats
  const todaySales = salesData?.dailyBreakdown?.find(d => {
    try {
      return d?.date && new Date(d.date).toDateString() === new Date().toDateString();
    } catch { return false; }
  })?.total || 0;

  const todayOrders = salesData?.dailyBreakdown?.find(d => {
    try {
      return d?.date && new Date(d.date).toDateString() === new Date().toDateString();
    } catch { return false; }
  })?.orders || 0;

  // Yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdaySales = salesData?.dailyBreakdown?.find(d => {
    try {
      return d?.date && new Date(d.date).toDateString() === yesterday.toDateString();
    } catch { return false; }
  })?.total || 0;
  const yesterdayOrders = salesData?.dailyBreakdown?.find(d => {
    try {
      return d?.date && new Date(d.date).toDateString() === yesterday.toDateString();
    } catch { return false; }
  })?.orders || 0;

  // Active orders count
  const activeCount = (activeOrders || []).filter(o =>
    o.status !== 'Paid' && o.status !== 'Cancelled'
  ).length;

  // Closed today
  const closedToday = (activeOrders || []).filter(o => o.status === 'Paid').length;

  // On hold
  const onHold = (activeOrders || []).filter(o =>
    o.status === 'Pending' || o.status === 'Preparing'
  ).length;

  const rawRestaurantName = (user?.restaurantName || '').trim() || 'My Restaurant';
  const displayRestaurantName = rawRestaurantName.length > 15
    ? rawRestaurantName.substring(0, 15) + '..'
    : rawRestaurantName;
  const userName = user?.name || 'User';
  const avatarLetter = (rawRestaurantName[0] || 'M').toUpperCase();

  const quickActions = [
    {
      icon: ShoppingBag,
      label: 'Ongoing Orders',
      color: '#4B6FFF',
      action: () => onTabChange && onTabChange('pos'),
    },
    {
      icon: CheckCircle2,
      label: 'Order History',
      color: '#4B6FFF',
      action: () => onTabChange && onTabChange('history'),
    },
    {
      icon: Utensils,
      label: 'Add Items',
      color: '#4B6FFF',
      action: () => onTabChange && onTabChange('settings', 'menu'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">

      {/* ── Top Header ── */}
      <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-40 lg:-mx-6 lg:px-10 lg:pb-2 lg:border-b-0 shrink-0">
        <div className="flex items-center justify-between mb-4 lg:mb-2">
          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-1.5"
            >
              <h1 className="text-[17px] font-semibold text-slate-900 lg:text-[22px]">
                Dashboard
              </h1>
            </button>
          </div>

          {/* Avatar */}
          <button
            onClick={() => onTabChange && onTabChange('settings')}
            className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0"
          >
            {user?.restaurantLogo ? (
              <img src={user.restaurantLogo} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-slate-600 font-semibold text-[15px]">{avatarLetter}</span>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-40" style={{ scrollbarWidth: 'none' }}>

      {/* ── Quick Actions ── */}
      <div className="px-5 mb-6">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-4">Quick Actions</p>
        <div className="flex items-start gap-6">
          {quickActions.map((qa, i) => (
            <button
              key={i}
              onClick={qa.action}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <div
                className="w-[56px] h-[56px] rounded-full flex items-center justify-center shadow-sm"
                style={{ background: '#4B6FFF' }}
              >
                <qa.icon size={24} color="#fff" strokeWidth={2} />
              </div>
              <span className="text-[11px] text-slate-600 text-center leading-tight font-semibold">
                {qa.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mx-5 mb-5" />

      {/* ── Business Overview ── */}
      <div className="px-5 mb-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Business Overview</p>

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Sales & Orders row (StatRow style) */}
          <div className="flex border-b border-slate-100">
            {/* Today's Sales */}
            <div className="flex-1 px-5 py-5 border-r border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Today's Sales</p>
              <p className="text-[22px] font-semibold leading-tight flex items-center min-h-[26px]" style={{ color: '#4B6FFF' }}>
                {loading ? <Skeleton width={90} height={22} /> : `₹${todaySales.toFixed(2)}`}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                ₹{yesterdaySales.toFixed(0)} (Yesterday)
              </p>
            </div>

            {/* Today's Orders */}
            <div className="flex-1 px-5 py-5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Today's Orders</p>
              <p className="text-[22px] font-semibold leading-tight flex items-center min-h-[26px]" style={{ color: '#4B6FFF' }}>
                {loading ? <Skeleton width={40} height={22} /> : todayOrders}
              </p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">
                {yesterdayOrders} (Yesterday)
              </p>
            </div>
          </div>

          <button
            onClick={() => onTabChange && onTabChange('sales')}
            className="w-full flex items-center justify-end gap-1.5 px-4 py-3.5 active:bg-slate-50 transition-colors"
          >
            <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: '#4B6FFF' }}>Full Sales Report</span>
            <ChevronRight size={15} style={{ color: '#4B6FFF' }} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* ── Active Orders Summary ── */}
      {activeCount >= 0 && (
        <div className="px-5 mb-4 mt-6">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Live Kitchen</p>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 border-b border-slate-100">
              <div className="p-5 border-r border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Active Now</p>
                </div>
                <p className="text-[22px] font-semibold text-slate-900">{activeCount}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">Live orders</p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">On Hold</p>
                </div>
                <p className="text-[22px] font-semibold text-amber-500">{onHold}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">Pending KOT</p>
              </div>
            </div>
            
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Closed Today</p>
                </div>
                <p className="text-[22px] font-semibold text-emerald-600">{closedToday}</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">Successfully served</p>
            </div>

            <button
              onClick={() => onTabChange && onTabChange('pos')}
              className="w-full flex items-center justify-end gap-1.5 px-4 py-3.5 active:bg-slate-50 transition-colors"
            >
              <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: '#4B6FFF' }}>Manage Kitchen</span>
              <ChevronRight size={15} style={{ color: '#4B6FFF' }} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {/* ── Feedback Banner ── */}
      {showFeedback && (
        <div className="px-5 mb-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-[14px] font-semibold text-slate-900 leading-snug flex-1 pr-3">
                We want to improve Table, with your help!
              </p>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-slate-400 active:text-slate-600 mt-0.5 shrink-0"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <p className="text-[13px] text-slate-500 mb-3">Tell us what's working and what's not</p>
            <button className="px-4 py-2 rounded-lg border border-blue-500 text-blue-600 text-[13px] font-semibold bg-white active:bg-blue-50 transition-colors">
              Share Feedback
            </button>
          </div>
        </div>
      )}

      {/* ── Connectivity & Printer ── */}
      <div className="px-5 mb-4">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3"> Printer Connectivity</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
              <Printer size={20} className="text-blue-600" />
            </div>
            <span className="text-[12px] font-semibold text-slate-700">Connect USB</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-100 active:scale-95 transition-all">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mb-2">
              <Bluetooth size={20} className="text-indigo-600" />
            </div>
            <span className="text-[12px] font-semibold text-slate-700">Bluetooth</span>
          </button>
        </div>
      </div>

      {/* ── Recent Reviews Placeholder ── */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Recent Reviews</p>
          <button className="text-[11px] font-semibold text-blue-500 uppercase tracking-widest">View All</button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Users size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-amber-400 text-[10px]">★</span>
                ))}
                <span className="text-[10px] text-slate-400 font-semibold ml-1">5.0</span>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed italic">
                "Excellent food and quick service. The digital billing was very smooth!"
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-2 uppercase tracking-wider">
                Rahul S. • 2 hours ago
              </p>
            </div>
          </div>
        </div>
      </div>

      </div>
    </div>
  );
};

export default DashboardView;