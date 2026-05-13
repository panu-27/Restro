import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, History, Calendar, ArrowUpRight, Package, Utensils, Clock, Users, ChevronRight, Filter } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sk, SkeletonStyles } from './Skeleton';


const cn = (...inputs) => twMerge(clsx(inputs));

const OrderHistory = ({ onOrderClick }) => {
  const formatOrderNumber = (num) => String(num || '').padStart(4, '0');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterType, setFilterType] = useState('Dine-in');
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

  const fetchHistory = async (pageNumber = 1, search = '', type = 'Dine-in') => {
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

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--/--/--';
  const fmtTime = (d) => d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase() : '--:--';

  return (
    <div className="min-h-screen bg-white pb-32 animate-in fade-in duration-700 font-sans">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-50">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Order History</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Registry Archive</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['Dine-in', 'Parcel'].map(type => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setPage(1); }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap",
                    filterType === type
                      ? "bg-white text-[#4B6FFF] shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Search + Payment Filter ── */}
        <div className="flex flex-col gap-4">
          <div className="relative group w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4B6FFF] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search order #, customer, phone..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#4B6FFF] focus:ring-4 focus:ring-[#4B6FFF]/10 transition-all text-[15px] text-slate-700 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>

        </div>
      </header>

      {/* ── Orders Registry ────────────────────────────────────────── */}
      <div className="px-5 pt-6 animate-in zoom-in-95 duration-500">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
              <History size={16} strokeWidth={2} />
            </div>
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{filterType} Registry</h2>
          </div>
          <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">
            {historyOrders.length} {historyOrders.length === 1 ? 'Record' : 'Records'}
          </div>
        </div>

        {/* Loading / Empty / Content */}
        {loadingHistory ? (
          <div className="space-y-3">
            <SkeletonStyles />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3">
                <div className="flex justify-between items-center"><Sk className="h-4 w-20 rounded" /><Sk className="h-4 w-14 rounded" /></div>
                <div className="flex justify-between items-center"><Sk className="h-3 w-32 rounded" /><Sk className="h-3 w-20 rounded" /></div>
              </div>
            ))}
          </div>
        ) : historyOrders.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-100 bg-white mx-1">
            <History size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {historyOrders.map((order) => {
              const isPaid = order.status === 'Paid' || order.status === 'Completed';
              const isCancelled = order.status === 'Cancelled';

              return (
                <div
                  key={order._id}
                  onClick={() => onOrderClick && onOrderClick(order._id)}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 transition-all active:scale-[0.98] cursor-pointer hover:border-[#4B6FFF] hover:shadow-lg hover:shadow-[#4B6FFF]/5"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        {order.orderType === 'Dine-in' ? <Utensils size={12} className="text-slate-400" /> : <Package size={12} className="text-slate-400" />}
                        <span className="text-[15px] font-black text-slate-900 tracking-tight">#{order.orderNumber ? formatOrderNumber(order.orderNumber) : '----'}</span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
                          isCancelled ? "bg-rose-50 text-rose-600" :
                            isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {isCancelled ? 'Cancelled' : isPaid ? 'Completed' : 'Running'}
                        </div>
                      </div>
                      <p className={cn("text-[13px] font-bold truncate max-w-[140px]", order.customerName ? "text-slate-800" : "text-slate-400")}>
                        {order.customerName || 'Walk-in Customer'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[17px] font-black text-[#4B6FFF]">₹{Math.round(order.totalAmount || 0)}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.paymentMode || 'PENDING'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-400">{fmtDate(order.createdAt)}</span>
                      <Clock size={12} className="text-slate-400 ml-1.5" />
                      <span className="text-[11px] font-bold text-slate-400">{fmtTime(order.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{order.orderType}</span>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-[#4B6FFF] transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- Pagination Controls --- */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-6 border-t border-slate-50 mt-4 mb-20 bg-white">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-slate-600 uppercase tracking-widest rounded-xl border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed active:bg-slate-50 transition-all"
          >
            Prev
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Page</span>
            <span className="text-[13px] font-black text-slate-900">{page} <span className="text-slate-300 mx-1">/</span> {totalPages}</span>
          </div>

          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-black text-[#4B6FFF] uppercase tracking-widest rounded-xl border border-[#4B6FFF] disabled:opacity-30 disabled:cursor-not-allowed active:bg-blue-50 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
