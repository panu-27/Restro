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
          const initPhones = {};
          active.forEach((o, idx) => {
             const pid = `part-${o._id}`;
             orderIds[pid] = o._id;
             if (o.customerPhone) {
                initPhones[pid] = o.customerPhone;
             }
          });
          
          setParts(loadedParts);
          setPartOrderIds(orderIds);
          setPartPhones(initPhones);
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
          status: 'Pending',
          customerPhone: phoneOf(partId) || ''
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
  const handleSettle = async (partId, mode = 'print') => {
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
    if (phone.length < 10) {
      alert('Please enter a valid 10-digit customer mobile number to finalize the bill.');
      return;
    }
    const hasWA = mode === 'wa' || mode === 'both';
    const doPrint = mode === 'print' || mode === 'both';

    const label = hasWA ? `${bill.total.toFixed(2)} via WhatsApp to +91-${phone}` : `₹${bill.total.toFixed(2)}`;
    const msg   = `Settle ${bill.partLabel}?\n\nTotal: ₹${label}\n\nClick OK to ${hasWA ? 'send WhatsApp bill' : doPrint ? 'print bill' : ''} & settle.\nClick Cancel to go back.`;

    if (!window.confirm(msg)) return;

    try {
      // Save phone number + Mark as Paid on Server
      await axios.patch(`/api/orders/${orderId}/status`, {
        status: 'Paid',
        customerPhone: phone
      });

      // Send WhatsApp if phone provided
      if (hasWA) {
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
      }

      // Print
      if (doPrint) {
        window.print();
      }

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
      <div className="hidden print:block print-only" ref={billRef}>
        <div className="text-center font-black text-sm tracking-[0.3em] uppercase mb-1 pt-4 border-t border-dashed border-gray-400">
          Invoice
        </div>
        <div className="mb-4"></div>
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
           <div className="w-12 h-12 border-4 border-gray-200 border-t-arche-orange-deep rounded-full animate-spin mx-auto mb-4"></div>
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

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
      <div className="grid grid-cols-12 h-full gap-4 relative overflow-hidden">
        
        {/* LEFT COLUMN: ACTIVE ORDERS */}
        <div className="col-span-3 h-full flex flex-col bg-slate-50 border-r border-slate-100 overflow-hidden">
          <div className="flex items-center gap-2 mb-6 p-6">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Active Orders</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 px-6">
             {parts.length === 0 ? (
               <div className="text-center py-10">
                 <Utensils size={32} className="mx-auto mb-3 text-slate-100" />
                 <p className="text-xs font-bold text-slate-300 uppercase">No active orders</p>
               </div>
             ) : (
               parts.map((p, idx) => {
                 const items = allItemsForPart(p.id);
                 const tot   = totalOf(subtotalOf(items), taxListOf(subtotalOf(items)));
                 const isSelected = activePart === idx;
                 
                 return (
                   <button
                     key={p.id}
                     onClick={() => setActivePart(idx)}
                     className={cn(
                       "w-full p-4 rounded-2xl border-2 text-left transition-all duration-300 relative group",
                       isSelected 
                        ? "border-emerald-500 bg-emerald-50/30" 
                        : "border-slate-50 bg-white hover:border-slate-200"
                     )}
                   >
                     <div className="flex justify-between items-start mb-2">
                       <span className={cn(
                         "text-[10px] font-black uppercase tracking-wider",
                         isSelected ? "text-emerald-600" : "text-slate-400"
                       )}>
                         {p.label}
                       </span>
                       <span className={cn(
                         "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                         p.status === 'Served' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                       )}>
                         {p.status || 'Received'}
                       </span>
                     </div>
                     <div className="text-lg font-black text-slate-900 tracking-tighter ">
                       ₹{tot.toFixed(0)}
                     </div>
                     
                     {parts.length > 1 && !isReadOnly && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); removePart(idx); }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-white border border-slate-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm"
                        >
                          <X size={10} strokeWidth={3} />
                        </div>
                     )}
                   </button>
                 );
               })
             )}
          </div>
        </div>

        {/* ── Column 2: Menu ─────────────────────────────────────────── */}
        <div className="col-span-5 bg-white flex flex-col overflow-hidden shadow-sm animate-in fade-in duration-700">
          <div className="p-6 border-b border-slate-50">
            <div className="mb-6">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Menu</h2>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search your cravings..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 transition-all text-sm font-bold placeholder:text-slate-300"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={cn(
                      'shrink-0 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
                      catFilter === cat
                        ? 'bg-[#FF5A36] text-white shadow-lg shadow-orange-200'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {filteredMenu.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-200">
                <Utensils size={48} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm font-black  uppercase tracking-widest">No matching delicacies</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredMenu.map(item => {
                  const inCart = activeCurrent.find(i => i.menuId === item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => !isReadOnly && addItem(item)}
                      className={cn(
                        'flex items-center gap-6 p-5 transition-all cursor-pointer group hover:bg-slate-50/50',
                        isReadOnly && 'opacity-50 cursor-not-allowed',
                        inCart && 'bg-emerald-50/30'
                      )}
                    >
                      <div className="w-20 text-xl font-black text-slate-400  tracking-tighter group-hover:text-slate-900 transition-colors shrink-0">
                        ₹{item.price}
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-orange-200 group-hover:bg-white transition-all">
                        {categoryIcon(item.category)}
                      </div>

                      <div className="flex-1">
                        <h4 className="text-[17px] font-black text-slate-800 tracking-tight  uppercase truncate group-hover:text-orange-700 transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Recommended</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {inCart ? (
                           <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-full p-1.5 shadow-sm">
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQty(item._id, -1); }}
                                className="w-7 h-7 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Minus size={14} strokeWidth={3} />
                              </button>
                              <span className="text-sm font-black w-4 text-center">{inCart.qty}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQty(item._id, 1); }}
                                className="w-7 h-7 bg-[#FF5A36] text-white rounded-full flex items-center justify-center hover:bg-orange-600 shadow-md shadow-orange-100"
                              >
                                <Plus size={14} strokeWidth={3} />
                              </button>
                           </div>
                        ) : (
                          <div className="w-10 h-10 border-2 border-slate-100 rounded-xl flex items-center justify-center group-hover:border-orange-500 transition-colors">
                            <Plus size={18} className="text-slate-200 group-hover:text-orange-500" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Column 3: Order Summary ─────────────────────────────────── */}
        <div className="col-span-4 bg-orange-50/20 rounded-[2.5rem] border border-orange-100/50 flex flex-col overflow-hidden shadow-sm animate-in slide-in-from-right duration-500 m-2">
            <div className="p-8 pb-4 flex justify-between items-start">
               <div>
                  <h3 className="text-xs font-black text-slate-400 tracking-[0.2em] mb-4 uppercase">Current Order</h3>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tighter  uppercase truncate">
                    {activePartData?.label || 'Session'}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tableId || 'Walk-in'}</p>
               </div>
               <div className="flex flex-col items-end gap-2">
                 {isReadOnly && (
                   <div className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase ">
                     Archived
                   </div>
                 )}
                 {!isReadOnly && (
                    <button
                      onClick={addPart}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-[#FF5A36] rounded-full text-[9px] font-black text-white uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-100"
                    >
                      <SplitSquareHorizontal size={12} /> Split Bill
                    </button>
                 )}
               </div>
            </div>

          <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
            {activeCurrent.length === 0 && activePartData?.rounds.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart size={24} className="text-slate-200" />
                </div>
                <h5 className="text-sm font-black text-slate-400  uppercase">Select item from menu</h5>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-1">Waiting for deployment...</p>
              </div>
            )}

            {activePartData?.rounds.map(r => (
              <div key={r.roundNumber} className="relative pl-6 border-l-2 border-emerald-500/20 py-2">
                <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-emerald-500"></div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 ">Deployed • Round {r.roundNumber}</p>
                <div className="space-y-2">
                  {r.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700  uppercase">{i.name} × {i.qty}</span>
                      <span className="font-black text-slate-900 tracking-tight">₹{i.price * i.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {activeCurrent.length > 0 && (
               <div className="relative pl-6 border-l-2 border-amber-500/20 py-2 animate-in fade-in slide-in-from-top-2">
                 <div className="absolute -left-[5px] top-4 w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                 <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 ">Staging • New Items</p>
                 <div className="space-y-4">
                    {activeCurrent.map(item => (
                      <div key={item.menuId} className="flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900  uppercase truncate">{item.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                             <div className="flex items-center gap-2">
                               <button onClick={() => updateQty(item.menuId, -1)} className="p-1 hover:text-rose-500 transition-colors"><Minus size={12} /></button>
                               <span className="text-[11px] font-black">{item.qty}</span>
                               <button onClick={() => updateQty(item.menuId, 1)} className="p-1 hover:text-emerald-500 transition-colors"><Plus size={12} /></button>
                             </div>
                             <span className="text-[10px] font-bold text-slate-400 tracking-tighter">× ₹{item.price}</span>
                          </div>
                        </div>
                        <span className="text-[15px] font-black text-slate-900 tracking-tighter ">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                 </div>
               </div>
            )}
          </div>

          <div className="p-8 bg-white/50 backdrop-blur-sm border-t border-orange-100/50 space-y-4">
            {activeCurrent.length > 0 && (
              <button
                onClick={() => saveRound(currentPartId)}
                className={cn(
                  'w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3',
                  roundMsg
                    ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-100/50'
                )}
              >
                {roundMsg ? <><CheckCircle2 size={16} /> Order Dispatched!</> : <><Package size={16} /> Dispatch to Kitchen</>}
              </button>
            )}

            {activeAllItems.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>₹{activeSub.toFixed(2)}</span>
                  </div>
                  {activeTaxes.map(t => (
                    <div key={t.name} className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter ">
                      <span>{t.name} ({t.pct}%)</span>
                      <span>₹{t.amt.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-baseline pt-4 border-t border-orange-100/50">
                    <span className="text-sm font-black text-orange-900/40  uppercase tracking-widest">Net Payable</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter  underline decoration-emerald-500/20 underline-offset-8 decoration-4">
                      ₹{activeTotal.toFixed(0)}
                    </span>
                  </div>
                </div>

                <div className="relative group">
                   <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={14} />
                   <input
                     type="tel"
                     value={phoneOf(currentPartId)}
                     onChange={e => setPartPhones(prev => ({ ...prev, [currentPartId]: e.target.value }))}
                     placeholder="10-DIGIT MOBILE NUMBER (REQUIRED)"
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-orange-500/50 text-[10px] font-black tracking-widest placeholder:text-slate-300"
                     maxLength={10}
                   />
                </div>

                {!isReadOnly ? (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {/* Print */}
                    <button onClick={() => handleSettle(currentPartId, 'print')}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border border-slate-200 bg-white hover:border-slate-400 text-slate-700 transition-all active:scale-95 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-wider">Print</span>
                    </button>

                    {/* WhatsApp */}
                    <button onClick={() => handleSettle(currentPartId, 'wa')}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-all active:scale-95 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-wider">WhatsApp</span>
                    </button>

                    {/* Both */}
                    <button onClick={() => handleSettle(currentPartId, 'both')}
                      className="flex flex-col items-center justify-center gap-1.5 py-4 rounded-xl bg-[#FF5A36] hover:bg-orange-600 text-white transition-all active:scale-95 shadow-md shadow-orange-200">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      <span className="text-[10px] font-black uppercase tracking-wider">Both</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => window.print()}
                      className="py-3 bg-slate-100 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Printer size={14} /> Reprint
                    </button>
                    {phoneOf(currentPartId).replace(/\D/g, '').length >= 10 && (
                      <button
                        onClick={() => {
                          const bill = buildBill(currentPartId);
                          window.open(`https://wa.me/91${phoneOf(currentPartId).replace(/\D/g, '')}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
                        }}
                        className="py-3 bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </button>
                    )}
                  </div>
                )}
              </div>
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

