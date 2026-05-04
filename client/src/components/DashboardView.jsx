import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  ChevronRight, ChevronDown, Clock, MoveUpRight, ArrowUpRight,
  TrendingUp, ShoppingBag, CheckCircle2, DollarSign, Package, Users
} from 'lucide-react';

const StatValue = ({ value, isLoading = false, prefix = '' }) => {
  const normalized = Number(value || 0);

  if (isLoading) {
    return <span className="inline-block align-middle">--</span>;
  }

  return <span>{prefix}{normalized.toLocaleString('en-IN')}</span>;
};

export const DashboardView = ({ activeOrders, tableCount, onTabChange }) => {
  const [salesData, setSalesData] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState('week');
  const [selectedBar, setSelectedBar] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersPeriod, setOrdersPeriod] = useState('week');
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);
  const [ordersDropdownView, setOrdersDropdownView] = useState('main'); // 'main' | 'custom'
  const [ordersCustomFrom, setOrdersCustomFrom] = useState('');
  const [ordersCustomTo, setOrdersCustomTo] = useState('');
  const ordersDropdownRef = useRef(null);

  useEffect(() => {
    Promise.all([
      axios.get(`/api/analytics/sales?period=${revenuePeriod}`),
      axios.get('/api/tables'),
      axios.get('/api/orders?page=1&limit=5'),
    ])
      .then(([salesRes, tablesRes, ordersRes]) => {
        setSalesData(salesRes.data);
        setTables(tablesRes.data);
        // support both array response and paginated { orders: [] } response
        const orders = Array.isArray(ordersRes.data)
          ? ordersRes.data
          : (ordersRes.data.orders || []);
        setRecentOrders(orders.slice(0, 5));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [revenuePeriod]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (ordersDropdownRef.current && !ordersDropdownRef.current.contains(event.target)) {
        setOrdersDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (ordersPeriod === 'custom' && (!ordersCustomFrom || !ordersCustomTo)) return;
    const fetchOrdersTotal = async () => {
      setOrdersLoading(true);
      try {
        let url = `/api/analytics/sales?period=${ordersPeriod}`;
        if (ordersPeriod === 'custom') url += `&from=${ordersCustomFrom}&to=${ordersCustomTo}`;
        const res = await axios.get(url);
        setOrdersTotal(res.data?.totalOrders || 0);
      } catch (err) {
        console.error('Failed to fetch total orders:', err);
        setOrdersTotal(0);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrdersTotal();
  }, [ordersPeriod, ordersCustomFrom, ordersCustomTo]);

  // Calculations
  const occupiedTableCount = new Set(
    (activeOrders || [])
      .filter(o =>
        o.orderType === 'Dine-in' &&
        o.tableId &&
        o.status !== 'Paid' &&
        o.status !== 'Cancelled'
      )
      .map(o => o.tableId)
  ).size;
  const paidToday = salesData?.dailyBreakdown?.find(d =>
    new Date(d.date).toDateString() === new Date().toDateString()
  )?.orders || 0;

  const currentDay = new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  }).format(new Date());

  const getChartData = () => {
    if (!salesData || !salesData.dailyBreakdown) return [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const toDateKey = (dateValue) => {
      const dt = new Date(dateValue);
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const dataMap = {};
    salesData.dailyBreakdown.forEach(d => {
      dataMap[toDateKey(d.date)] = d.total || 0;
    });

    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const currentWeekStart = new Date(todayOnly);
    currentWeekStart.setDate(todayOnly.getDate() - todayOnly.getDay()); // Sunday start

    const baseStart = new Date(currentWeekStart);
    if (revenuePeriod === 'previous_week') {
      baseStart.setDate(baseStart.getDate() - 7);
    }

    return weekDays.map((day, idx) => {
      const slotDate = new Date(baseStart);
      slotDate.setDate(baseStart.getDate() + idx);
      const slotKey = toDateKey(slotDate);

      // For "This Week", keep upcoming days blank (zero) after today.
      const isFutureInCurrentWeek = revenuePeriod === 'week' && slotDate > todayOnly;

      return {
        day,
        value: isFutureInCurrentWeek ? 0 : (dataMap[slotKey] || 0)
      };
    });
  };

  const chartData = getChartData();
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  const getNiceScale = (rawMax) => {
    const targetSteps = 5;
    const roughStep = rawMax / targetSteps;
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
    const residual = roughStep / magnitude;

    let niceStep = magnitude;
    if (residual > 5) niceStep = 10 * magnitude;
    else if (residual > 2) niceStep = 5 * magnitude;
    else if (residual > 1) niceStep = 2 * magnitude;

    const niceMax = Math.max(niceStep * targetSteps, Math.ceil(rawMax / niceStep) * niceStep);
    return { niceMax, niceStep };
  };

  const formatYAxisValue = (value) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    return `₹${Math.round(value)}`;
  };

  const { niceMax: yAxisMax, niceStep: yAxisStep } = getNiceScale(maxChartValue);
  const yAxisTicks = Array.from({ length: 6 }, (_, i) => yAxisMax - (i * yAxisStep));

  const cn = (...classes) => classes.filter(Boolean).join(' ');
  const formatOrderNumber = (num) => String(num || '').padStart(4, '0');

  // Category Distribution (Mocked from topItems logic)
  const categories = ['Main Course', 'Beverages', 'Starters', 'Desserts'];
  const categoryData = [45, 25, 20, 10]; // Percentage distribution

  return (
    <div className="flex-1 px-2 lg:px-3 py-2 w-full max-w-[1800px] mx-auto overflow-hidden animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="mb-4 lg:mb-5 flex justify-between items-start">
        <div>
          <h1 className="text-xl lg:text-[1.8rem] font-black text-slate-900 tracking-tight uppercase">Overview</h1>
          <p className="text-[9px] lg:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-1">{currentDay}</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="px-3 py-1.5 lg:px-4 lg:py-2 bg-white border border-slate-100 rounded-xl lg:rounded-2xl flex items-center gap-2 lg:gap-3">
            <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest text-slate-600">System Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-3 pb-8">

        {/* ROW 1: 3 High-Density Metric Cards */}
        <div className="col-span-1 lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-3">

          {/* Active Orders */}
          <div className="bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 flex flex-col justify-between min-h-[128px] lg:h-[140px] h-auto relative overflow-hidden group animate-stagger-1">
            <div className="flex justify-between items-start w-full">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100/50">
                  <ShoppingBag size={20} className="text-orange-500 lg:w-6 lg:h-6" strokeWidth={3} />
                </div>
                <div>
                  <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-slate-400 block">Current Status</span>
                  <span className="text-sm font-black text-slate-900 uppercase ">Active Orders</span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2.5 py-1 lg:px-3 lg:py-1.5 bg-orange-50 rounded-lg lg:rounded-xl">
                <TrendingUp size={10} className="text-orange-500 lg:w-3 lg:h-3" strokeWidth={3} />
                <span className="text-[9px] lg:text-[10px] font-black text-orange-600">4.2% Growth</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                <StatValue value={occupiedTableCount} isLoading={loading} />
              </span>
              <span className="text-[10px] lg:text-xs font-black text-orange-400 uppercase tracking-widest  mb-1">Queue Live</span>
            </div>
          </div>

          {/* Completed Today */}
          <div className="bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 flex flex-col justify-between min-h-[128px] lg:h-[140px] h-auto relative overflow-hidden group animate-stagger-2">
            <div className="flex justify-between items-start w-full">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                  <CheckCircle2 size={20} className="text-emerald-500 lg:w-6 lg:h-6" strokeWidth={3} />
                </div>
                <div>
                  <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-slate-400 block">Performance</span>
                  <span className="text-sm font-black text-slate-900 uppercase ">Completed Today</span>
                </div>
              </div>
              <div className="px-2.5 py-1 lg:px-3 lg:py-1.5 bg-emerald-50 rounded-lg lg:rounded-xl">
                <span className="text-[9px] lg:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Target Met</span>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                <StatValue value={paidToday} isLoading={loading} />
              </span>
              <span className="text-[10px] lg:text-xs font-black text-emerald-400 uppercase tracking-widest  mb-1">Settled Units</span>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 flex flex-col justify-between min-h-[128px] lg:h-[140px] h-auto relative z-10 group animate-stagger-3">
            <div className="flex justify-between items-start w-full">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50">
                  <Package size={20} className="text-indigo-500 lg:w-6 lg:h-6" strokeWidth={3} />
                </div>
                <div>
                  <span className="text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-slate-400 block">Overall Volume</span>
                  <span className="text-sm font-black text-slate-900 uppercase ">Total Orders</span>
                </div>
              </div>
              <div className="relative" ref={ordersDropdownRef}>
                <button
                  onClick={() => { setOrdersDropdownOpen((prev) => !prev); setOrdersDropdownView('main'); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 lg:px-3 lg:py-1.5 bg-indigo-50 border border-indigo-100/50 rounded-lg lg:rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <span className="text-[9px] lg:text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                    {ordersPeriod === 'week' ? 'This Week' : ordersPeriod === 'month' ? 'This Month' : 'Custom'}
                  </span>
                  <ChevronDown size={12} className={`text-indigo-600 transition-transform ${ordersDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {ordersDropdownOpen && (
                  <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-40 overflow-hidden">
                    {ordersDropdownView === 'custom' ? (
                      <div className="p-4 flex flex-col gap-3">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Custom Range</h3>

                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">From</label>
                          <input
                            type="date"
                            value={ordersCustomFrom}
                            onChange={(e) => setOrdersCustomFrom(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">To</label>
                          <input
                            type="date"
                            value={ordersCustomTo}
                            onChange={(e) => setOrdersCustomTo(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>

                        <button
                          onClick={() => { setOrdersPeriod('custom'); setOrdersDropdownOpen(false); }}
                          className="w-full bg-slate-700 hover:bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors mt-2"
                        >
                          Apply
                        </button>

                        <button
                          onClick={() => setOrdersDropdownView('main')}
                          className="w-full text-center text-slate-400 hover:text-slate-600 text-[9px] font-black uppercase tracking-widest py-1 transition-colors flex items-center justify-center gap-1"
                        >
                          &larr; Back
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setOrdersPeriod('week'); setOrdersDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${ordersPeriod === 'week' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          This Week
                        </button>
                        <button
                          onClick={() => { setOrdersPeriod('month'); setOrdersDropdownOpen(false); }}
                          className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${ordersPeriod === 'month' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          This Month
                        </button>
                        <button
                          onClick={() => setOrdersDropdownView('custom')}
                          className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors ${ordersPeriod === 'custom' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          Custom Date
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                <StatValue value={ordersTotal} isLoading={ordersLoading} />
              </span>
              <span className="text-[10px] lg:text-xs font-black text-indigo-400 uppercase tracking-widest  mb-1">Total Processed</span>
            </div>
          </div>

        </div>

        {/* ROW 2: Dual Charts */}
        <div className="col-span-1 lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-3 mt-1">

          {/* Revenue Chart - Redesigned */}
          <div className="col-span-1 lg:col-span-8 bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 relative min-h-[285px] lg:min-h-[360px] font-['DM_Sans',sans-serif] animate-stagger-3">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <div>
                <h2 className="text-[2rem] lg:text-[1.9rem] font-black text-[#111827] tracking-tight leading-none">Revenue</h2>
                <p className="text-[11px] lg:text-[12px] font-medium text-slate-400 mt-1">Sales Overview</p>
              </div>
              <select
                value={revenuePeriod}
                onChange={(e) => setRevenuePeriod(e.target.value)}
                className="bg-slate-50 border border-slate-100 text-[10px] lg:text-xs font-bold text-slate-600 px-2 py-1.5 lg:px-3 lg:py-2 rounded-xl focus:ring-0 cursor-pointer outline-none"
              >
                <option value="week">This Week</option>
                <option value="previous_week">Previous Week</option>
              </select>
            </div>

            <div className="relative h-[210px] lg:h-[255px] w-full flex items-end justify-between pl-9 pr-2 lg:pl-12 lg:pr-4 pb-7 overflow-visible mt-4">
              {/* Y-Axis Grid Lines */}
              <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-14 z-0">
                {yAxisTicks.map(val => (
                  <div key={val} className="flex text-[9px] lg:text-[11px] text-slate-400 font-medium items-center w-full">
                    <span className="w-8 lg:w-10 text-right mr-3 lg:mr-6 shrink-0">
                      {formatYAxisValue(val)}
                    </span>
                    <div className="flex-1 border-t border-slate-100 opacity-60"></div>
                  </div>
                ))}
              </div>

              {/* Chart Bars */}
              {chartData.map((d, i) => {
                const totalValue = d.value || 0;
                const maxH = yAxisMax;
                // Minimum 8% so bars are always visible; zero-value gets a subtle stub
                const hasValue = totalValue > 0;
                const heightPerc = hasValue ? Math.max((totalValue / maxH) * 100, 10) : 5;
                // Each segment needs ~14px; compute how many fit without gap overflow
                const barHeightPx = (heightPerc / 100) * 252; // ~252px usable height
                const maxSegs = Math.max(Math.floor((barHeightPx + 3) / (14 + 3)), 1);
                const segmentCount = hasValue ? Math.min(10, maxSegs) : 1;
                const isSelected = selectedBar === i;

                return (
                  <div
                    key={d.day}
                    className="relative flex flex-col items-center z-10 mt-auto h-full justify-end cursor-pointer group"
                    style={{ width: 'calc(100% / 7 - 8px)' }}
                    onClick={() => setSelectedBar(isSelected ? null : i)}
                  >
                    {/* Tooltip — only shown on click */}
                    {isSelected && (
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
                        style={{ animation: 'tooltipIn 0.2s ease-out' }}
                      >
                        <div className="bg-[#111827] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 whitespace-nowrap relative">
                          <span className="w-2 h-2 rounded-full bg-[#FF6B3D] shrink-0"></span>
                          <span className="text-[13px] font-bold tracking-tight">₹{totalValue.toFixed(2)}</span>
                          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111827] rotate-45"></div>
                        </div>
                      </div>
                    )}

                    {/* Entrance Animation Wrapper */}
                    <div
                      className="w-full flex justify-center origin-bottom"
                      style={{
                        height: `${heightPerc}%`,
                        animation: `growBarScale 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both`
                      }}
                    >
                      {/* The Segmented Bar */}
                      <div
                        className={`relative flex flex-col-reverse w-full h-full rounded-xl overflow-hidden transition-transform duration-300 origin-bottom ${isSelected ? 'scale-y-[1.04] -translate-y-1' : 'scale-y-100 group-hover:scale-y-[1.02] group-hover:-translate-y-0.5'}`}
                        style={{ gap: hasValue ? '3px' : '0' }}
                      >
                        {[...Array(segmentCount)].map((_, idx) => (
                          <div
                            key={idx}
                            className="flex-1 transition-all duration-300"
                            style={{
                              background: hasValue
                                ? (isSelected
                                  ? `rgba(255, 70, 20, ${1 - idx * (0.5 / segmentCount)})`
                                  : `rgba(255, 107, 61, ${1 - idx * (0.5 / segmentCount)})`)
                                : 'rgba(203, 213, 225, 0.5)',
                              boxShadow: (isSelected || hasValue) ? (isSelected ? '0 0 12px rgba(255,107,61,0.35)' : '') : 'none',
                              borderRadius: idx === segmentCount - 1 ? '6px 6px 0 0' : '3px',
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <span
                      className="text-[9px] lg:text-[12px] font-bold mt-3 tracking-tight transition-colors duration-300 group-hover:text-amber-500"
                      style={{ color: isSelected ? '#FF6B3D' : '#94a3b8' }}
                    >
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
            <style>{`
              @keyframes tooltipIn {
                from { opacity: 0; transform: translate(-50%, 6px); }
                to   { opacity: 1; transform: translate(-50%, 0); }
              }
              @keyframes growBarScale {
                from { transform: scaleY(0); opacity: 0; }
                to { transform: scaleY(1); opacity: 1; }
              }
            `}</style>
          </div>

          {/* Financial Performance (Moved from Top) */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-3 lg:gap-3">

            {/* Total Revenue card */}
            <div className="bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 relative flex-1 group transition-all animate-stagger-4 min-h-[165px]">
              <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                  <span className="text-emerald-500 text-lg font-bold">₹</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
                  <TrendingUp size={10} className="text-emerald-500" />
                  <span className="text-[9px] font-black text-emerald-600">+12.5%</span>
                </div>
              </div>
              <div>
                <h3 className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ">Aggregate Revenue</h3>
                <span className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none block">
                  <StatValue value={Math.round(salesData?.totalRevenue || 0)} isLoading={loading} prefix="₹" />
                </span>
              </div>
              <div className="mt-4 lg:mt-6 pt-4 lg:pt-6 border-t border-slate-50">
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Monthly Goal</span>
                  <span className="text-emerald-500">84%</span>
                </div>
                <div className="w-full h-1 bg-slate-50 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '84%' }}></div>
                </div>
              </div>
            </div>

            {/* Average Order Value card */}
            <div className="bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 relative flex-1 group transition-all animate-stagger-5 min-h-[165px]">
              <div className="flex justify-between items-start mb-4 lg:mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100/50">
                  <TrendingUp size={18} className="text-orange-500" strokeWidth={3} />
                </div>
              </div>
              <div>
                <h3 className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ">Avg Order Price</h3>
                <span className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none block">
                  <StatValue value={Math.round(salesData?.avgOrderValue || 0)} isLoading={loading} prefix="₹" />
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Calculated Live</span>
              </div>
            </div>

          </div>
        </div>
        {/* ROW 3: Recent Orders Table */}
        <div className="col-span-1 lg:col-span-12 mt-2">
          <div className="bg-white rounded-3xl lg:rounded-[1.5rem] p-3.5 lg:p-4 border border-slate-100 h-full overflow-hidden animate-in slide-in-from-bottom duration-700">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <div>
                <h2 className="text-lg lg:text-xl font-black text-slate-900 tracking-tighter uppercase">Recent Orders</h2>
                <p className="text-[9px] lg:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Latest transactions across all tables</p>
              </div>
              <button
                onClick={() => onTabChange && onTabChange('history')}
                className="flex items-center gap-1.5 lg:gap-2 px-4 py-2 lg:px-6 lg:py-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-[1.25rem] text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all group"
              >
                View All <ArrowUpRight size={12} className="lg:w-[14px] lg:h-[14px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
              </button>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-50">
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Order ID</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date & Time</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Mode</th>
                    <th className="hidden sm:table-cell px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Items</th>
                    <th className="px-3 md:px-6 py-3 md:py-4 text-[9px] md:text-xs font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((order) => {
                      const isPaid = order.status === 'Paid' || order.status === 'Completed';
                      const isCancelled = order.status === 'Cancelled';
                      const isGuest = order.paymentType === 'Guest';
                      return (
                        <tr key={order._id} className={cn(
                          "group transition-all duration-300",
                          isGuest ? "bg-orange-50/30 hover:bg-orange-50/50" : "hover:bg-slate-50/30"
                        )}>
                          <td className="px-3 md:px-6 py-4 md:py-5">
                            <div className="flex items-center gap-2">
                              {isGuest && <Users size={14} className="text-orange-500" />}
                              <span className="text-sm font-black text-slate-900 tracking-tight">#{order.orderNumber ? formatOrderNumber(order.orderNumber) : '----'}</span>
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4 md:py-5">
                            <div className="flex flex-col">
                              <span className="text-[10px] md:text-xs font-bold text-slate-500 uppercase whitespace-nowrap">
                                {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                              </span>
                              <span className="text-[9px] md:text-[11px] text-slate-300 font-bold uppercase whitespace-nowrap">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-4 md:py-5">
                            <span className={cn(
                              "px-2 md:px-3 py-1.5 rounded-lg text-[9px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap",
                              isCancelled ? "bg-rose-50 text-rose-500" :
                                (isPaid || isGuest) ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                            )}>
                              {isCancelled ? 'Cancelled' : (isPaid || isGuest) ? 'Completed' : 'Active'}
                            </span>
                          </td>
                          <td className="px-3 md:px-6 py-4 md:py-5">
                            {isGuest ? (
                              <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-orange-500">Guest</span>
                            ) : isPaid && order.paymentMode ? (
                              <span className={cn(
                                "text-[9px] md:text-[11px] font-black uppercase tracking-widest whitespace-nowrap",
                                order.paymentMode === 'Online' ? "text-emerald-500" : "text-slate-500"
                              )}>
                                {order.paymentMode}
                              </span>
                            ) : (
                              <span className="text-[9px] md:text-[11px] text-slate-300">-</span>
                            )}
                          </td>
                        <td className="hidden sm:table-cell px-3 md:px-6 py-4 md:py-5 text-center">
                          <span className="text-[10px] md:text-xs font-black text-slate-600 uppercase whitespace-nowrap">
                            {order.items?.length || 0} items
                          </span>
                        </td>
                        <td className="px-3 md:px-6 py-4 md:py-5 text-right">
                          <span className="text-sm font-black text-slate-900 tracking-tight whitespace-nowrap">
                            ₹{Math.round(order.totalAmount || 0)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {recentOrders.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
                        No recent orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

