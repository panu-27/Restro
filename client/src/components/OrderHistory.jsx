import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, History, Calendar, ArrowUpRight, Package, Utensils } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const OrderHistory = ({ onOrderClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(page, searchTerm, filterType);
    }, searchTerm ? 500 : 0);
    return () => clearTimeout(timer);
  }, [page, searchTerm, filterType]);

  const fetchHistory = async (pageNumber = 1, search = '', type = 'All') => {
    setLoadingHistory(true);
    setErrorMsg('');
    try {
      const res = await axios.get(`/api/orders?page=${pageNumber}&search=${search}&type=${type === 'All' ? '' : type}`);
      if (res.data && Array.isArray(res.data.orders)) {
        setHistoryOrders(res.data.orders);
        setTotalPages(res.data.pages || 1);
        setTotalOrders(res.data.total || 0);
      } else {
        setHistoryOrders([]);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setErrorMsg('Failed to load order history. Please try again.');
      setHistoryOrders([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getOrderLabel = (order) => {
    if (!order) return 'Unknown Order';
    try {
      const today = new Date().setHours(0,0,0,0);
      const orderDate = order.createdAt ? new Date(order.createdAt).setHours(0,0,0,0) : today;
      const isToday = today === orderDate;
      
      const prefix = isToday ? 'Today' : (order.createdAt ? new Date(order.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Past');
      const numberPart = order.orderNumber ? `Order #${order.orderNumber}` : (order.partLabel || 'Order');
      
      return `${prefix} ${numberPart}`;
    } catch (e) {
      return 'Order Record';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Order History</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Registry Archive v3.0</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search history..."
              className="bg-white border border-slate-100 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all text-sm font-bold w-64 shadow-sm"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </header>

      {/* ── Filter Bar ───────────────────────────────────────────── */}
      <div className="flex gap-2">
        {['All', 'Dine-in', 'Parcel'].map(type => (
          <button
            key={type}
            onClick={() => { setFilterType(type); setPage(1); }}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              filterType === type
                ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* ── Table Container ────────────────────────────────────────── */}
      <div className="space-y-6 animate-in zoom-in-95 duration-500">
        
        {['Dine-in', 'Parcel'].map(sectionType => {
          // If filter is active and doesn't match this section, don't render it
          if (filterType !== 'All' && filterType !== sectionType) return null;
          
          const sectionOrders = historyOrders.filter(o => o.orderType === sectionType);
          
          return (
            <div key={sectionType} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-6">
              <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   {sectionType === 'Dine-in' ? <Utensils className="text-orange-500" size={18} /> : <Package className="text-emerald-500" size={18} />}
                   <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{sectionType} Orders</h2>
                 </div>
                 <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                   {sectionOrders.length} {sectionOrders.length === 1 ? 'Record' : 'Records'}
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-slate-100">
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Customer</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Mobile No.</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                             <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Accessing Records...</p>
                          </div>
                        </td>
                      </tr>
                    ) : sectionOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-16 text-center">
                          <History size={32} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-sm font-black text-slate-300 uppercase">No {sectionType} records found</p>
                        </td>
                      </tr>
                    ) : (
                      sectionOrders.map((order) => {
                        const isPaid = order.status === 'Paid' || order.status === 'Completed';
                        const isCancelled = order.status === 'Cancelled';
                        return (
                          <tr key={order._id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => onOrderClick && onOrderClick(order._id)}>
                            <td className="px-8 py-5">
                              <span className="text-sm font-black text-slate-900 tracking-tighter">#{order.orderNumber || '----'}</span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[12px] font-bold text-slate-500 uppercase">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--/--/--'}
                                </span>
                                <span className="text-[11px] text-slate-400 font-bold">
                                  {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase() : '--:--'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span className={cn(
                                "text-sm font-bold uppercase",
                                order.customerName ? "text-slate-900" : "text-slate-300"
                              )}>
                                {order.customerName || 'Walk-in'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <span className="text-sm font-bold text-slate-400 tracking-tighter">
                                {order.customerPhone || '----------'}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className={cn(
                                "inline-flex px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest shadow-sm",
                                isCancelled ? "bg-rose-100 text-rose-600 shadow-rose-50" :
                                isPaid ? "bg-emerald-100 text-emerald-600 shadow-emerald-50" : "bg-amber-100 text-amber-600 shadow-amber-50"
                              )}>
                                {isCancelled ? 'Cancelled' : isPaid ? 'Completed' : 'Running'}
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right">
                              <span className="text-lg font-black text-slate-900 tracking-tighter">₹{Math.round(order.totalAmount || 0)}</span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <button className="w-10 h-10 bg-slate-50 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm mx-auto">
                                 <ArrowUpRight size={18} strokeWidth={3} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Pagination Controls --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
          <div className="text-xs font-black text-slate-400 uppercase tracking-widest">
             Page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span> 
             <span className="mx-2 opacity-20">|</span> 
             Total <span className="text-slate-900">{totalOrders}</span> Records
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-6 py-2.5 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-10 h-10 rounded-xl text-[10px] font-black transition-all",
                      page === pageNum ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-6 py-2.5 bg-slate-50 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
