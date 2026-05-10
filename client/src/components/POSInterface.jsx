import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Utensils,
  ArrowUpRight, AlertCircle, Loader2,
  UtensilsCrossed, User, Package, Flame,
  ChevronRight, Filter
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtTimeElapsed = (dateString) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
};

const fmtOrderNo = (n) => String(n || '').padStart(4, '0');

const getUrgency = (dateString) => {
  const mins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (mins >= 20) return 'critical'; // red
  if (mins >= 10) return 'warn';     // orange
  return 'ok';                        // slate
};

// ── Order Card Component ───────────────────────────────────────────────────────
const OrderCard = ({ order, onToggleServe, onCancelOrder, updatingItems, onOrderClick }) => {
  const [expanded, setExpanded] = useState(true);
  const contentRef = useRef(null);

  const label = order.tableId || order.customerName || 'Walk-in';
  const items = order.items || [];
  const servedCount = items.filter(i => i.isServed).length;
  const totalCount = items.length;
  const isAllServed = totalCount > 0 && servedCount === totalCount;
  const urgency = getUrgency(order.createdAt);
  const isParcel = order.orderType === 'Parcel';

  const progressPct = totalCount > 0 ? Math.round((servedCount / totalCount) * 100) : 0;

  const urgencyColors = {
    critical: { dot: 'bg-rose-500', time: 'text-rose-600', timeBg: 'bg-rose-50', bar: 'bg-rose-500' },
    warn: { dot: 'bg-orange-500', time: 'text-orange-600', timeBg: 'bg-orange-50', bar: 'bg-orange-500' },
    ok: { dot: 'bg-emerald-500', time: 'text-slate-500', timeBg: 'bg-slate-100', bar: 'bg-blue-500' },
  }[urgency];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300">

      {/* ── Card Header — tappable accordion ── */}
      <div
        className="px-4 pt-4 pb-3 cursor-pointer active:bg-slate-50 transition-colors select-none"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Row 1: Big Table label + type chip + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Table Number / Name */}
            <div className="flex items-center shrink-0">
              <span className="text-[18px] font-black tracking-tight leading-none uppercase text-black">
                {label}
              </span>
            </div>

            {/* Type Chip */}
            <span className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg',
              isParcel
                ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
            )}>
              {isParcel ? 'Parcel' : 'Dine-in'}
            </span>
          </div>

          {/* Time pill */}
          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full',
            urgencyColors.timeBg
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', urgencyColors.dot)} />
            <span className={cn('text-[11px] font-black', urgencyColors.time)}>
              {fmtTimeElapsed(order.createdAt)}
            </span>
          </div>
        </div>

        {/* Row 2: Icon + items + progress + chevron */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            {isParcel ? <Package size={14} /> : <Utensils size={14} />}
            <span className="text-[12px] font-bold text-slate-500">
              {totalCount} {totalCount === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress pill */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full',
              isAllServed ? 'bg-emerald-100' : 'bg-slate-100'
            )}>
              <span className={cn(
                'text-[12px] font-black',
                isAllServed ? 'text-emerald-700' : 'text-slate-600'
              )}>
                {servedCount}/{totalCount} Served
              </span>
            </div>

            {/* Chevron */}
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
              {expanded
                ? <ChevronUp size={14} strokeWidth={2.5} />
                : <ChevronDown size={14} strokeWidth={2.5} />
              }
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', isAllServed ? 'bg-emerald-500' : urgencyColors.bar)}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Accordion Body ── */}
      {expanded && (
        <div className="border-t border-slate-100">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No items</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/80">
              {items.map(item => {
                const isServed = item.isServed;
                const isUpdating = updatingItems.has(item._id);
                const qty = item.quantity || item.qty || 1;

                return (
                  <div
                    key={item._id}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 transition-all duration-200',
                      isServed ? 'bg-slate-50/80' : 'bg-white'
                    )}
                  >
                    {/* Served indicator dot */}
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0 mt-0.5',
                      isServed ? 'bg-emerald-400' : 'bg-orange-400'
                    )} />

                    {/* Item info */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[14px] font-bold leading-tight',
                        isServed ? 'text-slate-400 line-through' : 'text-slate-900'
                      )}>
                        {item.name}
                      </p>
                      {item.note && (
                        <p className="text-[10px] font-bold text-orange-500 mt-0.5 flex items-center gap-1">
                          <AlertCircle size={10} /> {item.note}
                        </p>
                      )}
                    </div>

                    {/* Qty badge */}
                    <span className={cn(
                      'text-[13px] font-black px-2 py-0.5 rounded-lg shrink-0',
                      isServed ? 'text-slate-400 bg-slate-100' : 'text-slate-800 bg-slate-100'
                    )}>
                      ×{qty}
                    </span>

                    {/* Serve toggle button */}
                    <button
                      disabled={isUpdating}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleServe(order._id, item._id, isServed, e);
                      }}
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 shrink-0',
                        isUpdating
                          ? 'bg-slate-100 cursor-not-allowed'
                          : isServed
                            ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white shadow-sm shadow-emerald-100'
                      )}
                    >
                      {isUpdating
                        ? <Loader2 size={15} className="animate-spin text-slate-400" />
                        : isServed
                          ? <XCircle size={16} strokeWidth={2} />
                          : <CheckCircle2 size={16} strokeWidth={2.5} />
                      }
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Card Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-100 flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onCancelOrder && onCancelOrder(order._id); }}
              className="px-4 py-3 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors active:scale-95 shrink-0"
            >
              Cancel
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onOrderClick && onOrderClick(order._id); }}
              className={cn(
                'flex-1 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-all',
                isAllServed
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-900 text-white shadow-md shadow-slate-200'
              )}
            >
              {isAllServed ? 'Billing' : 'Manage'}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const POSInterface = ({ activeOrders, user, onOrderUpdate, onOrderClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Done'
  const [typeFilter, setTypeFilter] = useState('All');     // 'All' | 'Dine-in' | 'Parcel'

  // ── Derived orders ─────────────────────────────────────────────────────────
  const runningOrders = useMemo(() => {
    const active = (activeOrders || []).filter(
      o => o.status !== 'Paid' && o.status !== 'Cancelled'
    );
    active.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return active.filter(o => {
      const items = o.items || [];
      const servedCount = items.filter(i => i.isServed).length;
      const isAllServed = items.length > 0 && servedCount === items.length;

      // Status filter
      if (statusFilter === 'Pending' && isAllServed) return false;
      if (statusFilter === 'Done' && !isAllServed) return false;
      if (statusFilter === 'Late') {
        if (isAllServed) return false;
        if (getUrgency(o.createdAt) !== 'critical') return false;
      }

      // Type filter
      if (typeFilter === 'Dine-in' && o.orderType !== 'Dine-in') return false;
      if (typeFilter === 'Parcel' && o.orderType !== 'Parcel') return false;

      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (String(o.orderNumber || '').includes(q)) return true;
        if ((o.tableId || '').toLowerCase().includes(q)) return true;
        if ((o.customerName || '').toLowerCase().includes(q)) return true;
        const hasItem = (o.items || []).some(item =>
          !item.isServed && item.name.toLowerCase().includes(q)
        );
        return hasItem;
      }

      return true;
    });
  }, [activeOrders, searchTerm, statusFilter, typeFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const all = (activeOrders || []).filter(o => o.status !== 'Paid' && o.status !== 'Cancelled');
    const done = all.filter(o => {
      const items = o.items || [];
      return items.length > 0 && items.every(i => i.isServed);
    });
    const pending = all.filter(o => {
      const items = o.items || [];
      return items.some(i => !i.isServed);
    });
    const critical = all.filter(o => getUrgency(o.createdAt) === 'critical');
    return { total: all.length, done: done.length, pending: pending.length, critical: critical.length };
  }, [activeOrders]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToggleServe = async (orderId, itemId, currentIsServed, e) => {
    e.stopPropagation();
    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      await axios.patch(`/api/orders/${orderId}/items/${itemId}/serve`, { isServed: !currentIsServed });
      if (onOrderUpdate) onOrderUpdate();
    } catch (error) {
      console.error('Error updating item status:', error);
      alert('Failed to update item status');
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axios.patch(`/api/orders/${orderId}/status`, { status: 'Cancelled' });
      if (onOrderUpdate) onOrderUpdate();
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0">
        <span className="text-[17px] font-bold text-slate-900">Kitchen Display</span>
        {/* Live dot */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex gap-2.5 px-4 py-2.5 bg-white shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search tables, items..."
            className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[15px] text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Status filter chips ── */}
      <div className="px-4 pb-3 bg-white shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {['All', 'Pending', 'Done'].concat(stats.critical > 0 ? ['Late'] : []).map(status => {
            const labelMap = { 'All': `ALL (${stats.total})`, 'Pending': `PENDING (${stats.pending})`, 'Done': `DELIVERED (${stats.done})`, 'Late': `LATE (${stats.critical})` };
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border shrink-0 transition-all',
                  statusFilter === status
                    ? 'bg-white border-blue-500 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-600'
                )}
              >
                {labelMap[status]}
              </button>
            );
          })}
        </div>
      </div>



      {/* ── Orders grid / list ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-28 space-y-3"
        style={{ scrollbarWidth: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        {runningOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest text-center px-8">
              {searchTerm || statusFilter !== 'All' || typeFilter !== 'All'
                ? 'No matching orders'
                : 'Kitchen is clear!'}
            </p>
          </div>
        ) : (
          /* On desktop: 2-3 col grid. On mobile: single column */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {runningOrders.map(order => (
              <OrderCard
                key={order._id}
                order={order}
                onToggleServe={handleToggleServe}
                onCancelOrder={handleCancelOrder}
                updatingItems={updatingItems}
                onOrderClick={onOrderClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSInterface;