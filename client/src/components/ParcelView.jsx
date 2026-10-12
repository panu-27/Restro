import React, { useState, useMemo, useEffect } from 'react';
import { Package, Plus, ArrowUpRight, Phone, Search } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigation } from '../navigation/NavigationManager';

const cn = (...inputs) => twMerge(clsx(inputs));

const ParcelView = ({ activeOrders, onNewParcel, onOrderClick }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const { registerBackInterceptor } = useNavigation();

  useEffect(() => {
    return registerBackInterceptor(() => {
      if (search) {
        setSearch('');
        return true;
      }
      if (statusFilter !== 'All') {
        setStatusFilter('All');
        return true;
      }
      return false;
    });
  }, [search, statusFilter, registerBackInterceptor]);

  const parcels = (activeOrders || []).filter(o =>
    o.orderType === 'Parcel' && o.status !== 'Paid' && o.status !== 'Cancelled'
  );

  const fmtTime = (d) => {
    if (!d) return '';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

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
    <div className="flex flex-col h-full bg-white overflow-hidden font-sans">

      {/* ── Header ── */}
      <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-40 lg:-mx-6 lg:px-10 lg:pb-2 lg:border-b-0 shrink-0">
        <div className="flex items-center justify-between mb-4 lg:mb-2">
          <div className="flex items-center gap-4">
            <h1 className="text-[17px] font-semibold text-slate-900 lg:text-[22px]">Parcels Display</h1>
          </div>
        <button
          onClick={onNewParcel}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 text-white rounded-xl text-[11px] font-semibold uppercase tracking-widest active:scale-95 transition-all"
        >
          <Plus size={14} strokeWidth={2.5} />
          New Parcel
        </button>
        </div>
      </header>

      {/* ── Search bar ── */}
      <div className="flex gap-2.5 px-4 py-3 bg-white shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, order..."
            className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[13px] font-semibold text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="px-4 pb-4 bg-white shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {chips.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap border shrink-0 transition-all',
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
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
            <Package size={28} className="text-slate-300" />
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center px-8">
            {search || statusFilter !== 'All' ? 'No matching parcels' : 'No active parcels'}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3" style={{ scrollbarWidth: 'none' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {filtered.map(order => {
              const name = order.customerName || `Parcel   #${String(order.orderNumber).padStart(4, '0')}`; 
              const orderNo = `#${String(order.orderNumber).padStart(4, '0')}`;
              const itemCount = order.items?.length || 0;
              const allServed = itemCount > 0 && (order.items || []).every(i => i.isServed);

              const headingColors = [
                'text-blue-600', 'text-rose-600', 'text-emerald-600',
                'text-violet-600', 'text-amber-600', 'text-cyan-600',
                'text-fuchsia-600', 'text-indigo-600'
              ];
              const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % headingColors.length;
              const headingColor = headingColors[colorIndex];

              return (
                <div
                  key={order._id}
                  onClick={() => onOrderClick(order._id)}
                  className="bg-white border border-slate-200 rounded-2xl p-4 cursor-pointer hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] active:scale-[0.98] transition-all flex flex-col gap-3"
                >
                  {/* Row 1: name + order no */}
                  <div className="flex items-start justify-between">
                    <span className={cn("text-[13px] font-semibold uppercase tracking-widest", headingColor)}>
                      {name}
                    </span>
                    <span className="text-[13px] font-semibold text-slate-900 uppercase tracking-widest tabular-nums shrink-0 ml-3">
                      {orderNo}
                    </span>
                  </div>

                  {/* Row 2: time + phone + items + ready + arrow */}
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <div className="flex items-center gap-2 text-slate-400 flex-wrap">
                      <span className="text-[11px] font-semibold tracking-widest uppercase">{fmtTime(order.createdAt)}</span>
                      {order.customerPhone && (
                        <>
                          <span className="text-slate-200">·</span>
                          <div className="flex items-center gap-1 text-[11px] font-semibold">
                            <Phone size={11} />
                            {order.customerPhone}
                          </div>
                        </>
                      )}
                      <span className="text-slate-200">·</span>
                      <span className="text-[11px] font-semibold">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {allServed && (
                        <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-widest">Ready</span>
                      )}
                      <ArrowUpRight size={14} className="text-slate-300" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParcelView;