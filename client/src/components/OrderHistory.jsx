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
      const res = await axios.get(`/api/orders?page=${pageNumber}&search=${search}&type=${type}`);
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
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 space-y-8 animate-in fade-in duration-500">
      {/* --- Dashboard Header --- */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System Core v3.0</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
            MASTER <span className="text-indigo-600 italic text-2xl uppercase tracking-tighter">Registry</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter by name, phone or table..."
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-bold w-64"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset page on search
              }}
            />
          </div>
        </div>
      </header>

      {/* --- Filter Bar --- */}
      <div className="flex gap-2">
        {['All', 'Dine-in', 'Parcel'].map(type => (
          <button
            key={type}
            onClick={() => {
              setFilterType(type);
              setPage(1);
            }}
            className={cn(
              "px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
              filterType === type
                ? "bg-white border-slate-900 text-slate-900 shadow-sm"
                : "bg-transparent border-slate-200 text-slate-400 hover:bg-white"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* --- Main Content Area --- */}
      {errorMsg && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-center font-bold">
          {errorMsg}
        </div>
      )}

      {loadingHistory ? (
        <div className="flex flex-col items-center justify-center h-[40vh] space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Querying Database...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {historyOrders.length === 0 ? (
            <div className="py-24 flex flex-col items-center text-center space-y-4">
              <div className="p-8 bg-white rounded-full shadow-sm">
                <History size={48} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-400 italic">No Records Found</h3>
            </div>
          ) : (
            historyOrders.map((order) => {
              if (!order) return null;
              return (
                <div
                  key={order._id}
                  className="bg-white border border-slate-100 rounded-[1.5rem] p-4 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.25rem] flex flex-col items-center justify-center shadow-lg shrink-0 border-b-4 border-indigo-500/50">
                    <span className="text-[9px] font-black uppercase opacity-40 tracking-widest -mb-1">Order</span>
                    <span className="text-2xl font-black italic tracking-tighter">#{order.orderNumber || '?'}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 truncate uppercase tracking-tight italic text-lg">
                      {order.customerName || (order.orderType === 'Dine-in' ? `Table ${order.tableId}` : 'WALK-IN')}
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] mt-1 flex items-center gap-2 uppercase">
                       {order.orderType} <span className="w-1 h-1 bg-slate-200 rounded-full"></span> {order.status}
                    </p>
                  </div>
                </div>

                  <div className="hidden lg:flex items-center gap-8 text-slate-400">
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase mb-1 italic">Date</p>
                      <p className="text-xs font-black text-slate-700 tracking-tighter shrink-0 flex items-center gap-1">
                        <Calendar size={12} /> {order.createdAt ? new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase mb-1 italic">Items</p>
                      <p className="text-sm font-black text-slate-700 tracking-tighter">{order.items?.length || 0} units</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase mb-1 italic">Session</p>
                      <p className={cn("text-xs font-black uppercase", order.status === 'Paid' ? "text-emerald-500" : "text-indigo-500")}>
                        {order.status || 'Active'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Gross Value</p>
                      <p className="text-2xl font-black text-slate-900 italic tracking-tighter">₹{Math.round(order.totalAmount || 0)}</p>
                    </div>
                    <button
                      onClick={() => onOrderClick && onOrderClick(order._id)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all group"
                    >
                      <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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