import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  X, Plus, Minus, Search, Printer, MessageCircle,
  ShoppingCart, Phone, Leaf, Flame,
  Coffee, IceCream, Utensils, ArrowLeft, ArrowRight, CreditCard, Users, SplitSquareHorizontal,
  Package, CheckCircle2, History
} from 'lucide-react';

// ─── Utility ─────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');
const formatOrderDisplay = (orderNumber, orderId) => {
  if (typeof orderNumber === 'number' && Number.isFinite(orderNumber)) {
    return `#${String(orderNumber).padStart(4, '0')}`;
  }
  if (orderId) return `#${String(orderId).slice(-8).toUpperCase()}`;
  return '—';
};

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
  const [partOrderNumbers, setPartOrderNumbers] = useState({}); // partId → server orderNumber
  const [roundMsg,    setRoundMsg]    = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
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
          const orderNumbers = {};
          const initPhones = {};
          active.forEach((o, idx) => {
             const pid = `part-${o._id}`;
             orderIds[pid] = o._id;
             orderNumbers[pid] = o.orderNumber;
             if (o.customerPhone) {
                initPhones[pid] = o.customerPhone;
             }
          });
          
          setParts(loadedParts);
          setPartOrderIds(orderIds);
          setPartOrderNumbers(orderNumbers);
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

  const saveRound = async (partId, options = {}) => {
    const { closeAfterSave = false } = options;
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
        setPartOrderNumbers(prev => ({ ...prev, [partId]: res.data.orderNumber }));
        setParts(prev => prev.map(p => {
          if (p.id !== partId) return p;
          return { ...p, rounds: [{ roundNumber: 1, items: [...items] }] };
        }));
      }

      setRoundItems(prev => ({ ...prev, [partId]: [] }));
      setRoundMsg(true);
      setTimeout(() => setRoundMsg(false), 2000);
      if (closeAfterSave) {
        setIsDispatching(true);
        setTimeout(() => {
          onClose?.();
        }, 170);
      }
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
      orderId:           partOrderIds[partId]    || '',
      orderNumber:       partOrderNumbers[partId],
      timestamp: new Date().toLocaleString('en-IN'),
    };
  };

  const waMessage = (bill) =>
    [
      `🏨 *${bill.restaurantName}*`,
      bill.restaurantAddress ? `📍 ${bill.restaurantAddress}` : undefined,
      bill.restaurantPhone ? `📞 ${bill.restaurantPhone}` : undefined,
      '',
      `🧾 *I N V O I C E*`,
      `Order ID: ${formatOrderDisplay(bill.orderNumber, bill.orderId)}`,
      '',
      ...bill.items.map(i => `  ${i.name} × ${i.qty}  →  ₹${(i.price * i.qty).toFixed(2)}`),
      '',
      ...(bill.txList.length > 0 ? [
        `Subtotal: ₹${bill.sub.toFixed(2)}`,
        ...bill.txList.map(t => `${t.name} (${t.pct}%): ₹${t.amt.toFixed(2)}`)
      ] : []),
      `*TOTAL: ₹${bill.total.toFixed(2)}*`,
      '',
      `Thank you! Visit again 🙏`,
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

    const hasWA = mode === 'wa' || mode === 'both';
    const doPrint = mode === 'print' || mode === 'both';
    const phone = phoneOf(partId).replace(/\D/g, '');
    const requiresPhoneForPrint = user?.printMobileRequired !== false;
    const requiresPhone = hasWA || (doPrint && requiresPhoneForPrint);
    if (requiresPhone && phone.length < 10) {
      alert('Please enter a valid 10-digit customer mobile number.');
      return;
    }

    try {
      // Save phone number + Mark as Paid on Server
      await axios.patch(`/api/orders/${orderId}/status`, {
        status: 'Paid',
        customerPhone: phone.length >= 10 ? phone : ''
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
      <div className="hidden print:block print-only font-sans" ref={billRef}>
        <div className="text-center font-black text-xl mb-1">{bill.restaurantName}</div>
        {bill.restaurantAddress && <div className="text-center text-sm mb-1">{bill.restaurantAddress}</div>}
        {bill.restaurantPhone && <div className="text-center text-sm mb-3">Ph: {bill.restaurantPhone}</div>}
        
        <div className="border-t border-dashed border-gray-400 my-2"></div>
        <div className="relative my-3">
          <div className="text-center font-black text-base tracking-[0.3em] uppercase">
            Invoice
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-[65%] text-sm text-slate-700">
            Order ID: {formatOrderDisplay(bill.orderNumber, bill.orderId)}
          </div>
        </div>
        
        {bill.items.map((item, i) => (
          <div key={i} className="flex justify-between text-base mb-1.5">
            <span>{item.name} × {item.qty}</span>
            <span>₹{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        
        <div className="border-t border-dashed border-gray-400 mt-3 pt-3">
          <div className="flex justify-between font-black text-xl mb-3">
            <span>TOTAL</span><span>₹{bill.total.toFixed(2)}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 mb-3"></div>
        </div>
        
        <p className="text-center text-sm mt-4">Thank you! Visit again 🙏</p>
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
    <div
      className={cn(
        "h-screen bg-[#f8f7f5] flex flex-col overflow-hidden font-sans transition-all duration-150",
        isDispatching && "opacity-0 -translate-y-1 scale-[0.995]"
      )}
    >

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="px-5 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors shrink-0"
          >
            <ArrowLeft size={18} className="text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-1">{tableId ? 'Table view' : 'Parcel view'}</h1>
            <p className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">
              {tableId || parts[0]?.label || 'Loading...'}
            </p>
          </div>
        </div>
        
        {!isReadOnly && parts.length > 0 && (
           <button
             onClick={addPart}
             className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
           >
             Split bill
           </button>
        )}
      </div>

      <div className="mx-5 border-b border-slate-200 no-print"></div>

      {/* ── Parts Tab Bar ─────────────────────────────────────────────── */}
      {parts.length > 1 && (
        <div className="px-5 no-print">
          <div className="flex gap-2 overflow-x-auto pb-2 pt-3 no-scrollbar">
            {parts.map((p, idx) => {
              const items = allItemsForPart(p.id);
              const tot   = totalOf(subtotalOf(items), taxListOf(subtotalOf(items)));
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePart(idx)}
                  className={cn(
                    'flex items-center gap-2 shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all border',
                    activePart === idx
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <Users size={13} />
                  {p.label}
                  {items.length > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      activePart === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    )}>
                      ₹{tot.toFixed(0)}
                    </span>
                  )}
                  <span
                    onClick={(e) => { e.stopPropagation(); removePart(idx); }}
                    className={cn(
                      'w-4 h-4 flex items-center justify-center rounded-full text-xs cursor-pointer transition-colors',
                      activePart === idx ? 'text-white/60 hover:text-white hover:bg-red-500' : 'text-slate-400 hover:text-red-500'
                    )}
                  >×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 flex-1 relative overflow-y-auto lg:overflow-hidden gap-0 lg:gap-4 pb-0 no-print">
        
        {/* LEFT COLUMN: ACTIVE ORDERS */}
        <div className="hidden lg:flex lg:col-span-3 h-full flex-col bg-slate-50 border-r border-slate-100 overflow-hidden">
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
        <div className="lg:col-span-5 flex flex-col lg:overflow-hidden bg-[#f8f7f5] lg:bg-white border-b border-slate-200 lg:border-none">
          <div className="px-5 pt-2 pb-4 lg:sticky lg:top-0 z-10 bg-[#f8f7f5] lg:bg-white">
            <h2 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Menu</h2>
            <div className="mb-4">
              <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search your cravings..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-400 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={cn(
                      'shrink-0 px-5 py-2 rounded-xl text-sm transition-colors border',
                      catFilter === cat
                        ? 'bg-[#ff5a36] text-white border-[#ff5a36] font-medium'
                        : 'bg-transparent text-slate-600 border-slate-200 hover:border-slate-300'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto no-scrollbar px-5">
            {filteredMenu.length === 0 ? (
              <div className="py-20 lg:h-full flex flex-col items-center justify-center text-slate-400">
                <Utensils size={32} strokeWidth={1} className="mb-4 opacity-50" />
                <p className="text-sm font-medium tracking-tight">No matching delicacies</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pb-4">
                {filteredMenu.map(item => {
                  const inCart = activeCurrent.find(i => i.menuId === item._id);
                  return (
                    <div
                      key={item._id}
                      onClick={() => !isReadOnly && addItem(item)}
                      className={cn(
                        'flex items-center gap-4 p-3.5 bg-white border border-slate-200 rounded-2xl transition-all cursor-pointer hover:border-slate-300',
                        isReadOnly && 'opacity-50 cursor-not-allowed',
                        inCart && 'border-[#ff5a36] bg-orange-50 shadow-[0_0_0_1px_rgba(255,90,54,0.15)]'
                      )}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center shrink-0",
                        inCart && "bg-orange-100"
                      )}>
                        {categoryIcon(item.category)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className={cn(
                          "text-[15px] font-medium text-slate-800 tracking-tight truncate",
                          inCart && "text-[#c2410c] font-semibold"
                        )}>
                          {item.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">Recommended</p>
                      </div>

                      <div className="flex items-center justify-end gap-3 w-auto shrink-0 pl-2">
                        <span className="text-[15px] font-medium text-slate-800">
                          ₹{item.price}
                        </span>
                        {inCart ? (
                           <div className="flex items-center gap-2.5">
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQty(item._id, -1); }}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="text-sm font-semibold w-3 text-center">{inCart.qty}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); updateQty(item._id, 1); }}
                                className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50"
                              >
                                <Plus size={14} />
                              </button>
                           </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                            <Plus size={16} strokeWidth={2} />
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
        <div className="lg:h-auto lg:col-span-4 bg-[#f8f7f5] flex flex-col lg:z-20 lg:sticky lg:bottom-0 lg:static px-5 pt-5 pb-8 min-h-screen lg:min-h-0 lg:border-t lg:border-slate-200">
            <div className="flex justify-between items-center mb-4">
               <div>
                  <h3 className="text-[11px] font-semibold text-slate-500 tracking-widest uppercase">
                    Current Order — {tableId || parts[0]?.label || 'Session'}
                  </h3>
               </div>
               <div className="flex flex-col items-end gap-2">
                 {isReadOnly && (
                   <div className="bg-emerald-100 text-emerald-600 text-[10px] font-medium px-2 py-0.5 rounded uppercase">
                     Archived
                   </div>
                 )}
               </div>
            </div>

          <div className="flex-none lg:flex-1 lg:overflow-y-auto no-scrollbar space-y-4 mb-4">
            {activeCurrent.length === 0 && activePartData?.rounds.length === 0 && (
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <p className="text-sm font-medium text-slate-500">No items added yet</p>
              </div>
            )}

            {activePartData?.rounds.map(r => (
              <div key={r.roundNumber} className="relative pl-3 border-l-2 border-slate-300 py-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Round {r.roundNumber}</p>
                <div className="space-y-1">
                  {r.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{i.name} × {i.qty}</span>
                      <span className="font-medium text-slate-800">₹{i.price * i.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {activeCurrent.length > 0 && (
               <div className="relative pt-2">
                 <div className="flex items-center gap-1.5 mb-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#ff5a36]"></div>
                   <p className="text-[11px] font-semibold text-[#ff5a36] uppercase tracking-widest">New Items</p>
                 </div>
                 <div className="space-y-3">
                    {activeCurrent.map(item => (
                      <div key={item.menuId} className="flex justify-between items-center group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <div className="flex items-center gap-2">
                               <button onClick={() => updateQty(item.menuId, -1)} className="p-0.5 text-slate-400 hover:text-slate-600"><Minus size={12} /></button>
                               <span className="text-xs font-semibold w-3 text-center">{item.qty}</span>
                               <button onClick={() => updateQty(item.menuId, 1)} className="p-0.5 text-slate-400 hover:text-slate-600"><Plus size={12} /></button>
                             </div>
                             <span className="text-[11px] text-slate-400">× ₹{item.price}</span>
                          </div>
                        </div>
                        <span className="text-[15px] font-medium text-slate-800">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                 </div>
               </div>
            )}
          </div>

          <div className="bg-[#f8f7f5] space-y-4">
            {activeCurrent.length > 0 && (
              <button
                onClick={() => saveRound(currentPartId, { closeAfterSave: true })}
                disabled={isDispatching}
                className={cn(
                  'w-full py-4 rounded-xl text-[14px] font-bold tracking-wide transition-all flex items-center justify-center gap-2.5 border shadow-sm active:scale-[0.98]',
                  isDispatching && 'opacity-70 cursor-wait',
                  roundMsg
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200'
                    : 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 hover:bg-emerald-600 hover:border-emerald-600'
                )}
              >
                {roundMsg
                  ? <><CheckCircle2 size={16} strokeWidth={2.5} /> Order Dispatched!</>
                  : <><ArrowRight size={16} strokeWidth={2.5} /> Dispatch to kitchen</>}
              </button>
            )}

            {activeAllItems.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span className="font-medium">₹{activeSub.toFixed(2)}</span>
                  </div>
                  {activeTaxes.map(t => (
                    <div key={t.name} className="flex justify-between text-[11px] font-medium text-slate-400 tracking-wide">
                      <span>{t.name} ({t.pct}%)</span>
                      <span>₹{t.amt.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-800 uppercase tracking-widest">Net Payable</span>
                    <span className="text-3xl font-semibold text-slate-900 tracking-tight">
                      ₹{activeTotal.toFixed(0)}
                    </span>
                  </div>
                </div>

                <div className="relative">
                   <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                   <input
                     type="tel"
                     value={phoneOf(currentPartId)}
                     onChange={e => setPartPhones(prev => ({ ...prev, [currentPartId]: e.target.value }))}
                     placeholder={user?.printMobileRequired ? "10-digit mobile number (required)" : "10-digit mobile number (required for WhatsApp)"}
                     className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-10 pr-4 outline-none text-sm text-slate-700 placeholder:text-slate-500 focus:border-[#ff5a36] transition-colors"
                     maxLength={10}
                   />
                </div>

                {!isReadOnly ? (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {/* Print */}
                    <button onClick={() => handleSettle(currentPartId, 'print')}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-600 transition-all active:scale-95">
                      <Printer size={18} strokeWidth={2} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Print</span>
                    </button>

                    {/* WhatsApp */}
                    <button onClick={() => handleSettle(currentPartId, 'wa')}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 text-[#00a884] transition-all active:scale-95">
                      <MessageCircle size={18} strokeWidth={2} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#00a884]">WhatsApp</span>
                    </button>

                    {/* Both */}
                    <button onClick={() => handleSettle(currentPartId, 'both')}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#FF5A36] hover:bg-orange-600 active:bg-orange-700 text-white transition-all active:scale-95 shadow-md shadow-orange-200">
                      <CheckCircle2 size={18} strokeWidth={2} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-white">Both</span>
                    </button>

                    {/* Continue without bill */}
                    <button onClick={() => handleSettle(currentPartId, 'none')}
                      className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all active:scale-95">
                      <ArrowRight size={18} strokeWidth={2} />
                      <span className="text-[10px] font-semibold uppercase tracking-widest">Without Bill</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => window.print()}
                      className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-slate-300"
                    >
                      <Printer size={16} /> Reprint
                    </button>
                    {phoneOf(currentPartId).replace(/\D/g, '').length >= 10 && (
                      <button
                        onClick={() => {
                          const bill = buildBill(currentPartId);
                          window.open(`https://wa.me/91${phoneOf(currentPartId).replace(/\D/g, '')}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
                        }}
                        className="py-3 bg-white border border-[#00a884] text-[#00a884] rounded-xl font-semibold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50"
                      >
                        <MessageCircle size={16} /> WhatsApp
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

