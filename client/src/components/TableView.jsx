import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  X, Plus, Minus, Search, Printer, MessageCircle,
  ShoppingCart, Phone, Leaf, Flame,
  Coffee, IceCream, Utensils, ArrowLeft, CreditCard, Users, SplitSquareHorizontal,
  Package, CheckCircle2, History
} from 'lucide-react';

// ─── Utility ─────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

const categoryIcon = (cat) => {
  switch (cat) {
    case 'Veg':     return <Leaf   size={12} className="text-emerald-500" />;
    case 'Non-Veg': return <Flame  size={12} className="text-rose-500" />;
    case 'Beverage':return <Coffee size={12} className="text-amber-500" />;
    case 'Dessert': return <IceCream size={12} className="text-purple-500" />;
    default:        return <Utensils size={12} className="text-gray-400" />;
  }
};

// ─── Part factory ─────────────────────────────────────────────────────────
let _counter = 1;
const newPart = (n) => ({
  id: `part-${Date.now()}-${_counter++}`,
  label: `Part ${n}`,
  rounds: [],   // [{ roundNumber, items:[{menuId,name,price,qty}] }]
});

// ─── Main Component ───────────────────────────────────────────────────────
const TableView = ({ tableId, orderId, isHistoryView, menuItems = [], user, onClose, onCheckoutComplete }) => {

  // ── State ─────────────────────────────────────────────────────────────
  const [parts,       setParts]       = useState([]);
  const [activePart,  setActivePart]  = useState(0);
  const [roundItems,  setRoundItems]  = useState({}); // partId → [{menuId,name,price,qty}]
  const [partPhones,  setPartPhones]  = useState({}); // partId → phone string
  const [partOrderIds, setPartOrderIds] = useState({}); // partId → server order._id
  const [roundMsg,    setRoundMsg]    = useState(false);
  const [search,      setSearch]      = useState('');
  const [catFilter,   setCatFilter]   = useState('All');
  const [settled,     setSettled]     = useState(false); // success screen
  const [loading,     setLoading]     = useState(true);
  const billRef = useRef(null);

  // ── Sync with Backend On Mount ─────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let active = [];
        if (orderId) {
          // Fetch specific order detail (works for both active and paid)
          const res = await axios.get(`/api/orders/${orderId}`);
          active = [res.data];
        } else if (tableId) {
          // Fetch all active orders for this table
          const res = await axios.get('/api/orders/active');
          active = res.data.filter(o => o.tableId === tableId && o.orderType === 'Dine-in');
        }

        if (active.length > 0) {
          const loadedParts = active.map((o, idx) => ({
            id: `part-${o._id}`,
            label: o.partLabel || (o.orderType === 'Parcel' ? o.customerName || `Parcel #${idx+1}` : `Part ${idx + 1}`),
            rounds: [{ roundNumber: 1, items: o.items.map(i => ({ ...i, qty: i.quantity })) }],
            status: o.status
          }));
          const orderIds = {};
          active.forEach((o, idx) => orderIds[`part-${o._id}`] = o._id);
          
          setParts(loadedParts);
          setPartOrderIds(orderIds);
        } else {
          // New session for a table
          const p1 = newPart(1);
          if (tableId) p1.label = `Table ${tableId.replace('Table ', '')}`;
          setParts([p1]);
        }
      } catch (err) {
        console.error('Failed to init TableView:', err);
        setParts([newPart(1)]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [tableId, orderId]);

  // ── Tax config ────────────────────────────────────────────────────────
  const taxEnabled = user?.taxEnabled || false;
  const taxes      = (user?.taxes || []).filter(t => t.enabled);

  // ── Menu derived ──────────────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = [...new Set((menuItems || []).map(i => i.category).filter(Boolean))];
    return ['All', ...cats];
  }, [menuItems]);

  const filteredMenu = useMemo(() =>
    (menuItems || []).filter(item => {
      if (item.isAvailable === false) return false;
      const inSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const inCat    = catFilter === 'All' || item.category === catFilter;
      return inSearch && inCat;
    }),
  [menuItems, search, catFilter]);

  // ── Helpers ───────────────────────────────────────────────────────────
  const currentPartId   = parts[activePart]?.id;
  const currentRoundOf  = (partId) => roundItems[partId] || [];
  const phoneOf         = (partId) => partPhones[partId] || '';

  const allItemsForPart = (partId) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return [];
    const saved   = part.rounds.flatMap(r => r.items);
    const current = currentRoundOf(partId);
    const merged  = [...saved];
    current.forEach(ci => {
      const ex = merged.find(m => m.menuId === ci.menuId);
      if (ex) ex.qty += ci.qty;
      else merged.push({ ...ci });
    });
    return merged;
  };

  const subtotalOf = (items) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const taxListOf  = (sub)   =>
    taxEnabled
      ? taxes.map(t => ({ name: t.name, pct: t.percentage, amt: +(sub * t.percentage / 100).toFixed(2) }))
      : [];
  const totalOf    = (sub, txList) => +(sub + txList.reduce((s, t) => s + t.amt, 0)).toFixed(2);

  // ── Part operations ───────────────────────────────────────────────────
  const addPart = () => {
    const n = parts.length + 1;
    const p = newPart(n);
    setParts(prev => [...prev, p]);
    setActivePart(parts.length);
  };

  const removePart = (idx) => {
    if (parts.length === 1) return;
    setParts(prev  => prev.filter((_, i) => i !== idx));
    setActivePart(prev => (prev >= idx && prev > 0 ? prev - 1 : prev));
  };

  // ── Cart operations ───────────────────────────────────────────────────
  const addItem = (item) => {
    setRoundItems(prev => {
      const list = prev[currentPartId] || [];
      const ex   = list.find(i => i.menuId === item._id);
      if (ex) return { ...prev, [currentPartId]: list.map(i => i.menuId === item._id ? { ...i, qty: i.qty + 1 } : i) };
      return { ...prev, [currentPartId]: [...list, { menuId: item._id, name: item.name, price: item.price, qty: 1 }] };
    });
  };

  const updateQty = (menuId, delta) => {
    setRoundItems(prev => {
      const list = (prev[currentPartId] || [])
        .map(i => i.menuId === menuId ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0);
      return { ...prev, [currentPartId]: list };
    });
  };

  const saveRound = async (partId) => {
    const items = currentRoundOf(partId);
    if (!items.length) return;
    
    try {
      const orderId = partOrderIds[partId];
      if (orderId) {
        // PATCH existing order
        const res = await axios.patch(`/api/orders/${orderId}/add-items`, { items: items.map(i => ({ ...i, quantity: i.qty })) });
        // Update local rounds
        setParts(prev => prev.map(p => {
          if (p.id !== partId) return p;
          return { ...p, rounds: [...p.rounds, { roundNumber: p.rounds.length + 1, items: [...items] }] };
        }));
      } else {
        // POST new order
        const orderPayload = {
          orderType: tableId ? 'Dine-in' : 'Parcel',
          partLabel: parts.find(p => p.id === partId)?.label || 'Part 1',
          items: items.map(i => ({ ...i, quantity: i.qty })),
          status: 'Pending'
        };
        if (tableId) orderPayload.tableId = tableId;
        
        const res = await axios.post('/api/orders', orderPayload);
        setPartOrderIds(prev => ({ ...prev, [partId]: res.data._id }));
        setParts(prev => prev.map(p => {
          if (p.id !== partId) return p;
          return { ...p, rounds: [{ roundNumber: 1, items: [...items] }] };
        }));
      }

      setRoundItems(prev => ({ ...prev, [partId]: [] }));
      setRoundMsg(true);
      setTimeout(() => setRoundMsg(false), 2000);
    } catch (err) {
      console.error('Failed to save round:', err);
      alert('Error saving round to database.');
    }
  };

  // ── Bill / WA message builders ────────────────────────────────────────
  const buildBill = (partId) => {
    const part   = parts.find(p => p.id === partId);
    const items  = allItemsForPart(partId);
    const sub    = subtotalOf(items);
    const txList = taxListOf(sub);
    const total  = totalOf(sub, txList);
    return {
      tableId,
      partLabel: part?.label || 'Bill',
      items, sub, txList, total,
      restaurantName:    user?.restaurantName    || 'Restaurant',
      restaurantAddress: user?.restaurantAddress || '',
      restaurantPhone:   user?.restaurantPhone   || '',
      gstNumber:         user?.gstNumber         || '',
      fssaiNumber:       user?.fssaiNumber       || '',
      timestamp: new Date().toLocaleString('en-IN'),
    };
  };

  const waMessage = (bill) =>
    [
      `🍽️ *${bill.restaurantName}*`,
      bill.restaurantAddress ? `📍 ${bill.restaurantAddress}` : '',
      '',
      `*${bill.tableId} | ${bill.partLabel}*`,
      `🕐 ${bill.timestamp}`,
      '',
      `📋 *Order*`,
      ...bill.items.map(i => `  ${i.name} × ${i.qty}  →  ₹${(i.price * i.qty).toFixed(2)}`),
      '',
      `Subtotal: ₹${bill.sub.toFixed(2)}`,
      ...bill.txList.map(t => `${t.name} (${t.pct}%): ₹${t.amt.toFixed(2)}`),
      `*Total: ₹${bill.total.toFixed(2)}*`,
      '',
      `Thank you! 🙏`,
    ].filter(l => l !== undefined).join('\n');

  // ── ONE-CLICK SETTLE ──────────────────────────────────────────────────
  const handleSettle = async (partId) => {
    // Auto-save any unsaved round items
    const unsaved = currentRoundOf(partId);
    if (unsaved.length > 0) {
       // Wait for save before settling
       await saveRound(partId);
    }

    const bill  = buildBill(partId);
    const orderId = partOrderIds[partId];
    
    if (!orderId) {
      alert("No saved items to settle! Please add items and 'Save Round' first.");
      return;
    }

    const phone = phoneOf(partId).replace(/\D/g, '');
    const hasWA = phone.length >= 10;

    const label = hasWA ? `${bill.total.toFixed(2)} via WhatsApp to +91-${phone}` : `₹${bill.total.toFixed(2)}`;
    const msg   = `Settle ${bill.partLabel}?\n\nTotal: ₹${label}\n\nClick OK to ${hasWA ? 'send WhatsApp bill &' : ''} print & settle.\nClick Cancel to go back.`;

    if (!window.confirm(msg)) return;

    try {
      // Mark as Paid on Server
      await axios.patch(`/api/orders/${orderId}/status`, { status: 'Paid' });

      // Send WhatsApp if phone provided
      if (hasWA) {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
      }

      // Print
      window.print();

      // Settle part — remove it (or close table if last part)
      const idx      = parts.findIndex(p => p.id === partId);
      const newParts = parts.filter(p => p.id !== partId);

      if (newParts.length === 0) {
        // Last part — show success then close
        setSettled(true);
        setTimeout(() => {
          onCheckoutComplete?.();
          onClose?.();
        }, 1800);
        return;
      }
      setParts(newParts);
      setActivePart(Math.min(idx, newParts.length - 1));

    } catch (err) {
      console.error('Settlement failed:', err);
      alert('Error finalizing payment on server.');
    }
  };

  // ── Print area ref (hidden, for CSS @media print) ─────────────────────
  const PrintBill = ({ partId }) => {
    const bill = buildBill(partId);
    return (
      <div className="print-only" ref={billRef}>
        <div className="text-center mb-3 pb-3 border-b border-dashed border-gray-400">
          <p className="font-black text-lg">{bill.restaurantName}</p>
          {bill.restaurantAddress && <p className="text-xs">{bill.restaurantAddress}</p>}
          {bill.restaurantPhone   && <p className="text-xs">📞 {bill.restaurantPhone}</p>}
          {bill.gstNumber         && <p className="text-xs">GSTIN: {bill.gstNumber}</p>}
          {bill.fssaiNumber       && <p className="text-xs">FSSAI: {bill.fssaiNumber}</p>}
        </div>
        <div className="flex justify-between text-xs mb-1">
          <span>ID: <b>{bill.tableId || bill.partLabel}</b></span>
          <span>{bill.partLabel}</span>
        </div>
        <p className="text-xs text-gray-400 mb-3">{bill.timestamp}</p>
        {bill.items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm mb-1">
            <span>{item.name} × {item.qty}</span>
            <span>₹{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
          <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{bill.sub.toFixed(2)}</span></div>
          {bill.txList.map((t, i) => (
            <div key={i} className="flex justify-between text-xs text-gray-500">
              <span>{t.name} ({t.pct}%)</span><span>₹{t.amt.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-dashed border-gray-400">
            <span>TOTAL</span><span>₹{bill.total.toFixed(2)}</span>
          </div>
        </div>
        <p className="text-center text-xs mt-4 pt-3 border-t border-dashed border-gray-400">Thank you! Visit again 🙏</p>
      </div>
    );
  };

  // ── LOADING ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
           <div className="w-12 h-12 border-4 border-gray-200 border-t-arche-blue-deep rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hydrating table state...</p>
        </div>
      </div>
    );
  }

  // ── Success screen ────────────────────────────────────────────────────
  if (settled) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">All settled! 🎉</h2>
          <p className="text-gray-400">{tableId} is now free.</p>
        </div>
      </div>
    );
  }

  // ── Derived for active part ───────────────────────────────────────────
  const activePartData    = parts[activePart];
  const isReadOnly        = activePartData?.status === 'Paid' || activePartData?.status === 'Cancelled' || isHistoryView;
  const activeAllItems    = activePartData ? allItemsForPart(activePartData.id) : [];
  const activeCurrent     = currentRoundOf(currentPartId);
  const activeSub         = subtotalOf(activeAllItems);
  const activeTaxes       = taxListOf(activeSub);
  const activeTotal       = totalOf(activeSub, activeTaxes);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gray-50 flex flex-col font-outfit overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 no-print">
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black text-gray-900 truncate">{tableId ? 'Table View' : 'Parcel View'}</h1>
          <p className="text-xs text-gray-400 font-medium">
            {tableId || parts[0]?.label || 'Loading...'}
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={addPart}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold text-gray-700 transition-colors"
          >
            <SplitSquareHorizontal size={14} /> Split Bill
          </button>
        )}
      </div>

      {/* ── Parts Tab Bar ─────────────────────────────────────────────── */}
      {parts.length > 1 && (
        <div className="bg-white border-b border-gray-100 px-6 no-print">
          <div className="flex gap-2 overflow-x-auto pb-1 pt-2">
            {parts.map((p, idx) => {
              const items = allItemsForPart(p.id);
              const tot   = totalOf(subtotalOf(items), taxListOf(subtotalOf(items)));
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePart(idx)}
                  className={cn(
                    'flex items-center gap-2 shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all border',
                    activePart === idx
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  )}
                >
                  <Users size={13} />
                  {p.label}
                  {items.length > 0 && (
                    <span className={cn(
                      'text-xs font-black px-2 py-0.5 rounded-full',
                      activePart === idx ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    )}>
                      ₹{tot.toFixed(0)}
                    </span>
                  )}
                  <span
                    onClick={(e) => { e.stopPropagation(); removePart(idx); }}
                    className={cn(
                      'w-4 h-4 flex items-center justify-center rounded-full text-xs cursor-pointer hover:bg-red-500 hover:text-white transition-colors',
                      activePart === idx ? 'text-white/60' : 'text-gray-400'
                    )}
                  >×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden no-print">

        {/* Menu ───────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search + categories */}
          <div className="p-4 space-y-3">
            {isReadOnly && (
              <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg">
                    <History size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Archive Record</p>
                    <p className="text-xs font-bold text-white uppercase italic">Read-Only Session</p>
                  </div>
                </div>
                <div className="bg-emerald-500/20 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  Paid
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3">
              <Search size={16} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search menu…"
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 outline-none placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={cn(
                    'shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all border',
                    catFilter === cat
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {filteredMenu.length === 0 ? (
              <div className="text-center py-16 text-gray-300">
                <Utensils size={32} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-sm">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredMenu.map(item => {
                  const inCart = activeCurrent.find(i => i.menuId === item._id);
                  return (
                    <button
                      key={item._id}
                      onClick={() => !isReadOnly && addItem(item)}
                      className={cn(
                        'relative p-3 rounded-2xl border-2 text-left transition-all duration-150 active:scale-[0.97]',
                        isReadOnly ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' :
                        inCart
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                      )}
                    >
                      <div className="flex items-center gap-1 mb-2">{categoryIcon(item.category)}</div>
                      <div className="text-xs font-bold leading-tight mb-1">{item.name}</div>
                      <div className={cn('text-xs font-black', inCart ? 'text-white/70' : 'text-gray-400')}>
                        ₹{item.price}
                      </div>
                      {inCart && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-white text-gray-900 rounded-full flex items-center justify-center text-[10px] font-black">
                          {inCart.qty}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart / Order Panel ──────────────────────────────────────── */}
        <div className="w-80 xl:w-96 bg-white border-l border-gray-100 flex flex-col">

          {/* Panel header */}
          <div className="px-5 pt-5 pb-4 border-b border-gray-50 bg-gray-50/50">
            <h3 className="font-black text-gray-900 mb-0.5">{orderId ? parts[0]?.label : (activePartData?.label || 'Order')}</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{tableId || 'Takeaway'}</p>
          </div>

          {/* Saved rounds */}
          {activePartData?.rounds.length > 0 && (
            <div className="px-5 py-3 border-b border-gray-50 space-y-1">
              {activePartData.rounds.map(r => (
                <div key={r.roundNumber} className="text-xs text-gray-400">
                  <span className="font-bold text-gray-500">Round {r.roundNumber}</span>
                  {' · '}
                  {r.items.map(i => `${i.name}×${i.qty}`).join(', ')}
                </div>
              ))}
            </div>
          )}

          {/* Current round */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
            {activeCurrent.length === 0 && activeAllItems.length === 0 && (
              <div className="text-center py-12 text-gray-300">
                <ShoppingCart size={28} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No items yet</p>
                <p className="text-xs">Tap menu to add</p>
              </div>
            )}

            {activeCurrent.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">New Round</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                {activeCurrent.map(item => (
                  <div key={item.menuId} className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.menuId, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      ><Minus size={12} /></button>
                      <span className="text-sm font-black w-5 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.menuId, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      ><Plus size={12} /></button>
                    </div>
                    <span className="text-sm font-black text-gray-900 w-14 text-right">
                      ₹{(item.price * item.qty).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">

            {/* Save Round */}
            {activeCurrent.length > 0 && (
              <button
                onClick={() => saveRound(currentPartId)}
                className={cn(
                  'w-full py-3 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2',
                  roundMsg
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-900 text-white hover:bg-black'
                )}
              >
                {roundMsg ? <><CheckCircle2 size={15} /> {orderId ? 'Confirmed!' : 'Saved!'}</> : <><Package size={15} /> {orderId ? 'Confirm Items' : 'Save Round'}</>}
              </button>
            )}

            {/* Bill summary */}
            {activeAllItems.length > 0 && (
              <>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Subtotal ({activeAllItems.reduce((s, i) => s + i.qty, 0)} items)</span>
                    <span>₹{activeSub.toFixed(2)}</span>
                  </div>
                  {activeTaxes.map(t => (
                    <div key={t.name} className="flex justify-between text-xs text-gray-400">
                      <span>{t.name} ({t.pct}%)</span>
                      <span>₹{t.amt.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-black text-base pt-1.5 border-t border-gray-100">
                    <span>Total</span>
                    <span className="text-emerald-600">₹{activeTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Phone for WhatsApp (optional) */}
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    value={phoneOf(currentPartId)}
                    onChange={e =>
                      setPartPhones(prev => ({ ...prev, [currentPartId]: e.target.value }))
                    }
                    placeholder="Phone for WhatsApp (optional)"
                    maxLength={10}
                    className="flex-1 bg-transparent text-xs font-medium text-gray-800 outline-none placeholder:text-gray-400"
                  />
                  {phoneOf(currentPartId).replace(/\D/g, '').length >= 10 && (
                    <MessageCircle size={13} className="text-green-500 shrink-0" />
                  )}
                </div>

                {/* ONE-CLICK SETTLE */}
                {!isReadOnly ? (
                  <button
                    onClick={() => handleSettle(currentPartId)}
                    disabled={activeAllItems.length === 0}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200"
                  >
                    {phoneOf(currentPartId).replace(/\D/g, '').length >= 10
                      ? <><MessageCircle size={15} /> {orderId ? 'WhatsApp & Checkout' : 'WhatsApp & Settle'}</>
                      : <><Printer size={15} /> {orderId ? 'Print & Checkout' : 'Print & Settle'}</>
                    }
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => window.print()}
                      className="w-full py-3 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                    >
                      <Printer size={15} /> Reprint Record
                    </button>
                    {phoneOf(currentPartId).replace(/\D/g, '').length >= 10 && (
                      <button
                        onClick={() => {
                          const bill = buildBill(currentPartId);
                          window.open(`https://wa.me/91${phoneOf(currentPartId).replace(/\D/g, '')}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
                        }}
                        className="w-full py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={15} /> Resend WhatsApp
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Hidden print layout — always rendered, only visible on print */}
      {activePartData && (
        <PrintBill partId={activePartData.id} />
      )}
    </div>
  );
};

export default TableView;
