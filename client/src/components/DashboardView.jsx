import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ChevronRight, ChevronDown, Clock, MoveUpRight, ArrowUpRight, 
  TrendingUp, ShoppingBag, CheckCircle2, DollarSign, Package, Users
} from 'lucide-react';

export const DashboardView = ({ activeOrders, tableCount, onTabChange }) => {
  const [salesData, setSalesData] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState('week');
  const [selectedBar, setSelectedBar] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

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

  // Calculations
  const pendingOrders = activeOrders.filter(o => o.status === 'Received' || o.status === 'Preparing');
  const paidToday = salesData?.dailyBreakdown?.find(d => 
    new Date(d.date).toDateString() === new Date().toDateString()
  )?.orders || 0;

  const currentDay = new Intl.DateTimeFormat('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
  }).format(new Date());

  const getChartData = () => {
    if (!salesData || !salesData.dailyBreakdown) return [];
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dataMap = {};
    salesData.dailyBreakdown.forEach(d => {
      const dayStr = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' });
      dataMap[dayStr] = d.total;
    });
    
    return weekDays.map(d => ({
      day: d,
      value: dataMap[d] || 0
    }));
  };

  const chartData = getChartData();
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1000);

  const cn = (...classes) => classes.filter(Boolean).join(' ');

  // Category Distribution (Mocked from topItems logic)
  const categories = ['Main Course', 'Beverages', 'Starters', 'Desserts'];
  const categoryData = [45, 25, 20, 10]; // Percentage distribution

  return (
    <div className="flex-1 px-6 py-4 w-full max-w-[1800px] mx-auto overflow-hidden animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Overview</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">{currentDay}</p>
        </div>
        <div className="flex gap-4 items-center">
           <div className="px-4 py-2 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">System Live</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 pb-20">
        
        {/* ROW 1: 2 High-Density Metric Cards */}
        <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Active Orders */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 flex flex-col justify-between h-[180px] relative overflow-hidden group animate-stagger-1">
             <div className="flex justify-between items-start w-full">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center border border-orange-100/50">
                    <ShoppingBag size={24} className="text-orange-500" strokeWidth={3} />
                 </div>
                 <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">Current Status</span>
                    <span className="text-sm font-black text-slate-900 uppercase ">Active Orders</span>
                 </div>
               </div>
               <div className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 rounded-xl">
                 <TrendingUp size={12} className="text-orange-500" strokeWidth={3} />
                 <span className="text-[10px] font-black text-orange-600">4.2% Growth</span>
               </div>
             </div>
             <div className="mt-4 flex items-baseline gap-3">
                <span className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {pendingOrders.length}
                </span>
                <span className="text-xs font-black text-orange-400 uppercase tracking-widest  mb-1">Queue Live</span>
             </div>
          </div>

          {/* Completed Today */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 flex flex-col justify-between h-[180px] relative overflow-hidden group animate-stagger-2">
             <div className="flex justify-between items-start w-full">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                    <CheckCircle2 size={24} className="text-emerald-500" strokeWidth={3} />
                 </div>
                 <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 block">Performance</span>
                    <span className="text-sm font-black text-slate-900 uppercase ">Completed Today</span>
                 </div>
               </div>
               <div className="px-3 py-1.5 bg-emerald-50 rounded-xl">
                 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Target Met</span>
               </div>
             </div>
             <div className="mt-4 flex items-baseline gap-3">
                <span className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                  {paidToday}
                </span>
                <span className="text-xs font-black text-emerald-400 uppercase tracking-widest  mb-1">Settled Units</span>
             </div>
          </div>

        </div>

        {/* ROW 2: Dual Charts */}
        <div className="col-span-12 grid grid-cols-12 gap-6 mt-2">
          
          {/* Revenue Chart - Redesigned */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 relative min-h-[480px] font-['DM_Sans',sans-serif] animate-stagger-3">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-2xl font-bold text-[#111827] tracking-tight">Revenue</h2>
                <p className="text-sm font-medium text-slate-400 mt-0.5">Sales Overview</p>
              </div>
              <select 
                value={revenuePeriod}
                onChange={(e) => setRevenuePeriod(e.target.value)}
                className="bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600 px-3 py-2 rounded-xl focus:ring-0 cursor-pointer outline-none"
              >
                <option value="week">This Week</option>
                <option value="previous_week">Previous Week</option>
              </select>
            </div>

            <div className="relative h-[300px] w-full flex items-end justify-between pl-16 pr-4 pb-8">
              {/* Y-Axis Grid Lines */}
              <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between pointer-events-none pb-14 z-0">
                {[1000, 800, 600, 400, 200, 0].map(val => (
                  <div key={val} className="flex text-[11px] text-slate-400 font-medium items-center w-full">
                    <span className="w-10 text-right mr-6">
                      {val === 1000 ? '₹1k' : `₹${val}`}
                    </span>
                    <div className="flex-1 border-t border-slate-100 opacity-60"></div>
                  </div>
                ))}
              </div>
              
              {/* Chart Bars */}
              {chartData.map((d, i) => {
                const totalValue = d.value || 0;
                const maxH = Math.max(...chartData.map(x => x.value), 1000);
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
                      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
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
                      className="text-[12px] font-bold mt-3 tracking-tight transition-colors duration-300 group-hover:text-amber-500"
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
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
             
             {/* Total Revenue card */}
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 relative flex-1 group hover:shadow-xl hover:shadow-emerald-500/5 transition-all animate-stagger-4">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100/50">
                      <span className="text-emerald-500 text-lg font-bold">₹</span>
                   </div>
                   <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg">
                      <TrendingUp size={10} className="text-emerald-500" />
                      <span className="text-[9px] font-black text-emerald-600">+12.5%</span>
                   </div>
                </div>
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ">Aggregate Revenue</h3>
                   <span className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none block">
                      ₹{Math.round(salesData?.totalRevenue || 0).toLocaleString('en-IN')}
                   </span>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-50">
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
             <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 relative flex-1 group hover:shadow-xl hover:shadow-orange-500/5 transition-all animate-stagger-5">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100/50">
                      <TrendingUp size={18} className="text-orange-500" strokeWidth={3} />
                   </div>
                </div>
                <div>
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ">Avg Order Price</h3>
                   <span className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none block">
                      ₹{Math.round(salesData?.avgOrderValue || 0).toLocaleString('en-IN')}
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
        <div className="col-span-12 mt-2">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50 h-full overflow-hidden animate-in slide-in-from-bottom duration-700">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h2 className="text-xl font-black text-slate-900 tracking-tighter  uppercase">Recent Orders</h2>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Latest transactions across all tables</p>
                </div>
                <button 
                  onClick={() => onTabChange && onTabChange('history')}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-[1.25rem] text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all group"
                >
                    View All <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
                </button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-50">
                     <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                     <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                     <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                     <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Items</th>
                     <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {recentOrders.map((order) => {
                      const isPaid = order.status === 'Paid' || order.status === 'Completed';
                      const isCancelled = order.status === 'Cancelled';
                      return (
                        <tr key={order._id} className="group hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <span className="text-sm font-black text-slate-900 tracking-tight">#{order.orderNumber || '----'}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-slate-500 uppercase">
                                {new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: '2-digit' })}
                              </span>
                              <span className="text-[11px] text-slate-300 font-bold uppercase">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={cn(
                              "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest",
                              isCancelled ? "bg-rose-50 text-rose-500" :
                              isPaid ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"
                            )}>
                              {isCancelled ? 'Cancelled' : isPaid ? 'Completed' : 'Active'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-xs font-black text-slate-600 uppercase">
                              {order.items?.length || 0} items
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-sm font-black text-slate-900 tracking-tight">
                              ₹{Math.round(order.totalAmount || 0)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {recentOrders.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs">
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

