import React, { useState, useMemo } from 'react';
import { Package, Plus, ArrowUpRight, Phone, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const ParcelView = ({ activeOrders, onNewParcel, onOrderClick }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const parcels = (activeOrders || []).filter(o =>
    o.orderType === 'Parcel' && o.status !== 'Paid' && o.status !== 'Cancelled'
  );

  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Stats for chip counts
  const stats = useMemo(() => {
    const ready = parcels.filter(o => {
      const items = o.items || [];
      return items.length > 0 && items.every(i => i.isServed);
    });
    const pending = parcels.filter(o => (o.items || []).some(i => !i.isServed));
    return { total: parcels.length, ready: ready.length, pending: pending.length };
  }, [parcels]);

  const filtered = useMemo(() => {
    return parcels.filter(o => {
      const items = o.items || [];
      const allServed = items.length > 0 && items.every(i => i.isServed);

      if (statusFilter === 'Ready' && !allServed) return false;
      if (statusFilter === 'Pending' && allServed) return false;

      if (search) {
        const q = search.toLowerCase();
        if ((o.customerName || '').toLowerCase().includes(q)) return true;
        if (String(o.orderNumber || '').includes(q)) return true;
        if ((o.customerPhone || '').includes(q)) return true;
        return false;
      }

      return true;
    });
  }, [parcels, statusFilter, search]);

  const chips = [
    { key: 'All', label: `All (${stats.total})` },
    { key: 'Pending', label: `Pending (${stats.pending})` },
    { key: 'Ready', label: `Ready (${stats.ready})` },
  ];

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0">
        <span className="text-[17px] font-bold text-slate-900">Parcels Display</span>
        <button
          onClick={onNewParcel}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-xl text-[12px] font-bold active:scale-95 transition-all"
        >
          <Plus size={14} strokeWidth={2.5} />
          New Parcel
        </button>
      </div>

      {/* ── Search bar ── */}
      <div className="flex gap-2.5 px-4 py-2.5 bg-white shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, order..."
            className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[15px] text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="px-4 pb-3 bg-white shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {chips.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border shrink-0 transition-all',
                statusFilter === key
                  ? 'bg-white border-blue-500 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <Package size={28} className="text-slate-300" />
          </div>
          <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
            {search || statusFilter !== 'All' ? 'No matching parcels' : 'No active parcels'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {filtered.map(order => {
            const name = order.customerName || `Parcel   #${String(order.orderNumber).padStart(4, '0')}`; const orderNo = `#${String(order.orderNumber).padStart(4, '0')}`;
            const itemCount = order.items?.length || 0;
            const allServed = itemCount > 0 && (order.items || []).every(i => i.isServed);

            return (
              <div
                key={order._id}
                onClick={() => onOrderClick(order._id)}
                className="border-t border-slate-200 px-4 py-4 cursor-pointer active:bg-slate-50 transition-colors"
              >
                {/* Row 1: name + time */}
                <div className="flex items-start justify-between mb-2">
                  <span className="text-[15px] font-bold text-slate-900 uppercase tracking-tight">
                    {name}
                  </span>
                  <span className="text-[12px] font-semibold text-slate-400 tabular-nums shrink-0 ml-3">
                    {fmtTime(order.createdAt)}
                  </span>
                </div>

                {/* Row 2: order no + phone + items + ready + arrow */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                    <span className="text-[12px] font-medium">{orderNo}</span>
                    {order.customerPhone && (
                      <>
                        <span className="text-slate-200">·</span>
                        <div className="flex items-center gap-1 text-[12px] font-medium">
                          <Phone size={11} />
                          {order.customerPhone}
                        </div>
                      </>
                    )}
                    <span className="text-slate-200">·</span>
                    <span className="text-[12px] font-medium">
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {allServed && (
                      <span className="text-[11px] font-semibold text-emerald-500">Ready</span>
                    )}
                    <ArrowUpRight size={14} className="text-slate-300" />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="border-t border-slate-200" />
        </div>
      )}
    </div>
  );
};

export default ParcelView;