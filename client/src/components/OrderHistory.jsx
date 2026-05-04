import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, History, Calendar, ArrowUpRight, Package, Utensils, Clock, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';


const cn = (...inputs) => twMerge(clsx(inputs));

const OrderHistory = ({ onOrderClick }) => {
  const formatOrderNumber = (num) => String(num || '').padStart(4, '0');
  const [searchTerm, setSearchTerm] = useState('');
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('Paid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory(page, searchTerm, filterType, paymentFilter);
    }, searchTerm ? 500 : 0);
    return () => clearTimeout(timer);
  }, [page, searchTerm, filterType, paymentFilter]);

  const fetchHistory = async (pageNumber = 1, search = '', type = 'All', pType = 'Paid') => {
    setLoadingHistory(true);
    setErrorMsg('');
    try {
      // paymentQuery will be 'Guest' or 'Paid' (server handles 'Paid' as non-guest)
      const paymentQuery = pType === 'Guest' ? 'Guest' : 'Paid';
      const res = await axios.get(`/api/orders?page=${pageNumber}&search=${search}&type=${type === 'All' ? '' : type}&paymentType=${paymentQuery}`);
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
    <div className="min-h-screen bg-white p-4 lg:p-6 pb-24 lg:pb-6 space-y-4 lg:space-y-6 animate-in fade-in duration-700">
      
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order History</h1>
            <p className="text-xs font-medium text-slate-500 mt-1">Registry Archive</p>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 hidden sm:block">
            {totalOrders} Total Records
          </div>
        </div>

        {/* ── Search + Filter Combined Row ─────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2 shrink-0 border-r border-slate-200 pr-2">
              {['All', 'Dine-in', 'Parcel'].map(type => (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setPage(1); }}
                  className={cn(
                    "px-4 py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap",
                    filterType === type
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => { setPaymentFilter(prev => prev === 'Guest' ? 'Paid' : 'Guest'); setPage(1); }}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2",
                  paymentFilter === 'Guest'
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-100"
                    : "bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100"
                )}
              >
                <Users size={14} />
                Guest Orders
              </button>
            </div>
          </div>

          {/* Search bar - full width on mobile */}
          <div className="relative group w-full sm:w-auto sm:ml-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={15} />
            <input
              type="text"
              placeholder="Search by order #, customer, phone..."
              className="bg-slate-50 border border-slate-100 rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all text-sm w-full sm:w-72"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </header>

      {/* ── Orders by Section ────────────────────────────────────────── */}
      <div className="space-y-5 animate-in zoom-in-95 duration-500">
        
        {['Dine-in', 'Parcel'].map(sectionType => {
          // If filter is active and doesn't match this section, don't render it
          if (filterType !== 'All' && filterType !== sectionType) return null;
          
          const sectionOrders = historyOrders.filter(o => o.orderType === sectionType);
          
          return (
            <div key={sectionType}>
              {/* Section Header */}
              <div className="bg-white border-b border-slate-100 py-3 flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {sectionType === 'Dine-in' ? <Utensils className="text-slate-900" size={16} /> : <Package className="text-slate-900" size={16} />}
                  <h2 className="text-sm font-semibold text-slate-900">{sectionType} Orders</h2>
                </div>
                <div className="text-xs text-slate-500">
                  {sectionOrders.length} {sectionOrders.length === 1 ? 'Record' : 'Records'}
                </div>
              </div>

              {/* Loading / Empty / Content */}
              {loadingHistory ? (
                <div className="py-12 text-center border-b border-slate-100 mb-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-500">Loading...</p>
                  </div>
                </div>
              ) : sectionOrders.length === 0 ? (
                <div className="py-12 text-center border-b border-slate-100 mb-4">
                  <History size={24} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-400">No {sectionType} records found</p>
                </div>
              ) : (
                <>
                  {/* ─── Mobile Card Layout ──────────────────────────────── */}
                  <div className="lg:hidden space-y-3 mb-5">
                    {sectionOrders.map((order) => {
                      const isPaid = order.status === 'Paid' || order.status === 'Completed';
                      const isCancelled = order.status === 'Cancelled';
                      const statusColor = isCancelled ? 'bg-rose-50 text-rose-600' :
                        isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600';
                      return (
                        <div
                          key={order._id}
                          className={cn(
                            "bg-white border-b border-slate-100 py-3 active:bg-slate-50 transition-all cursor-pointer relative",
                            order.paymentType === 'Guest' && "bg-orange-50/20 border-l-4 border-orange-500/50"
                          )}
                          onClick={() => onOrderClick && onOrderClick(order._id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {order.paymentType === 'Guest' && <Users size={14} className="text-orange-500" />}
                              <span className="text-sm font-semibold text-slate-900">#{order.orderNumber ? formatOrderNumber(order.orderNumber) : '----'}</span>
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', statusColor)}>
                                {isCancelled ? 'Cancelled' : isPaid ? 'Completed' : 'Running'}
                              </span>
                              {order.paymentType === 'Guest' && (
                                <div className="flex flex-col">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 w-fit">Guest</span>
                                  {order.guestNote && <span className="text-[9px] text-slate-400 italic">Category: {order.guestNote}</span>}
                                </div>
                              )}
                              {isPaid && order.paymentType !== 'Guest' && order.paymentMode && (
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap', 
                                  order.paymentMode === 'Online' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                )}>
                                  {order.paymentMode}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-slate-900">₹{Math.round(order.totalAmount || 0)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs", order.customerName ? "text-slate-700" : "text-slate-400")}>
                                {order.customerName || 'Walk-in'}
                              </span>
                              {order.customerPhone && (
                                <span className="text-xs text-slate-400">{order.customerPhone}</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              {fmtDate(order.createdAt)} {fmtTime(order.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─── Desktop Table Layout ────────────────────────────── */}
                  <div className="hidden lg:block bg-white border border-slate-100 rounded-lg overflow-hidden mb-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">Order ID</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">Date & Time</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">Customer</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">Mobile No.</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500">Mode</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Amount</th>
                          <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sectionOrders.map((order) => {
                          const isPaid = order.status === 'Paid' || order.status === 'Completed';
                          const isCancelled = order.status === 'Cancelled';
                          return (
                            <tr key={order._id} 
                              className={cn(
                                "group transition-colors cursor-pointer",
                                order.paymentType === 'Guest' ? "bg-orange-50/30 hover:bg-orange-50/50" : "hover:bg-slate-50"
                              )} 
                              onClick={() => onOrderClick && onOrderClick(order._id)}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {order.paymentType === 'Guest' && <Users size={14} className="text-orange-500" />}
                                  <span className="text-sm font-semibold text-slate-900">#{order.orderNumber ? formatOrderNumber(order.orderNumber) : '----'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col">
                                  <span className="text-xs text-slate-700">{fmtDate(order.createdAt)}</span>
                                  <span className="text-[11px] text-slate-500">{fmtTime(order.createdAt)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={cn("text-sm", order.customerName ? "text-slate-900" : "text-slate-400")}>
                                  {order.customerName || 'Walk-in'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm text-slate-500">
                                  {order.customerPhone || '----------'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className={cn(
                                  "inline-flex px-2 py-1 rounded text-[10px] font-medium",
                                  isCancelled ? "bg-rose-50 text-rose-600" :
                                  isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                                )}>
                                  {isCancelled ? 'Cancelled' : isPaid ? 'Completed' : 'Running'}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {order.paymentType === 'Guest' ? (
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-orange-600">Guest</span>
                                    {order.guestNote && <span className="text-[9px] text-slate-400 italic truncate max-w-[80px]">Category: {order.guestNote}</span>}
                                  </div>
                                ) : isPaid && order.paymentMode ? (
                                  <span className={cn("text-xs font-medium", order.paymentMode === 'Online' ? "text-emerald-600" : "text-slate-500")}>
                                    {order.paymentMode}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-300">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-semibold text-slate-900">₹{Math.round(order.totalAmount || 0)}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button className="w-8 h-8 text-slate-400 rounded-md flex items-center justify-center hover:bg-slate-200 hover:text-slate-900 transition-all mx-auto">
                                   <ArrowUpRight size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* --- Pagination Controls --- */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-slate-100 mt-2">
          <div className="text-xs text-slate-500">
             Page <span className="font-semibold text-slate-900">{page}</span> of <span className="font-semibold text-slate-900">{totalPages}</span> 
             <span className="mx-2 text-slate-300">|</span> 
             Total <span className="font-semibold text-slate-900">{totalOrders}</span> Records
          </div>
          <div className="flex items-center gap-1">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
            >
              Prev
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={cn(
                      "w-7 h-7 rounded-md text-xs font-medium transition-all",
                      page === pageNum ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
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
              className="px-3 py-1.5 text-xs font-medium text-slate-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-all"
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
