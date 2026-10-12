import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import {
  Search, Plus, Minus, Trash2, Leaf, Flame, Coffee, IceCream, Utensils, CheckCircle2, Image as ImageIcon, Printer, Package, X, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNavigation } from '../navigation/NavigationManager';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const categoryIcon = (cat) => {
  switch (cat) {
    case 'Veg': return <Leaf size={12} className="text-emerald-500" />;
    case 'Non-Veg': return <Flame size={12} className="text-rose-500" />;
    case 'Beverage': return <Coffee size={12} className="text-amber-500" />;
    case 'Dessert': return <IceCream size={12} className="text-purple-500" />;
    default: return <Utensils size={12} className="text-gray-400" />;
  }
};

const VegDot = ({ category }) => {
  const colorMap = {
    'Non-Veg': 'bg-rose-500',
    'Beverage': 'bg-amber-400',
    'Dessert': 'bg-purple-400',
  };
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', colorMap[category] || 'bg-emerald-500')} />
  );
};

const CustomNumpad = ({ value, onChange, onClose }) => {
  const handlePress = (num) => {
    const currentVal = value ? value.toString() : '';
    if (currentVal.length >= 3 && num !== '.') return;
    const next = currentVal + num;
    if (Number(next) <= 100) onChange(next);
  };
  const handleBackspace = () => {
    const currentVal = value ? value.toString() : '';
    onChange(currentVal.slice(0, -1));
  };

  return (
    <div className="bg-slate-50/50 p-3">
      <div className="flex justify-between items-center mb-3 px-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Discount Numpad</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
          <X size={14} strokeWidth={3} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['7', '8', '9', '4', '5', '6', '1', '2', '3'].map((n) => (
          <button
            key={n}
            onClick={() => handlePress(n)}
            className="h-10 bg-white hover:bg-slate-100 rounded-lg text-[16px] font-bold text-slate-700 transition-colors shadow-sm border border-slate-200/60 active:bg-slate-200"
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onChange('')}
          className="h-10 bg-slate-200 hover:bg-slate-300 rounded-lg text-[16px] font-bold text-slate-600 transition-colors shadow-sm border border-slate-300/60 active:bg-slate-400 flex items-center justify-center"
        >
          C
        </button>
        <button
          onClick={() => handlePress('0')}
          className="h-10 bg-white hover:bg-slate-100 rounded-lg text-[16px] font-bold text-slate-700 transition-colors shadow-sm border border-slate-200/60 active:bg-slate-200"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="h-10 bg-rose-50 hover:bg-rose-100 rounded-lg text-[16px] font-bold text-rose-500 transition-colors flex items-center justify-center shadow-sm border border-rose-200/60 active:bg-rose-200"
        >
          ⌫
        </button>
      </div>
    </div>
  );
};
export default function QuickOrder({ menuItems, user, onOrderUpdate }) {
  const navigate = useNavigate();
  const confettiCanvasRef = React.useRef(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = useMemo(() => {
    const cats = [...new Set((menuItems || []).map(i => i.category).filter(Boolean))];
    return ['All', ...cats];
  }, [menuItems]);

  const filteredMenu = useMemo(() =>
    (menuItems || []).filter(item => {
      if (item.isAvailable === false) return false;
      const inSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const inCat = catFilter === 'All' || item.category === catFilter;
      return inSearch && inCat;
    }),
    [menuItems, search, catFilter]);

  // Cart operations
  const updateQty = (item, delta) => {
    // Determine the ID to use based on whether it's a variation or a base item
    const baseId = item.menuId || item._id; // If it's already in cart, it has menuId
    const name = item.name;
    const price = item.price;
    const category = item.category || 'Veg';

    setCart(prev => {
      const existing = prev.find(i => i.menuId === baseId);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) return prev.filter(i => i.menuId !== baseId);
        return prev.map(i => i.menuId === baseId ? { ...i, qty: newQty } : i);
      }
      if (delta > 0) {
        return [...prev, { menuId: baseId, name, price, qty: delta, category, image: item.image || item.imageUrl }];
      }
      return prev;
    });
  };

  const clearCart = () => {
    if (window.confirm("Clear all items in the cart?")) {
      setCart([]);
    }
  };

  const getQty = (id) => {
    return cart.find(i => i.menuId === id)?.qty || 0;
  };

  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', upi: '' });
  const [discount, setDiscount] = useState('');
  const [showNumpad, setShowNumpad] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [packQty, setPackQty] = useState(0);
  const [printBill, setPrintBill] = useState(true);

  const { registerBackInterceptor } = useNavigation();

  useEffect(() => {
    return registerBackInterceptor(() => {
      // 1. Close numpad if open
      if (showNumpad) {
        setShowNumpad(false);
        return true;
      }
      // 2. Close details if open
      if (showDetails) {
        setShowDetails(false);
        return true;
      }
      // 3. Clear search if typed
      if (search) {
        setSearch('');
        return true;
      }
      // 4. Reset category if filtered
      if (catFilter !== 'All') {
        setCatFilter('All');
        return true;
      }
      // 5. Unsaved cart confirmation
      if (cart.length > 0) {
        if (window.confirm("You have items in your Quick Order cart. Are you sure you want to leave and discard this cart?")) {
          setCart([]);
          return false;
        } else {
          return true;
        }
      }
      return false;
    });
  }, [showNumpad, showDetails, search, catFilter, cart.length, registerBackInterceptor]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmt = Math.min(subtotal, Number(discount) || 0);
  const packPrice = user?.packagingCharge || 20;
  const packAmt = packQty * packPrice;
  const discountedSubtotal = Math.max(0, subtotal - discountAmt);

  // Tax calculation (matches POS logic)
  const taxEnabled = user?.taxEnabled || false;
  const taxes = (user?.taxes || []).filter(t => t.enabled);
  const taxList = taxEnabled ? taxes.map(t => ({ name: t.name, amt: +(discountedSubtotal * t.percentage / 100).toFixed(2) })) : [];
  const total = +(discountedSubtotal + packAmt + taxList.reduce((sum, t) => sum + t.amt, 0)).toFixed(2);

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const orderData = {
        orderType: 'Parcel', // Quick orders default to Parcel (Takeaway)
        customerName: 'Quick Order Walk-in',
        items: cart.map(item => ({
          menuId: String(item.menuId || '').split('_')[0], // Extract base ID if it was a variation
          name: item.name,
          price: item.price,
          quantity: item.qty
        })),
        status: 'Paid', // Fast checkout means it's paid immediately
        paymentMethod,
        splitDetails: paymentMethod === 'Split' ? {
          cash: Number(splitAmounts.cash) || 0,
          online: Number(splitAmounts.upi) || 0
        } : undefined,
        discount: discountAmt,
        packagingCharge: packAmt,
        isNewRound: true
      };

      await axios.post('/api/orders', orderData);
      setCart([]);
      if (onOrderUpdate) onOrderUpdate();
      // Fire confetti strictly inside the order summary panel
      if (confettiCanvasRef.current) {
        const fire = () => {
          if (!window.panelConfetti) {
            window.panelConfetti = window.confetti.create(confettiCanvasRef.current, { resize: true });
          }
          window.panelConfetti({ particleCount: 150, spread: 70, origin: { y: 0.9 } });
        };
        
        if (!window.confetti) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
          script.onload = fire;
          document.body.appendChild(script);
        } else {
          fire();
        }
      }
    } catch (err) {
      console.error('Failed to submit quick order:', err);
      alert('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-[#f8f9fa] overflow-hidden -mx-2 lg:mx-0">

      {/* ── LEFT: Menu Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full bg-white overflow-hidden relative shadow-sm border-r border-slate-100">

        {/* ── Header ── */}
        <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-40 lg:px-10 lg:pb-2 lg:border-b-0 shrink-0">
          <div className="flex items-center justify-between mb-4 lg:mb-2">
            <div className="flex items-center gap-4">
              <h1 className="text-[17px] font-semibold text-slate-900 lg:text-[22px]">Quick Order</h1>
            </div>
          </div>
        </header>

        {/* ── Search bar ── */}
        <div className="flex gap-2.5 px-9 py-3 bg-white shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search the menu..."
              className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[13px] font-semibold text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* ── Categories ── */}
        <div className="px-9 pb-4 bg-white shrink-0">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap border shrink-0 transition-all flex items-center gap-1.5',
                  catFilter === cat
                    ? 'bg-white border-blue-500 text-blue-600'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                )}
              >
                {cat !== 'All' && categoryIcon(cat)}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 bg-[#f8f9fa]">
          {filteredMenu.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-[15px] font-medium">No items found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pb-20">
              {filteredMenu.map(item => {
                const qty = getQty(item._id);
                const hasVariations = item.variations && item.variations.length > 0;

                return (
                  <div key={item._id} className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm flex flex-col">
                    <div className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon size={28} className="text-slate-300 mb-1.5" />
                          <span className="text-[11px] font-bold text-slate-400">No Image</span>
                        </>
                      )}
                    </div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <VegDot category={item.category} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.category}</span>
                      </div>
                    </div>

                    <h3 className="text-[14px] font-bold text-slate-800 leading-tight mb-1">{item.name}</h3>
                    <p className="text-[13px] font-bold text-[#FF5A36] mt-auto">₹{item.price}</p>

                    <div className="mt-3">
                      {hasVariations ? (
                        // Simplified variations support: just add base item for quick order or show alert
                        <button
                          onClick={() => alert('Quick Order currently adds the default base item. Full variations coming soon.') || updateQty(item, 1)}
                          className="w-full py-2 rounded-xl bg-slate-50 text-[12px] font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Add (Has Variations)
                        </button>
                      ) : (
                        qty > 0 ? (
                          <div className="flex items-center justify-between bg-blue-50 rounded-xl p-1 border border-blue-100">
                            <button
                              onClick={() => updateQty(item, -1)}
                              className="w-8 h-8 flex items-center justify-center bg-white rounded-lg text-blue-600 shadow-sm active:scale-95"
                            >
                              <Minus size={16} strokeWidth={3} />
                            </button>
                            <span className="text-[14px] font-bold text-blue-700">{qty}</span>
                            <button
                              onClick={() => updateQty(item, 1)}
                              className="w-8 h-8 flex items-center justify-center bg-[#FF5A36] rounded-lg text-white shadow-sm active:scale-95"
                            >
                              <Plus size={16} strokeWidth={3} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateQty(item, 1)}
                            className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-[12px] font-bold text-slate-500 hover:border-[#FF5A36] hover:text-[#FF5A36] hover:bg-orange-50 transition-all flex items-center justify-center gap-1"
                          >
                            <Plus size={14} strokeWidth={3} /> ADD
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart Panel (Business Overview UI) ── */}
      <div className="w-full lg:w-[380px] bg-[#f8f9fa] flex flex-col shrink-0 z-20 h-full shadow-[-10px_0_30px_rgba(0,0,0,0.02)] border-l border-slate-200 relative">
        <canvas ref={confettiCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-[100]" />
        <div className="px-5 pt-6 pb-4 flex items-center justify-between shrink-0 bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md z-10">
          <div>
            <h1 className="text-[15px] font-semibold text-white lg:text-[16px]">Order Summary</h1>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] font-bold text-indigo-200 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 no-scrollbar bg-white">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                <Utensils size={24} className="text-slate-300" />
              </div>
              <p className="text-[13px] font-semibold text-slate-400">Your cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {cart.map(item => (
                <div key={item.menuId} className="py-3.5 flex gap-3.5">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Utensils size={16} className="text-slate-300" />
                    )}
                  </div>
                  
                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center overflow-hidden pr-2">
                        <span className="text-[14px] font-bold text-slate-800 leading-none truncate mt-0.5">{item.name}</span>
                      </div>
                      <span className="text-[14px] font-bold text-slate-900 leading-none mt-0.5 shrink-0">₹{item.price * item.qty}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-slate-400">₹{item.price}</span>
                      
                      {/* Sleek Pill Stepper */}
                      <div className="flex items-center bg-[#f2f2f7] rounded-full h-7 px-1">
                        <button 
                          onClick={() => updateQty(item, -1)} 
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-full transition-colors"
                        >
                          <Minus size={12} strokeWidth={3} />
                        </button>
                        <span className="text-[12px] font-bold w-6 text-center text-slate-800">{item.qty}</span>
                        <button 
                          onClick={() => updateQty(item, 1)} 
                          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-full transition-colors"
                        >
                          <Plus size={12} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Totals & Checkout (Business Overview Style) ── */}
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 shrink-0 relative shadow-[0_-10px_40px_rgba(79,70,229,0.2)] border-t border-indigo-500/30 flex flex-col">

          {/* The Toggle Bump (Floats absolutely to take 0 layout height) */}
          <div className="absolute -top-[15px] left-1/2 -translate-x-1/2 z-30">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-[120px] h-[17px] flex items-center justify-center relative focus:outline-none group"
            >
              {/* SVG Background */}
              <svg
                className="absolute inset-0 w-full h-full drop-shadow-[0_-4px_10px_rgba(79,70,229,0.2)]"
                viewBox="0 0 120 17"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M 0 17 C 30 17, 35 1, 52 1 L 68 1 C 85 1, 90 17, 120 17"
                  fill="#4f46e5"
                />
              </svg>

              {/* Chevron Icon */}
              <div className="relative z-10 pt-[1px]">
                <ChevronUp size={18} className={cn("text-white transition-transform duration-300", showDetails ? "rotate-180" : "")} strokeWidth={3} />
              </div>
            </button>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-4 shadow-sm relative z-20">

            {/* Payment Methods (Moved to Top) */}
            <div className="px-3 py-2.5 bg-slate-50/50 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Payment Mode</p>
              <div className="flex gap-2">
                {['Cash', 'UPI', 'Card', 'Split'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg text-[11px] font-bold uppercase transition-all border",
                      paymentMethod === method
                        ? "bg-[#4B6FFF] text-white border-[#4B6FFF] shadow-sm shadow-blue-500/20"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* Split Payment Inputs */}
              {paymentMethod === 'Split' && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-slate-200/60">
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Cash (₹)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={splitAmounts.cash}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) setSplitAmounts(s => ({ ...s, cash: val }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[14px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF] transition-colors shadow-sm"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">UPI (₹)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={splitAmounts.upi}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d*$/.test(val)) setSplitAmounts(s => ({ ...s, upi: val }));
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[14px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF] transition-colors shadow-sm"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Details Area */}
            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out bg-white",
                showDetails ? "grid-rows-[1fr] opacity-100 border-b border-slate-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                {/* Charges Row (Split Grid) */}
                <div className="flex relative border-t border-slate-100">
                  <div className="flex-1 px-3 py-2.5 border-r border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Discount (₹)</p>
                    <input
                      type="text"
                      readOnly
                      value={discount}
                      onClick={() => setShowNumpad(true)}
                      className="w-full text-[16px] font-bold text-emerald-500 outline-none placeholder:text-slate-300 cursor-pointer"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1 p-2 flex items-center justify-center">
                    {packQty === 0 ? (
                      <button
                        onClick={() => setPackQty(1)}
                        className="w-full h-full rounded-lg flex items-center justify-center gap-2 transition-all border bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Package size={18} strokeWidth={2.5} />
                        <span className="text-[12px] font-bold uppercase tracking-widest">Add Pack</span>
                      </button>
                    ) : (
                      <div className="w-full h-full py-1 flex items-center justify-between px-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-600 shadow-sm">
                        <button onClick={() => setPackQty(Math.max(0, packQty - 1))} className="w-8 h-full flex items-center justify-center hover:bg-amber-100 rounded-md transition-colors"><Minus size={16} strokeWidth={3} /></button>
                        <span className="text-[12px] font-bold uppercase tracking-widest">{packQty} Pack</span>
                        <button onClick={() => setPackQty(packQty + 1)} className="w-8 h-full flex items-center justify-center hover:bg-amber-100 rounded-md transition-colors"><Plus size={16} strokeWidth={3} /></button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Smooth Expanding Numpad */}
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out border-slate-100",
                    showNumpad ? "grid-rows-[1fr] opacity-100 border-t" : "grid-rows-[0fr] opacity-0 border-t-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <CustomNumpad
                      value={discount}
                      onChange={setDiscount}
                      onClose={() => setShowNumpad(false)}
                    />
                  </div>
                </div>

                {/* Totals Breakdown Row */}
                <div className="px-3 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="space-y-3">
                    {/* Subtotal */}
                    <div className="flex justify-between items-end">
                      <span className="text-[12px] font-bold text-slate-800 uppercase tracking-widest mb-0.5">Subtotal</span>
                      <span className="text-[16px] font-bold text-slate-900 leading-none">₹{subtotal.toFixed(2)}</span>
                    </div>

                    {/* Discount */}
                    <div className={cn("flex justify-between items-end transition-all", discountAmt === 0 ? "opacity-50" : "")}>
                      <span className={cn("text-[12px] font-bold uppercase tracking-widest mb-0.5", discountAmt === 0 ? "text-slate-400" : "text-slate-800")}>
                        Discount
                      </span>
                      <span className={cn("text-[16px] font-bold leading-none", discountAmt === 0 ? "text-slate-400" : "text-slate-900")}>
                        {discountAmt > 0 ? '-' : ''}₹{discountAmt.toFixed(2)}
                      </span>
                    </div>

                    {/* Packaging */}
                    <div className={cn("flex justify-between items-end transition-all", packAmt === 0 ? "opacity-50" : "")}>
                      <span className={cn("text-[12px] font-bold uppercase tracking-widest mb-0.5", packAmt === 0 ? "text-slate-400" : "text-slate-800")}>
                        Packaging
                      </span>
                      <span className={cn("text-[16px] font-bold leading-none", packAmt === 0 ? "text-slate-400" : "text-slate-900")}>
                        ₹{packAmt.toFixed(2)}
                      </span>
                    </div>

                    {/* Taxes */}
                    {taxList.length === 0 ? (
                      <div className="flex justify-between items-end opacity-50 transition-all">
                        <span className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Taxes</span>
                        <span className="text-[16px] font-bold text-slate-400 leading-none">₹0.00</span>
                      </div>
                    ) : (
                      taxList.map(t => (
                        <div key={t.name} className="flex justify-between items-end transition-all">
                          <span className="text-[12px] font-bold text-slate-800 uppercase tracking-widest mb-0.5">{t.name}</span>
                          <span className="text-[16px] font-bold text-slate-900 leading-none">+ ₹{t.amt.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div> {/* End Collapsible Details Area */}

            {/* Total Payable (Always Visible) */}
            <div className="px-3 py-3 bg-white border-t border-slate-100">
              <div className="flex justify-between items-end">
                <span className="text-[12px] font-bold text-slate-800 uppercase tracking-widest mb-0.5">Total Payable</span>
                <span className="text-[16px] font-bold text-[#4B6FFF] leading-none">₹{total.toFixed(2)}</span>
              </div>
            </div>

          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setPrintBill(!printBill)}
              className={cn(
                "w-[76px] shrink-0 rounded-lg flex flex-col items-center justify-center gap-1 transition-all border",
                printBill
                  ? "bg-blue-50 border-blue-200 text-[#4B6FFF] shadow-sm"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
              )}
            >
              <Printer size={18} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">{printBill ? 'Print' : 'No Print'}</span>
            </button>
            <button
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleConfirmOrder}
              className={cn(
                "flex-1 py-4 rounded-lg flex items-center justify-center gap-2 text-[15px] font-bold tracking-wider uppercase transition-all shadow-lg",
                cart.length === 0
                  ? "bg-white/20 text-indigo-200 cursor-not-allowed shadow-none border border-transparent"
                  : "bg-white text-indigo-600 hover:bg-indigo-50 active:scale-[0.98] shadow-black/10 border border-white"
              )}
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
              ) : (
                <>
                  <CheckCircle2 size={20} strokeWidth={2.5} />
                  Charge ₹{total.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
