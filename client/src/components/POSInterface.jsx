import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Search, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Utensils,
  ArrowUpRight, AlertCircle, Loader2,
  UtensilsCrossed, User, Package, Flame,
  ChevronRight, Filter, Check
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
  if (mins >= 20) return 'critical';
  if (mins >= 10) return 'warn';
  return 'ok';
};

const OrderCard = ({ order, onToggleServe, onCancelOrder, updatingItems, onManageClick, onBillClick }) => {
  const [expanded, setExpanded] = useState(true);

  const label = order.tableId || order.customerName || 'Walk-in';
  const items = order.items || [];
  const servedCount = items.filter(i => i.isServed).length;
  const totalCount = items.length;
  const isAllServed = totalCount > 0 && servedCount === totalCount;
  const urgency = getUrgency(order.createdAt);
  const isParcel = order.orderType === 'Parcel';
  const progressPct = totalCount > 0 ? Math.round((servedCount / totalCount) * 100) : 0;

  const R = 8;
  const CIRC = 2 * Math.PI * R;
  const dash = (progressPct / 100) * CIRC;

  const ringColor = isAllServed ? '#34d399' : urgency === 'critical' ? '#f87171' : '#60a5fa';
  const timeColor = isAllServed
    ? 'text-emerald-400'
    : urgency === 'critical'
      ? 'text-red-400'
      : 'text-blue-400';

  return (
    <div className="border-t border-slate-200">

      {/* Order header */}
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none "
      // onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] font-bold text-slate-900 uppercase tracking-tight">
            {label}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {isParcel ? 'Parcel' : 'Dine-in'}
          </span>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="10" cy="10" r={R} fill="none" stroke="#e2e8f0" strokeWidth="2" />
            <circle
              cx="10" cy="10" r={R}
              fill="none"
              stroke={ringColor}
              strokeWidth="2"
              strokeDasharray={`${dash} ${CIRC}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>

          {/* <span className={cn('text-[12px] font-semibold tabular-nums', timeColor)}>
            {fmtTimeElapsed(order.createdAt)}
          </span> */}
          {/* 
          {expanded
            ? <ChevronUp size={14} strokeWidth={2} className="text-slate-300" />
            : <ChevronDown size={14} strokeWidth={2} className="text-slate-300" />} */}
        </div>
      </div>

      {/* Expanded: items + actions */}
      {expanded && (
        <>
          {items.map(item => {
            const isServed = item.isServed;
            const isUpdating = updatingItems.has(item._id);
            const qty = item.quantity || item.qty || 1;

            return (
              <div
                key={item._id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 transition-opacity',
                  isServed && 'opacity-35'
                )}
              >
                <button
                  disabled={isUpdating}
                  onClick={e => { e.stopPropagation(); onToggleServe(order._id, item._id, isServed, e); }}
                  className={cn(
                    'w-5 h-5 rounded-[5px] shrink-0 border flex items-center justify-center transition-all',
                    isServed ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300',
                    isUpdating && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isUpdating
                    ? <Loader2 size={11} className="animate-spin text-slate-400" />
                    : isServed && <Check size={11} strokeWidth={3} className="text-white" />}
                </button>

                <span className={cn(
                  'flex-1 text-[13px] font-medium leading-snug',
                  isServed ? 'line-through text-slate-400' : 'text-slate-800'
                )}>
                  {item.name}
                  {item.note && (
                    <span className="ml-1.5 text-[11px] text-slate-400 font-normal">· {item.note}</span>
                  )}
                </span>

                <span className={cn(
                  'text-[12px] font-semibold shrink-0',
                  isServed ? 'text-slate-300' : 'text-slate-500'
                )}>
                  ×{qty}
                </span>
              </div>
            );
          })}

          {/* Action row */}
          <div className="flex items-center gap-2 px-4 pb-4 pt-1">
            <button
              onClick={e => { e.stopPropagation(); onCancelOrder?.(order._id); }}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-500 text-[12px] font-semibold active:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                isAllServed ? onBillClick?.(order) : onManageClick?.(order);
              }}
              className={cn(
                'flex-1 py-2 rounded-lg border border-gray-300 text-[12px] font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all',
                isAllServed
                  ? 'bg-white text-blue-500'
                  : 'bg-white text-slate-900'
              )}
            >
              {isAllServed ? 'Billing' : 'Manage'}
              <ArrowUpRight size={13} />
            </button>
          </div>
        </>
      )}

      {/* Commented out — kept for reference, do not remove */}
      {/* <span className={cn('text-[12px] font-semibold', isAllServed ? 'text-emerald-500' : 'text-slate-400')}>
        {servedCount}/{totalCount}
      </span> */}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const POSInterface = ({ activeOrders, user, onOrderUpdate, onManageClick, onBillClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingItems, setUpdatingItems] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // ── Derived orders (logic unchanged) ──────────────────────────────────────
  const runningOrders = useMemo(() => {
    const active = (activeOrders || []).filter(
      o => o.status !== 'Paid' && o.status !== 'Cancelled'
    );
    active.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return active.filter(o => {
      const items = o.items || [];
      const servedCount = items.filter(i => i.isServed).length;
      const isAllServed = items.length > 0 && servedCount === items.length;

      if (statusFilter === 'Pending' && isAllServed) return false;
      if (statusFilter === 'Done' && !isAllServed) return false;
      if (statusFilter === 'Late') {
        if (isAllServed) return false;
        if (getUrgency(o.createdAt) !== 'critical') return false;
      }

      if (typeFilter === 'Dine-in' && o.orderType !== 'Dine-in') return false;
      if (typeFilter === 'Parcel' && o.orderType !== 'Parcel') return false;

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

  // ── Stats (logic unchanged) ────────────────────────────────────────────────
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

  // ── Handlers (logic unchanged) ─────────────────────────────────────────────
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

  // ── Filter chip config (matches TableView chip pattern exactly) ────────────
  const statusChips = ['All', 'Pending', 'Done'].concat(stats.critical > 0 ? ['Late'] : []);
  const labelMap = {
    All: `All (${stats.total})`,
    Pending: `Pending (${stats.pending})`,
    Done: `Delivered (${stats.done})`,
    Late: `Late (${stats.critical})`,
  };

  const typeChips = ['All', 'Dine-in', 'Parcel'];

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">

      {/* ── Header — same as TableView header ── */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0">
        <span className="text-[17px] font-bold text-slate-900">Kitchen Display</span>
        {/* Live dot pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-200">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Live</span>
        </div>
      </div>

      {/* ── Search bar — identical to TableView / MobileMenuScreen ── */}
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

      {/* ── Status filter chips — same pill style as category chips in TableView ── */}
      <div className="px-4 pb-2 bg-white shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {statusChips.map(status => (
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
          ))}
        </div>
      </div>

      {/* ── Type filter chips — second row, same style ── */}
      {/* <div className="px-4 pb-3 bg-white shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {typeChips.map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border shrink-0 transition-all',
                typeFilter === type
                  ? 'bg-white border-blue-500 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              {type.toUpperCase()}
            </button>
          ))}
        </div>
      </div> */}

      {/* ── Orders ── */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-10 space-y-3"
        style={{ scrollbarWidth: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      >
        {runningOrders.length === 0 ? (
          /* Empty state — matches TableView empty pattern */
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-start">
            {runningOrders.map(order => (
              <OrderCard
                key={order._id}
                order={order}
                onToggleServe={handleToggleServe}
                onCancelOrder={handleCancelOrder}
                updatingItems={updatingItems}
                onManageClick={onManageClick}
                onBillClick={onBillClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSInterface;