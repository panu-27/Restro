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

// ── Detail Modal ──────────────────────────────────────────────────────────────
const OrderDetailModal = ({ order, onClose, onSettle, onCancel }) => {
  const [itemsOpen,  setItemsOpen]  = useState(true);
  const [showSettle, setShowSettle] = useState(false);
  const [phone,      setPhone]      = useState(order?.customerPhone || '');
  const [settling,   setSettling]   = useState(false);

  if (!order) return null;

  const sub   = (order.items || []).reduce((s, i) => s + (i.price * (i.quantity || i.qty || 1)), 0);
  const total = order.totalAmount || sub;

  const buildWAMsg = () => [
    `🍽️ *Bill Summary*`,
    `Order #${order.orderNumber || order._id?.slice(-6)}`,
    order.tableId ? `Table: ${order.tableId}` : 'Parcel Order',
    '',
    '*Items:*',
    ...(order.items || []).map(i => `• ${i.name} ×${i.quantity||i.qty||1}  →  ₹${i.price*(i.quantity||i.qty||1)}`),
    '',
    `*Total: ₹${Math.round(total)}*`,
    '',
    'Thank you! 🙏',
  ].join('\n');

  const doSettle = async (mode) => {
    const digits = phone.replace(/\D/g, '');
    if ((mode === 'wa' || mode === 'both') && digits.length < 10) {
      alert('Please enter a valid 10-digit mobile number.'); return;
    }
    setSettling(true);
    await onSettle(order._id, phone);
    if (mode === 'print' || mode === 'both') window.print();
    if (mode === 'wa'    || mode === 'both')
      window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(buildWAMsg())}`, '_blank');
    setSettling(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
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
              <span className="ml-auto text-xs font-bold text-slate-400">#{order.orderNumber || order._id?.slice(-8)}</span>
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

          {/* Bill Delivery Panel — shown after clicking Settle Bill */}
          {showSettle && order.status !== 'Paid' && order.status !== 'Cancelled' && (
            <section className="border-2 border-orange-100 bg-orange-50/40 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">📋 Bill Delivery</p>

              {/* Phone input */}
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15}/>
                <input
                  type="tel"
                  placeholder="Customer mobile number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
                />
              </div>

              {/* 3 action buttons */}
              <div className="grid grid-cols-3 gap-2">
                {/* Print */}
                <button onClick={() => doSettle('print')} disabled={settling}
                  className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 text-slate-700 transition-all active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 6 2 18 2 18 9"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">Print</span>
                </button>

                {/* WhatsApp */}
                <button onClick={() => doSettle('wa')} disabled={settling}
                  className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">WhatsApp</span>
                </button>

                {/* Both */}
                <button onClick={() => doSettle('both')} disabled={settling}
                  className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-[#FF5A36] hover:bg-orange-600 text-white transition-all active:scale-95 shadow-md shadow-orange-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-wider">Both</span>
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Footer Buttons */}
        {order.status !== 'Paid' && order.status !== 'Cancelled' && (
          <div className="px-7 py-5 border-t border-slate-100 flex gap-3">
            <button onClick={() => onCancel(order._id)}
              className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm font-black text-slate-600 hover:bg-slate-50 transition-all">
              Cancel Order
            </button>
            <button
              onClick={() => setShowSettle(s => !s)}
              className={cn(
                'flex-1 py-3.5 rounded-2xl text-sm font-black transition-all shadow-lg',
                showSettle
                  ? 'bg-slate-800 text-white shadow-slate-200'
                  : 'bg-[#FF5A36] text-white hover:bg-orange-600 shadow-orange-200'
              )}>
              {showSettle ? '↑ Hide Options' : 'Settle Bill'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};




// ── Main Component ────────────────────────────────────────────────────────────
const POSInterface = ({ activeOrders, onOrderUpdate, onOrderClick }) => {
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
    <div className="min-h-full bg-[#F8FAFC] p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">

      {/* ── Page Title ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Orders</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Manage all orders of the restaurant.</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF5A36] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 active:scale-95"
        >
          <Plus size={15} strokeWidth={3}/> New Parcel
        </button>
      </div>

      {/* ── Stats Strip ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',  value: stats.total,     valueClass: 'text-white',         card: 'bg-[#FF5A36] shadow-orange-200' },
          { label: 'Running',       value: stats.running,   valueClass: 'text-blue-600',       card: 'bg-white border border-slate-100' },
          { label: 'Completed',     value: stats.completed, valueClass: 'text-emerald-500',    card: 'bg-white border border-slate-100' },
          { label: 'Cancelled',     value: stats.cancelled, valueClass: 'text-rose-500',       card: 'bg-white border border-slate-100' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl px-6 py-4 shadow-sm', s.card)}>
            <p className={cn('text-[10px] font-black uppercase tracking-widest mb-1', s.card.includes('FF5A36') ? 'text-orange-100' : 'text-slate-400')}>{s.label}</p>
            <p className={cn('text-3xl font-black', s.valueClass)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Filter + Search ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Type filters */}
        <div className="flex gap-2">
          {['All', 'Dine-in', 'Parcel'].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn('px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                filterType === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
              )}>{t}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
          <input
            type="text" placeholder="Search orders..."
            className="bg-white border border-slate-100 rounded-xl py-2 pl-9 pr-4 text-sm font-bold w-56 focus:outline-none focus:ring-4 focus:ring-orange-500/5 focus:border-orange-400 transition-all shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── Orders List ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <Activity size={28} className="text-slate-200"/>
            </div>
            <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No running orders</p>
          </div>
        ) : (
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
              const isRunning = order.status !== 'Paid' && order.status !== 'Cancelled';
              const label     = order.tableId || order.customerName || 'Walk-in';
              return (
                <div
                  key={order._id}
                  className="grid grid-cols-12 px-6 py-5 items-center hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => setDetailOrder(order)}
                >
                  {/* Order ID */}
                  <div className="col-span-2">
                    <span className="text-sm font-black text-slate-900">#{order.orderNumber || '—'}</span>
                  </div>
                  {/* Date & Time */}
                  <div className="col-span-2">
                    <span className="text-xs font-bold text-slate-500">{fmtDate(order.createdAt)}</span>
                    <span className="block text-[11px] text-slate-400 font-bold">{fmtTime(order.createdAt)}</span>
                  </div>
                  {/* Type */}
                  <div className="col-span-1">
                    <span className="text-xs font-black text-slate-700 uppercase">{order.orderType === 'Parcel' ? 'Parcel' : 'Dine'}</span>
                  </div>
                  {/* Table / Customer */}
                  <div className="col-span-3 flex items-center gap-2">
                    {order.orderType === 'Parcel'
                      ? <User size={13} className="text-slate-300 shrink-0"/>
                      : <Utensils size={13} className="text-slate-300 shrink-0"/>
                    }
                    <span className="text-xs font-bold text-slate-600 truncate">{label}</span>
                  </div>
                  {/* Status */}
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
                  {/* Amount */}
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-black text-slate-900">₹{Math.round(order.totalAmount || 0)}</span>
                  </div>
                  {/* Action */}
                  <div className="col-span-1 text-center">
                    <button className="inline-flex items-center gap-1 text-[11px] font-black text-[#FF5A36] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      View <ArrowUpRight size={12}/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Order Detail Modal ───────────────────────────────────────── */}
      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={() => setDetailOrder(null)}
          onSettle={async (id, phone) => {
            await axios.patch(`/api/orders/${id}/status`, { status: 'Paid', customerPhone: phone });
            setDetailOrder(null);
            onOrderUpdate();
          }}
          onCancel={(id) => handleStatusUpdate(id, 'Cancelled')}
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
