import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  Search, Plus, X, Clock, ArrowUpRight,
  ShoppingBag, CheckCircle2, XCircle, Activity,
  ChevronDown, ChevronUp, User, Phone, Utensils, Package
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (d) => new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: '2-digit', year: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: true
});
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
const fmtOrderNo = (n) => String(n || '').padStart(4, '0');

// ── Detail Modal ──────────────────────────────────────────────────────────────
const OrderDetailModal = ({ order, onClose, onProceed }) => {
  const [itemsOpen,  setItemsOpen]  = useState(true);

  if (!order) return null;

  const sub   = (order.items || []).reduce((s, i) => s + (i.price * (i.quantity || i.qty || 1)), 0);
  const total = order.totalAmount || sub;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200 no-print">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <h2 className="text-lg font-black text-slate-900">Orders Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500"/>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-6">
          {/* Order Info */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={16} className="text-[#FF5A36]"/>
              <span className="text-sm font-black text-slate-900">Order Info</span>
              <span className="ml-auto text-xs font-bold text-slate-400">#{order.orderNumber ? fmtOrderNo(order.orderNumber) : order._id?.slice(-8)}</span>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ['Order Date & Time', fmt(order.createdAt)],
                ['Order Type',        order.orderType || 'Dine-in'],
                ['Table',             order.tableId    || '—'],
                ['Customer',          order.customerName || 'Walk-in'],
                ['Mobile',            order.customerPhone || '—'],
                ['Amount',            `₹${Math.round(total)}`],
                ['Status',            order.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-400 font-medium">{k}:</span>
                  <span className="font-bold text-slate-900">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Order Items */}
          <section className="border border-slate-100 rounded-2xl overflow-hidden">
            <button onClick={() => setItemsOpen(o => !o)}
              className="w-full flex items-center gap-2 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Utensils size={15} className="text-[#FF5A36]"/>
              <span className="text-sm font-black text-slate-900 flex-1 text-left">
                Order Items ({(order.items || []).length})
              </span>
              {itemsOpen ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
            </button>
            {itemsOpen && (
              <div className="px-5 py-4 space-y-3">
                {(order.items || []).length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center py-2">No items yet</p>
                ) : (
                  (order.items || []).map((item, idx) => {
                    const qty   = item.quantity || item.qty || 1;
                    const lineT = item.price * qty;
                    return (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-800 flex-1 truncate pr-2">{item.name}</span>
                        <span className="text-slate-400 text-xs whitespace-nowrap">
                          Qty <span className="font-black text-slate-700">×{qty}</span>
                          <span className="mx-2 text-slate-200">|</span>
                          ₹{item.price}
                        </span>
                        <span className="font-black text-slate-900 ml-3 whitespace-nowrap">₹{lineT}</span>
                      </div>
                    );
                  })
                )}
                <div className="flex justify-between pt-3 border-t border-slate-100">
                  <span className="text-sm font-bold text-slate-400">Total</span>
                  <span className="text-sm font-black text-[#FF5A36]">₹{Math.round(total)}</span>
                </div>
              </div>
            )}
          </section>

          {order.status !== 'Paid' && order.status !== 'Cancelled' && (
            <section className="border-t border-slate-100 pt-5 animate-in slide-in-from-bottom-2 duration-200">
              <button
                onClick={() => onProceed(order._id)}
                className="w-full py-3.5 rounded-xl bg-[#FF5A36] hover:bg-orange-600 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-orange-200"
              >
                Proceed to Billing
              </button>
            </section>
          )}
        </div>

        {/* No bottom toggles anymore! */}
      </div>
    </div>
    </>
  );
};




// ── Main Component ────────────────────────────────────────────────────────────
const POSInterface = ({ activeOrders, user, onOrderUpdate, onOrderClick }) => {
  const [searchTerm,    setSearchTerm]    = useState('');
  const [filterType,    setFilterType]    = useState('All');
  const [detailOrder,   setDetailOrder]   = useState(null);
  const [isAdding,      setIsAdding]      = useState(false);
  const [newParcel,     setNewParcel]     = useState({ name: '', phone: '' });
  const [allOrders,     setAllOrders]     = useState([]);

  // Fetch a broader set including recent completed for stats
  useEffect(() => {
    axios.get('/api/orders?page=1&limit=50')
      .then(r => setAllOrders(Array.isArray(r.data) ? r.data : (r.data.orders || [])))
      .catch(() => {});
  }, [activeOrders]);

  // Stats
  const stats = useMemo(() => {
    const running   = (activeOrders || []).filter(o => o.status !== 'Paid' && o.status !== 'Cancelled').length;
    const completed = allOrders.filter(o => o.status === 'Paid').length;
    const cancelled = allOrders.filter(o => o.status === 'Cancelled').length;
    return { total: running, running, completed, cancelled };
  }, [activeOrders, allOrders]);

  // Filtered running orders
  const filtered = useMemo(() => {
    let list = (activeOrders || []).filter(o => o.status !== 'Paid' && o.status !== 'Cancelled');
    if (filterType !== 'All') list = list.filter(o => o.orderType === filterType);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        String(o.orderNumber || '').includes(q) ||
        (o.tableId || '').toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activeOrders, filterType, searchTerm]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.patch(`/api/orders/${id}/status`, { status });
      setDetailOrder(null);
      onOrderUpdate();
    } catch (err) { console.error(err); }
  };

  const handleCreateParcel = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await axios.post('/api/orders', {
        orderType: 'Parcel', items: [], totalAmount: 0,
        customerName: newParcel.name, customerPhone: newParcel.phone
      });
      setIsAdding(false);
      setNewParcel({ name: '', phone: '' });
      onOrderUpdate();
      if (onOrderClick) onOrderClick(res.data._id);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] p-4 lg:p-6 pb-24 lg:pb-6 space-y-4 lg:space-y-5 animate-in fade-in duration-500 no-print">

      {/* ── Page Title ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg lg:text-[1.7rem] font-black text-slate-900 tracking-tight uppercase">Orders</h1>
          <p className="text-[8px] lg:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-1">Manage all orders of the restaurant.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 lg:gap-2 px-3 py-2 lg:px-5 lg:py-2.5 bg-[#FF5A36] text-white rounded-lg lg:rounded-xl text-[9px] lg:text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95 shrink-0"
        >
          <Plus size={15} strokeWidth={3}/> <span className="hidden sm:inline">New Parcel</span>
        </button>
      </div>

      {/* ── Stats Strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {[
          { label: 'Total Orders',  value: stats.total,     valueClass: 'text-white',         card: 'bg-[#FF5A36] shadow-orange-200' },
          { label: 'Running',       value: stats.running,   valueClass: 'text-blue-600',       card: 'bg-white border border-slate-100' },
          { label: 'Completed',     value: stats.completed, valueClass: 'text-emerald-500',    card: 'bg-white border border-slate-100' },
          { label: 'Cancelled',     value: stats.cancelled, valueClass: 'text-rose-500',       card: 'bg-white border border-slate-100' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl lg:rounded-2xl px-4 py-3 lg:px-6 lg:py-4 shadow-sm flex flex-col justify-center', s.card)}>
            <p className={cn('text-[9px] lg:text-[10px] font-black uppercase tracking-widest mb-1', s.card.includes('FF5A36') ? 'text-orange-100' : 'text-slate-400')}>{s.label}</p>
            <p className={cn('text-2xl lg:text-3xl font-black leading-none', s.valueClass)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter + Search ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Type filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto shrink-0 pb-1 sm:pb-0">
          {['All', 'Dine-in', 'Parcel'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn('px-3 lg:px-4 py-2 rounded-lg lg:rounded-xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
                filterType === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
              )}>{t}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
          <input
            type="text" placeholder="Search orders..."
            className="bg-white border border-slate-100 rounded-lg lg:rounded-xl py-2 pl-9 pr-4 text-xs lg:text-sm font-bold w-full sm:w-56 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Orders List ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-100 shadow-sm py-20 lg:py-24 flex flex-col items-center gap-3 lg:gap-4">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-slate-50 rounded-full flex items-center justify-center">
            <Activity size={24} className="text-slate-200 lg:w-7 lg:h-7"/>
          </div>
          <p className="text-[10px] lg:text-sm font-black text-slate-300 uppercase tracking-widest">No running orders</p>
        </div>
      ) : (
        <>
          {/* ─── Mobile Card Layout ──────────────────────────────────── */}
          <div className="lg:hidden space-y-3">
            {filtered.map(order => {
              const label = order.tableId || order.customerName || 'Walk-in';
              const statusColor =
                order.status === 'Served'    ? 'bg-emerald-50 text-emerald-600' :
                order.status === 'Pending'   ? 'bg-amber-50 text-amber-600' :
                order.status === 'Preparing' ? 'bg-blue-50 text-blue-600' :
                                               'bg-orange-50 text-orange-600';
              return (
                <div
                  key={order._id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 active:scale-[0.98] transition-all cursor-pointer"
                  onClick={() => setDetailOrder(order)}
                >
                  {/* Top row: Order # + Status + Amount */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-black text-slate-900">#{order.orderNumber ? fmtOrderNo(order.orderNumber) : '—'}</span>
                      <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest', statusColor)}>
                        {order.status === 'Pending' ? 'Running' : order.status}
                      </span>
                    </div>
                    <span className="text-lg font-black text-slate-900 tracking-tight">₹{Math.round(order.totalAmount || 0)}</span>
                  </div>
                  {/* Bottom row: Type + Table/Customer + Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">
                        {order.orderType === 'Parcel' ? 'Parcel' : 'Dine-in'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {order.orderType === 'Parcel'
                          ? <User size={12} className="text-slate-300 shrink-0"/>
                          : <Utensils size={12} className="text-slate-300 shrink-0"/>
                        }
                        <span className="text-xs font-bold text-slate-500 truncate max-w-[120px]">{label}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={11}/>
                      <span className="text-[11px] font-bold">{fmtTime(order.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Desktop Table Layout ────────────────────────────────── */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {/* Table header */}
              <div className="grid grid-cols-12 px-6 py-3 bg-slate-50/60">
                {['Order ID','Date & Time','Type','Table / Customer','Status','Amount',''].map((h, i) => (
                  <div key={h} className={cn(
                    'text-[10px] font-black text-slate-400 uppercase tracking-widest',
                    i === 0 ? 'col-span-2' :
                    i === 1 ? 'col-span-2' :
                    i === 2 ? 'col-span-1' :
                    i === 3 ? 'col-span-3' :
                    i === 4 ? 'col-span-2' :
                    i === 5 ? 'col-span-1 text-right' : 'col-span-1 text-center'
                  )}>{h}</div>
                ))}
              </div>

              {filtered.map(order => {
                const label = order.tableId || order.customerName || 'Walk-in';
                return (
                  <div
                    key={order._id}
                    className="grid grid-cols-12 px-6 py-5 items-center hover:bg-slate-50/50 transition-colors cursor-pointer group"
                    onClick={() => setDetailOrder(order)}
                  >
                    <div className="col-span-2">
                      <span className="text-sm font-black text-slate-900">#{order.orderNumber ? fmtOrderNo(order.orderNumber) : '—'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-bold text-slate-500">{fmtDate(order.createdAt)}</span>
                      <span className="block text-[11px] text-slate-400 font-bold">{fmtTime(order.createdAt)}</span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-xs font-black text-slate-700 uppercase">{order.orderType === 'Parcel' ? 'Parcel' : 'Dine'}</span>
                    </div>
                    <div className="col-span-3 flex items-center gap-2">
                      {order.orderType === 'Parcel'
                        ? <User size={13} className="text-slate-300 shrink-0"/>
                        : <Utensils size={13} className="text-slate-300 shrink-0"/>
                      }
                      <span className="text-xs font-bold text-slate-600 truncate">{label}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                        order.status === 'Served'   ? 'bg-emerald-50 text-emerald-600' :
                        order.status === 'Pending'  ? 'bg-amber-50 text-amber-600' :
                        order.status === 'Preparing'? 'bg-blue-50 text-blue-600' :
                                                      'bg-orange-50 text-orange-600'
                      )}>
                        {order.status === 'Pending' ? 'Running' : order.status}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-sm font-black text-slate-900">₹{Math.round(order.totalAmount || 0)}</span>
                    </div>
                    <div className="col-span-1 text-center">
                      <button className="inline-flex items-center gap-1 text-[11px] font-black text-[#FF5A36] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Proceed <ArrowUpRight size={12}/>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Order Detail Modal ───────────────────────────────────────── */}
      {detailOrder && (
        <OrderDetailModal
          order={{ ...detailOrder, user }}
          onClose={() => setDetailOrder(null)}
          onProceed={(id) => {
            setDetailOrder(null);
            if (onOrderClick) onOrderClick(id);
          }}
        />
      )}

      {/* ── New Parcel Modal ─────────────────────────────────────────── */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900">New Parcel Order</h3>
              <button onClick={() => setIsAdding(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100">
                <X size={18} className="text-slate-500"/>
              </button>
            </div>
            <form onSubmit={handleCreateParcel} className="px-7 py-6 space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                <input type="text" placeholder="Customer name (optional)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
                  value={newParcel.name} onChange={e => setNewParcel({...newParcel, name: e.target.value})}
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                <input type="text" placeholder="Phone number (optional)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
                  value={newParcel.phone} onChange={e => setNewParcel({...newParcel, phone: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full py-4 bg-[#FF5A36] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-orange-600 transition-all mt-2 shadow-lg shadow-orange-200">
                Create Parcel Order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSInterface;
