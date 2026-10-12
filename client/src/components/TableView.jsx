import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useNavigation } from '../navigation/NavigationManager';
import {
  getDraft,
  saveDraft as persistDraft,
  clearDraft as purgeDraft,
  hasDraft as checkHasDraft
} from '../navigation/draftManager';
import {
  X, Plus, Minus, Search, Printer, MessageCircle,
  ShoppingCart, Phone, Leaf, Flame,
  Coffee, IceCream, Utensils, ArrowLeft, ArrowRight, CreditCard, Users, SplitSquareHorizontal,
  Package, CheckCircle2, History, Mic, MicOff, User,
  Settings, ClipboardList, ChevronRight, Image as ImageIcon, ChevronDown, ChevronUp,
  ChevronLeft, Trash2, Check, Pizza, Box, Columns, Lock, LayoutGrid
} from 'lucide-react';

// ——— Utility ———————————————————————————————————————————————————————————————————————————————————
const cn = (...classes) => classes.filter(Boolean).join(' ');
const formatOrderDisplay = (orderNumber, orderId) => {
  if (typeof orderNumber === 'number' && Number.isFinite(orderNumber)) {
    return `#${String(orderNumber).padStart(4, '0')}`;
  }
  if (orderId) return `#${String(orderId).slice(-8).toUpperCase()}`;
  return '–';
};

const categoryIcon = (cat) => {
  switch (cat) {
    case 'Veg': return <Leaf size={12} className="text-emerald-500" />;
    case 'Non-Veg': return <Flame size={12} className="text-rose-500" />;
    case 'Beverage': return <Coffee size={12} className="text-amber-500" />;
    case 'Dessert': return <IceCream size={12} className="text-purple-500" />;
    default: return <Utensils size={12} className="text-gray-400" />;
  }
};

let _counter = 1;
const newPart = (n, tableId) => ({
  id: `part-${Date.now()}-${_counter++}`,
  label: tableId ? (n === 1 ? tableId : `${tableId}-Part${n}`) : `Parcel #${n}`,
  rounds: [],
});

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

// ── Main Component ────────────────────────────────────────────────────────────────────────────
const TableView = ({ tableId, orderId, isHistoryView, menuItems = [], user, onClose, onCheckoutComplete, initialScreen, showToast, onScreenChange }) => {

  // ── State ─────────────────────────────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { handleBack: triggerGlobalBack, registerBackInterceptor } = useNavigation();

  const [parts, setParts] = useState([]);
  const [activePart, setActivePart] = useState(0);
  const [roundItems, setRoundItems] = useState({});
  const [isEditingCart, setIsEditingCart] = useState(false);
  const [tempRoundItems, setTempRoundItems] = useState({});
  const [tempParts, setTempParts] = useState([]);
  const [partPhones, setPartPhones] = useState({});
  const [partExtraCharges, setPartExtraCharges] = useState({});
  const [partDiscount, setPartDiscount] = useState({});
  const [partOrderIds, setPartOrderIds] = useState({});
  const [partOrderNumbers, setPartOrderNumbers] = useState({});
  const [roundMsg, setRoundMsg] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryLayout, setCategoryLayout] = useState(() => localStorage.getItem('restro_category_layout') || 'horizontal'); // 'horizontal' or 'vertical'
  const [tempCategoryLayout, setTempCategoryLayout] = useState(categoryLayout);
  const [tempVariations, setTempVariations] = useState({}); // { varId: qty }

  // Persist category layout
  useEffect(() => {
    localStorage.setItem('restro_category_layout', categoryLayout);
  }, [categoryLayout]);
  const [showSettings, setShowSettings] = useState(false);
  const [catFilter, setCatFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTransferTable, setSelectedTransferTable] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState('');
  const [paymentType, setPaymentType] = useState('Paid');
  const [guestNote, setGuestNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [cashAmount, setCashAmount] = useState(0);
  const [onlineAmount, setOnlineAmount] = useState(0);

  // Derived modal/state from URL
  const modalParam = searchParams.get('modal');
  const itemIdParam = searchParams.get('itemId');
  const isCreatingParcel = !tableId && !orderId;
  const orderType = tableId ? 'Dine-in' : 'Parcel';

  const [selectedItemForVars, setSelectedItemForVars] = useState(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showExtraChargeModal, setShowExtraChargeModal] = useState(false);
  const [tempDiscountType, setTempDiscountType] = useState('Percentage');
  const [tempDiscountValue, setTempDiscountValue] = useState('');
  const [tempExtraCharges, setTempExtraCharges] = useState([]);
  const [showNumpad, setShowNumpad] = useState(false);

  // Sync state with URL params
  useEffect(() => {
    if (modalParam === 'variations' && itemIdParam) {
      const item = menuItems.find(i => i._id === itemIdParam);
      if (item) {
        setSelectedItemForVars(item);
        const initial = {};
        const currentItems = isEditingCart ? allItemsForPart(currentPartIdRef.current) : (roundItems[currentPartIdRef.current] || []);
        (item.variations || []).forEach(v => {
          const varId = `${item._id}_${v.name}`;
          const ex = currentItems.find(it => it.menuId === varId);
          initial[varId] = ex ? ex.qty : 0;
        });
        setTempVariations(initial);
      }
    } else {
      setSelectedItemForVars(null);
      setTempVariations({});
    }

    setShowDiscardModal(modalParam === 'discard');
    setShowDeleteModal(modalParam === 'delete');
    setShowTransferModal(modalParam === 'transfer');
  }, [modalParam, itemIdParam, menuItems, isEditingCart]);

  // ── Navigation level refs (used inside popstate — avoids stale closures) ──
  const activeModalRef = useRef(modalParam);
  activeModalRef.current = modalParam;
  const activeScreenRef = useRef(initialScreen || 'menu');
  const initialScreenRef = useRef(initialScreen || searchParams.get('screen') || 'menu');
  const screenStackRef = useRef([initialScreen || searchParams.get('screen') || 'menu']);

  // Keep in sync with URL-driven initialScreen & screen transitions
  useEffect(() => {
    activeScreenRef.current = initialScreen || 'menu';
  }, [initialScreen]);

  useEffect(() => {
    const cur = searchParams.get('screen') || 'menu';
    const stack = screenStackRef.current;
    if (stack[stack.length - 1] !== cur) {
      stack.push(cur);
    }
  }, [searchParams]);

  // Keep a ref in sync with roundItems so the popstate handler can always read fresh values
  const roundItemsRef = useRef(roundItems);
  useEffect(() => { roundItemsRef.current = roundItems; }, [roundItems]);
  const tableIdRef = useRef(tableId);
  tableIdRef.current = tableId;

  // Sync unsaved status with window for global interceptors
  useEffect(() => {
    const hasUnsaved = Object.values(roundItems).some(items => items.length > 0);
    window.restro_has_unsaved = hasUnsaved;
    return () => { window.restro_has_unsaved = false; };
  }, [roundItems]);

  // ── URL helpers (push a real history entry so back works) ──────────────────
  const _buildUrl = (overrides = {}) => {
    const p = new URLSearchParams();
    if (tableId) p.set('tableId', tableId);
    else if (orderId) p.set('orderId', orderId);
    else p.set('newParcel', 'true');
    const screen = overrides.screen ?? activeScreenRef.current;
    p.set('screen', screen);
    if (overrides.modal) p.set('modal', overrides.modal);
    if (overrides.itemId) p.set('itemId', overrides.itemId);
    return `${window.location.pathname}?${p.toString()}`;
  };

  const openModal = (name, extra = {}) => {
    activeModalRef.current = name;
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', name);
    if (extra.itemId) newParams.set('itemId', extra.itemId);
    // Push natively via React Router
    setSearchParams(newParams);
  };

  const closeModals = () => {
    activeModalRef.current = null;
    const newParams = new URLSearchParams(searchParams);
    const activeSc = searchParams.get('screen') || activeScreenRef.current || 'menu';
    newParams.set('screen', activeSc); // Preserve active screen on modal close
    newParams.delete('modal');
    newParams.delete('itemId');
    // We replace here because UI-based closing shouldn't leave dead modal history entries,
    // though native back button will pop them naturally.
    setSearchParams(newParams, { replace: true });
    setShowTransferModal(false);
    setShowDiscardModal(false);
    setShowDeleteModal(false);
    setSelectedItemForVars(null);
    setTempVariations({});
    setShowSettings(false);
  };

  const openVariations = (item) => {
    activeModalRef.current = 'variations';
    const newParams = new URLSearchParams(searchParams);
    newParams.set('modal', 'variations');
    newParams.set('itemId', item._id);
    setSearchParams(newParams);
  };

  // mobileScreen is driven entirely by URL (initialScreen prop from App.jsx)
  const mobileScreen = searchParams.get('screen') || 'menu';

  useEffect(() => {
    if (mobileScreen === 'cart') {
      setTempRoundItems(JSON.parse(JSON.stringify(roundItems)));
      setTempParts(JSON.parse(JSON.stringify(parts)));
      setIsEditingCart(true);
    } else {
      setIsEditingCart(false);
    }
  }, [mobileScreen]);

  // Customer details expand
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const handleDeleteOrder = async () => {
    if (!orderId) return;
    try {
      await axios.delete(`/api/orders/${orderId}`);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete order.');
    }
  };

  const handleBack = () => {
    triggerGlobalBack();
  };

  const billRef = useRef(null);
  const isSavingRef = useRef(false);

  // ── TABLE-ISOLATED DRAFT MANAGEMENT ──────────────────────────────────────────
  const draftKey = tableId || (isCreatingParcel ? 'parcel' : null);

  const saveDraft = (currentParts, roundItemsMap) => {
    if (!draftKey) return;
    const validParts = (currentParts || []).map(p => ({
      label: p.label || 'Part 1',
      items: roundItemsMap[p.id] || []
    })).filter(p => p.items.length > 0);
    persistDraft(tableId, validParts, isCreatingParcel);
  };

  const loadDraft = () => {
    return getDraft(tableId, isCreatingParcel);
  };

  const clearDraft = () => {
    purgeDraft(tableId, isCreatingParcel);
  };

  const applyDraft = (loadedParts, draft) => {
    if (!draft || !draft.length) return;
    const restored = {};
    draft.forEach((d, idx) => {
      const part = loadedParts[idx];
      if (part && d.items && d.items.length > 0) restored[part.id] = d.items;
    });
    if (Object.keys(restored).length > 0) setRoundItems(restored);
  };

  // ── BACK ACTION INTERCEPTOR ─────────────────────────────────────────────────
  useEffect(() => {
    return registerBackInterceptor(() => {
      // 1. Variations popup
      if (selectedItemForVars) {
        setSelectedItemForVars(null);
        setTempVariations({});
        closeModals();
        return true;
      }

      // 2. Modals (variations, settings, transfer, delete, numpad, discard)
      const curModal = searchParams.get('modal');
      if (curModal || showDiscardModal || showDeleteModal || showTransferModal || showSettings || showNumpad) {
        if (curModal === 'discard' || showDiscardModal) {
          // If discard confirmation dialog is already open, pressing Back closes it and keeps user on screen
          setShowDiscardModal(false);
          closeModals();
          return true;
        }
        setShowSettings(false);
        setShowNumpad(false);
        closeModals();
        return true;
      }

      // 3. Nested Screen navigation within TableView (e.g. menu -> cart)
      const curScreen = searchParams.get('screen') || 'menu';
      if (curScreen === 'cart') {
        const cameFromPos = location.pathname === '/pos' && initialScreenRef.current === 'cart';
        if (cameFromPos) {
          // Direct entry to Cart from POS (Billing click) -> Return directly to /pos
          if (window.history.length > 1) {
            navigate(-1);
          } else {
            onClose();
          }
          return true;
        }

        // Opened from menu -> Return to menu
        const stack = screenStackRef.current;
        if (stack.length > 1) {
          stack.pop();
        }
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('screen', 'menu');
          setSearchParams(nextParams, { replace: true });
        }
        return true;
      }

      // 4. Category filter active -> pop back to 'All'
      if (catFilter !== 'All') {
        setCatFilter('All');
        return true;
      }

      // 5. Unsaved items check -> prompt established discard confirmation
      const hasUnsavedItems = Object.values(roundItemsRef.current || {}).some(items => Array.isArray(items) && items.length > 0)
        || checkHasDraft(tableIdRef.current, isCreatingParcel);
      if (hasUnsavedItems) {
        openModal('discard');
        return true;
      }

      // 6. No unsaved items: close TableView cleanly and restore parent
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        onClose();
      }
      return true;
    });
  }, [selectedItemForVars, showDiscardModal, showDeleteModal, showTransferModal, showSettings, showNumpad, searchParams, catFilter, isCreatingParcel, registerBackInterceptor, onClose, setSearchParams, location.pathname, navigate]);

  // ── Sync with Backend On Mount ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let active = [];
        if (orderId) {
          const res = await axios.get(`/api/orders/${orderId}`);
          active = [res.data];
        } else if (tableId) {
          const res = await axios.get('/api/orders/active');
          active = res.data
            .filter(o => o.tableId === tableId && o.orderType === 'Dine-in')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first
        }

        if (active.length > 0) {
          const loadedParts = active.map((o, idx) => {
            const expectedLabel = active.length === 1
              ? (tableId || o.tableId)
              : `${tableId}-Part${idx + 1}`;

            // Self-healing: if DB label is wrong/duplicate/generic, sync the correct one
            if (active.length > 1 && o.partLabel !== expectedLabel) {
              axios.patch(`/api/orders/${o._id}/label`, { partLabel: expectedLabel }).catch(console.error);
            }

            return {
              id: `part-${o._id}`,
              label: o.orderType === 'Parcel'
                ? (o.customerName || o.partLabel || `Parcel #${idx + 1}`)
                : expectedLabel,
              rounds: [{ roundNumber: 1, items: (o.items || []).map(i => ({ ...i, qty: i.quantity })) }],
              status: o.status
            };
          });
          const orderIds = {};
          const orderNumbers = {};
          const initPhones = {};
          const initExtraCharges = {};
          const initDiscounts = {};
          active.forEach((o, idx) => {
            const pid = `part-${o._id}`;
            orderIds[pid] = o._id;
            orderNumbers[pid] = o.orderNumber;
            if (o.customerPhone) initPhones[pid] = o.customerPhone;
            if (o.extraCharges && o.extraCharges.length > 0) initExtraCharges[pid] = o.extraCharges;
            if (o.discountType && o.discountType !== 'None') initDiscounts[pid] = { type: o.discountType, value: o.discountValue };
            if (idx === 0) {
              if (o.paymentType) setPaymentType(o.paymentType);
              if (o.guestNote) setGuestNote(o.guestNote);
            }
          });
          setParts(loadedParts);
          setPartOrderIds(orderIds);
          setPartOrderNumbers(orderNumbers);
          setPartPhones(initPhones);
          setPartExtraCharges(initExtraCharges);
          setPartDiscount(initDiscounts);
          applyDraft(loadedParts, loadDraft());
        } else {
          const p1 = newPart(1, tableId);
          const draft = loadDraft();
          if (draft && draft.length > 1) {
            const restoredParts = draft.map((d, i) => {
              const p = newPart(i + 1, tableId);
              p.label = d.label || (tableId ? `${tableId}-Part${i + 1}` : `Parcel #${i + 1}`);
              return p;
            });
            setParts(restoredParts);
            applyDraft(restoredParts, draft);
          } else {
            setParts([p1]);
            applyDraft([p1], draft);
          }
        }
      } catch (err) {
        console.error('Failed to init TableView:', err);
        setParts([newPart(1, tableId)]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [tableId, orderId]);

  useEffect(() => {
    if (!loading && parts.length > 0) saveDraft(parts, roundItems);
  }, [roundItems, parts, loading]);

  useEffect(() => {
    if (showTransferModal) {
      axios.get('/api/tables').then(res => setAvailableTables(res.data)).catch(console.error);
    } else {
      setSelectedTransferTable('');
    }
  }, [showTransferModal]);

  // ── Tax config ────────────────────────────────────────────────────────────────────────────
  const taxEnabled = user?.taxEnabled || false;
  const taxes = (user?.taxes || []).filter(t => t.enabled);

  // ── Menu derived ──────────────────────────────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────────────────────────
  const currentPartId = parts[activePart]?.id;
  const currentPartIdRef = useRef(currentPartId);
  const menuItemsRef = useRef(menuItems);
  currentPartIdRef.current = currentPartId;
  menuItemsRef.current = menuItems;

  const hasUnsavedCartChanges = () => {
    if (!isEditingCart) return false;
    const pid = currentPartIdRef.current;
    if (!pid) return false;

    // Compare unsaved items
    const currentUnsaved = JSON.stringify(roundItems[pid] || []);
    const tempUnsaved = JSON.stringify(tempRoundItems[pid] || []);
    if (currentUnsaved !== tempUnsaved) return true;

    // Compare saved items (parts rounds)
    const currentPart = parts.find(p => p.id === pid);
    const tempPart = tempParts.find(p => p.id === pid);
    const currentPartRounds = JSON.stringify(currentPart?.rounds || []);
    const tempPartRounds = JSON.stringify(tempPart?.rounds || []);
    if (currentPartRounds !== tempPartRounds) return true;

    return false;
  };

  const hasUnsavedCartChangesRef = useRef(false);
  useEffect(() => {
    hasUnsavedCartChangesRef.current = hasUnsavedCartChanges();
  });

  const currentRoundOf = (partId) => (isEditingCart ? tempRoundItems[partId] : roundItems[partId]) || [];
  const phoneOf = (partId) => partPhones[partId] || '';

  const allItemsForPart = (partId) => {
    const currentParts = isEditingCart ? tempParts : parts;
    const part = currentParts.find(p => p.id === partId);
    if (!part) return [];
    const mergedMap = new Map();
    part.rounds.flatMap(r => r.items).forEach(si => {
      if (mergedMap.has(si.menuId)) mergedMap.get(si.menuId).qty += si.qty;
      else mergedMap.set(si.menuId, { ...si });
    });
    currentRoundOf(partId).forEach(ci => {
      if (mergedMap.has(ci.menuId)) mergedMap.get(ci.menuId).qty += ci.qty;
      else mergedMap.set(ci.menuId, { ...ci });
    });
    return Array.from(mergedMap.values());
  };

  const subtotalOf = (items) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const taxListOf = (sub) =>
    taxEnabled
      ? taxes.map(t => ({ name: t.name, pct: t.percentage, amt: +(sub * t.percentage / 100).toFixed(2) }))
      : [];
  const totalOf = (sub, txList) => +(sub + txList.reduce((s, t) => s + t.amt, 0)).toFixed(2);

  // ── Part operations ───────────────────────────────────────────────────────────────────────
  const addPart = () => {
    // If we're splitting for the first time, rename Part 1 to T1-Part1
    if (parts.length === 1 && tableId && !parts[0].label.includes('-Part')) {
      const p1Id = partOrderIds[parts[0].id];
      if (p1Id) {
        axios.patch(`/api/orders/${p1Id}/label`, { partLabel: `${tableId}-Part1` }).catch(console.error);
      }
      setParts(prev => [
        { ...prev[0], label: `${tableId}-Part1` },
        newPart(2, tableId)
      ]);
      setActivePart(1);
      return;
    }

    // Scan for highest number in all current labels
    let maxNum = 0;
    parts.forEach(p => {
      const match = p.label.match(/Part\s*(\d+)/i) || p.label.match(/#\s*(\d+)/);
      if (match) {
        const n = parseInt(match[1]);
        if (n > maxNum) maxNum = n;
      }
    });

    // The next number must be higher than current parts count AND the highest label found
    const nextNum = Math.max(parts.length, maxNum) + 1;
    const p = newPart(nextNum, tableId);
    setParts(prev => [...prev, p]);
    setActivePart(parts.length);
  };

  const removePart = async (idx) => {
    if (parts.length === 1) return;
    const targetPart = parts[idx];
    const items = allItemsForPart(targetPart.id);
    const unsaved = currentRoundOf(targetPart.id);

    // If part has items (saved or unsaved), ask for confirmation
    if (items.length > 0 || unsaved.length > 0) {
      if (!window.confirm(`Are you sure you want to remove ${targetPart.label}? All items in this part will be lost.`)) {
        return;
      }
    }

    // If it's already a saved order, delete it from the backend
    const oid = partOrderIds[targetPart.id];
    if (oid) {
      try {
        await axios.delete(`/api/orders/${oid}`);
      } catch (err) {
        console.error('Failed to delete order from backend:', err);
      }
    }

    const newParts = parts.filter((_, i) => i !== idx);

    // If we're back to 1 part, rename it back to just the table name
    if (newParts.length === 1 && tableId) {
      const lastPart = newParts[0];
      const lastOid = partOrderIds[lastPart.id];
      if (lastOid) {
        await axios.patch(`/api/orders/${lastOid}/label`, { partLabel: tableId }).catch(console.error);
      }
      newParts[0] = { ...lastPart, label: tableId };
    }

    setParts(newParts);
    setActivePart(prev => (prev >= idx && prev > 0 ? prev - 1 : prev));
  };

  // ── Cart operations ───────────────────────────────────────────────────────────────────────
  const addItem = (item) => updateQty(item._id, 1);

  const updateRoundItemsState = (updater) => {
    if (isEditingCart) {
      setTempRoundItems(updater);
    } else {
      setRoundItems(updater);
    }
  };

  const addVariationItem = (item, variation) => {
    const varId = `${item._id}_${variation.name}`;
    updateRoundItemsState(prev => {
      const list = [...(prev[currentPartId] || [])];
      const ex = list.find(i => i.menuId === varId);
      if (ex) return { ...prev, [currentPartId]: list.map(i => i.menuId === varId ? { ...i, qty: i.qty + 1 } : i) };
      return { ...prev, [currentPartId]: [...list, { menuId: varId, name: `${item.name} (${variation.name})`, price: variation.price, qty: 1 }] };
    });
  };

  const removeVariationItem = (item, variation) => {
    const varId = `${item._id}_${variation.name}`;
    updateRoundItemsState(prev => {
      const list = [...(prev[currentPartId] || [])];
      const ex = list.find(i => i.menuId === varId);
      if (!ex) return prev;
      if (ex.qty <= 1) return { ...prev, [currentPartId]: list.filter(i => i.menuId !== varId) };
      return { ...prev, [currentPartId]: list.map(i => i.menuId === varId ? { ...i, qty: i.qty - 1 } : i) };
    });
  };

  const updateQty = (menuId, delta) => {
    if (delta > 0) {
      updateRoundItemsState(prev => {
        const list = [...(prev[currentPartId] || [])];
        const exIdx = list.findIndex(i => i.menuId === menuId);
        if (exIdx >= 0) {
          list[exIdx] = { ...list[exIdx], qty: list[exIdx].qty + delta };
        } else {
          const m = menuItems.find(x => x._id === menuId);
          if (m) list.push({ menuId, name: m.name, price: m.price, qty: delta });
        }
        return { ...prev, [currentPartId]: list };
      });
      return;
    }

    const curRound = (isEditingCart ? tempRoundItems[currentPartId] : roundItems[currentPartId]) || [];
    const inCurrent = curRound.find(i => i.menuId === menuId);
    if (inCurrent) {
      updateRoundItemsState(prev => {
        const list = (prev[currentPartId] || [])
          .map(i => i.menuId === menuId ? { ...i, qty: i.qty + delta } : i)
          .filter(i => i.qty > 0);
        return { ...prev, [currentPartId]: list };
      });
      return;
    }

    if (isEditingCart) {
      setTempParts(prev => {
        const pIdx = prev.findIndex(x => x.id === currentPartId);
        if (pIdx === -1) return prev;
        const p = prev[pIdx];
        const newRounds = p.rounds.map(r => ({ ...r, items: [...r.items] }));
        let decremented = false;
        for (let i = newRounds.length - 1; i >= 0; i--) {
          const exIdx = newRounds[i].items.findIndex(x => x.menuId === menuId);
          if (exIdx >= 0) {
            const newItems = [...newRounds[i].items];
            newItems[exIdx] = { ...newItems[exIdx], qty: newItems[exIdx].qty + delta };
            if (newItems[exIdx].qty <= 0) newItems.splice(exIdx, 1);
            newRounds[i].items = newItems;
            decremented = true;
            break;
          }
        }
        if (!decremented) return prev;
        const finalRounds = newRounds.filter(r => r.items.length > 0);
        const newPrev = [...prev];
        newPrev[pIdx] = { ...p, rounds: finalRounds };
        return newPrev;
      });
    } else {
      let finalRoundsForSync = null;
      setParts(prev => {
        const pIdx = prev.findIndex(x => x.id === currentPartId);
        if (pIdx === -1) return prev;
        const p = prev[pIdx];
        const newRounds = p.rounds.map(r => ({ ...r, items: [...r.items] }));
        let decremented = false;
        for (let i = newRounds.length - 1; i >= 0; i--) {
          const exIdx = newRounds[i].items.findIndex(x => x.menuId === menuId);
          if (exIdx >= 0) {
            const newItems = [...newRounds[i].items];
            newItems[exIdx] = { ...newItems[exIdx], qty: newItems[exIdx].qty + delta };
            if (newItems[exIdx].qty <= 0) newItems.splice(exIdx, 1);
            newRounds[i].items = newItems;
            decremented = true;
            break;
          }
        }
        if (!decremented) return prev;
        const finalRounds = newRounds.filter(r => r.items.length > 0);
        finalRoundsForSync = finalRounds;
        const newPrev = [...prev];
        newPrev[pIdx] = { ...p, rounds: finalRounds };
        return newPrev;
      });

      setTimeout(() => {
        if (finalRoundsForSync && partOrderIds[currentPartId]) {
          const flattenedItems = finalRoundsForSync.flatMap(r => r.items.map(i => ({ ...i, quantity: i.qty, round: r.roundNumber })));
          axios.put(`/api/orders/${partOrderIds[currentPartId]}/items`, { items: flattenedItems }).catch(console.error);
        }
      }, 0);
    }
  };

  const saveRound = async (partId, options = {}) => {
    const { closeAfterSave = false, ignoreLock = false } = options;
    if (!ignoreLock && isSavingRef.current) return;
    const items = currentRoundOf(partId);
    if (!items.length) return;
    if (!ignoreLock) isSavingRef.current = true;
    try {
      let oid = partOrderIds[partId];
      if (oid) {
        await axios.patch(`/api/orders/${oid}/add-items`, { items: items.map(i => ({ ...i, quantity: i.qty })) });
        setParts(prev => prev.map(p => {
          if (p.id !== partId) return p;
          return { ...p, rounds: [...p.rounds, { roundNumber: p.rounds.length + 1, items: [...items] }] };
        }));
      } else {
        const orderPayload = {
          orderType: tableId ? 'Dine-in' : 'Parcel',
          partLabel: parts.find(p => p.id === partId)?.label || 'Part 1',
          items: items.map(i => ({ ...i, quantity: i.qty })),
          status: 'Pending',
          customerPhone: phoneOf(partId) || ''
        };
        if (tableId) orderPayload.tableId = tableId;
        const res = await axios.post('/api/orders', orderPayload);
        oid = res.data._id;
        setPartOrderIds(prev => ({ ...prev, [partId]: oid }));
        setPartOrderNumbers(prev => ({ ...prev, [partId]: res.data.orderNumber }));
        setParts(prev => prev.map(p => {
          if (p.id !== partId) return p;
          return { ...p, rounds: [{ roundNumber: 1, items: [...items] }] };
        }));
      }
      setRoundItems(prev => ({ ...prev, [partId]: [] }));
      clearDraft();
      setRoundMsg(true);
      setTimeout(() => setRoundMsg(false), 2000);
      if (closeAfterSave) {
        setIsDispatching(true);
        setTimeout(() => { onClose?.(); }, 170);
      }
      return oid;
    } catch (err) {
      console.error('Failed to save round:', err);
      alert('Error saving round: ' + (err.response?.data?.error || err.message));
    } finally {
      if (!ignoreLock) isSavingRef.current = false;
    }
  };

  const handleTransfer = async () => {
    const oid = partOrderIds[currentPartId];
    if (!oid) {
      alert("Please save this part first before transferring. Click 'KOT & Hold' to save.");
      return;
    }
    if (!selectedTransferTable) {
      alert("Please select a destination table.");
      return;
    }
    try {
      await axios.patch(`/api/orders/${oid}/transfer`, { newTableId: selectedTransferTable });
      // After transfer, always go back to the table grid as requested
      onClose?.();
    } catch (err) {
      console.error('Transfer failed:', err);
      alert('Error transferring table.');
    }
  };

  // ── Voice Ordering Logic ──────────────────────────────────────────────────────────────────
  const SpeechRecognitionAPI = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const isMicSupported = Boolean(SpeechRecognitionAPI);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const silenceTimerRef = useRef(null);

  const MARATHI_NUMBERS = {
    'एक': 1, 'दोन': 2, 'तीन': 3, 'चार': 4, 'पाच': 5,
    'सहा': 6, 'सात': 7, 'आठ': 8, 'नऊ': 9, 'दहा': 10,
    'दो': 2, 'पाँच': 5, 'छह': 6,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  const _buildAliasTable = () => {
    const items = menuItemsRef.current || [];
    const byName = new Map(items.map(i => [i.name.toLowerCase(), i]));
    const STATIC = [
      ['गुलाब जामुन', 'Gulab Jamun'], ['गुलाब', 'Gulab Jamun'],
      ['चिकन टिक्का', 'Chicken Tikka'], ['चिकन', 'Chicken Tikka'],
      ['पनीर बटर मसाला', 'Paneer Butter Masala'], ['butter masala', 'Paneer Butter Masala'],
      ['बटर मसाला', 'Paneer Butter Masala'],
    ];
    const table = new Map();
    for (const item of items) table.set(item.name.toLowerCase(), item);
    for (const [spoken, canonical] of STATIC) {
      const item = byName.get(canonical.toLowerCase());
      if (item) table.set(spoken.toLowerCase(), item);
    }
    return [...table.entries()].sort((a, b) => b[0].length - a[0].length);
  };

  const _matchMenuItems = (transcript) => {
    const text = transcript.toLowerCase().trim();
    const aliases = _buildAliasTable();
    const segments = text.split(/\s+आणि\s+|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
    const results = [];
    const usedIds = new Set();
    for (const seg of segments) {
      const words = seg.split(/\s+/);
      let qty = 1;
      const itemWords = [];
      for (const w of words) {
        const n = MARATHI_NUMBERS[w] || parseInt(w) || null;
        if (n && n > 0) qty = n; else itemWords.push(w);
      }
      const itemText = itemWords.join(' ');
      let matched = null;
      for (const [alias, item] of aliases) {
        if (usedIds.has(item._id) || item.isAvailable === false) continue;
        if (itemText.includes(alias)) { matched = item; break; }
      }
      if (matched) { results.push({ item: matched, qty }); usedIds.add(matched._id); }
    }
    return results;
  };

  const _tryAlternatives = (result) => {
    for (let j = 0; j < result.length; j++) {
      const candidate = result[j].transcript.trim();
      const matched = _matchMenuItems(candidate);
      if (matched.length) return { matched, transcript: candidate };
    }
    return { matched: [], transcript: result[0].transcript.trim() };
  };

  const _addVoiceItems = (matched) => {
    const partId = currentPartIdRef.current;
    if (!partId || !matched.length) return;
    setRoundItems(prev => {
      let list = [...(prev[partId] || [])];
      matched.forEach(({ item, qty }) => {
        const ex = list.find(i => i.menuId === item._id);
        if (ex) list = list.map(i => i.menuId === item._id ? { ...i, qty: i.qty + qty } : i);
        else list.push({ menuId: item._id, name: item.name, price: item.price, qty });
      });
      return { ...prev, [partId]: list };
    });
    const summary = matched.map(x => `${x.qty}× ${x.item.name}`).join(', ');
    setTranscriptResult(`✅ Added: ${summary}`);
    setTimeout(() => setTranscriptResult(''), 3500);
  };

  const _stopMic = () => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) { }
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);
  };

  const _startMic = () => {
    if (isListeningRef.current) { _stopMic(); return; }
    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.lang = 'mr-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => { isListeningRef.current = true; setIsListening(true); setTranscriptResult('🎤 ऐकतोय... / Listening...'); };
    rec.onresult = (event) => {
      clearTimeout(silenceTimerRef.current);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const { matched, transcript } = _tryAlternatives(event.results[i]);
          if (matched.length) { _addVoiceItems(matched); _stopMic(); return; }
          setTranscriptResult(`❌ सापडले नाही / Not found: "${transcript}"`);
          setTimeout(() => setTranscriptResult(''), 3000);
          _stopMic();
        } else {
          setTranscriptResult(`🎤 ${event.results[i][0].transcript}`);
        }
      }
    };
    rec.onerror = (event) => {
      switch (event.error) {
        case 'aborted': break;
        case 'no-speech': _stopMic(); break;
        case 'audio-capture':
          setTranscriptResult('⚠️ Mic not found'); setTimeout(() => setTranscriptResult(''), 3000); _stopMic(); break;
        case 'not-allowed':
          setTranscriptResult('🔒 Allow mic / मायक परवानगी द्या'); setTimeout(() => setTranscriptResult(''), 4000); _stopMic(); break;
        case 'network': _stopMic(); setTimeout(() => _startMic(), 600); break;
        default: _stopMic(); break;
      }
    };
    rec.onend = () => { isListeningRef.current = false; setIsListening(false); clearTimeout(silenceTimerRef.current); };
    try {
      rec.start();
      recognitionRef.current = rec;
      silenceTimerRef.current = setTimeout(() => {
        _stopMic();
        setTranscriptResult('⏱ Time\'s up. Tap mic & try again.');
        setTimeout(() => setTranscriptResult(''), 2500);
      }, 6000);
    } catch (_) { isListeningRef.current = false; setIsListening(false); }
  };

  const toggleListening = () => {
    if (isReadOnly || !isMicSupported) return;
    isListeningRef.current ? _stopMic() : _startMic();
  };

  useEffect(() => () => _stopMic(), []);

  // ── Bill / WA message builders ────────────────────────────────────────────────────────────
  const buildBill = (partId) => {
    const part = parts.find(p => p.id === partId);
    const items = allItemsForPart(partId).filter(i => i.qty > 0);
    const sub = subtotalOf(items);

    const extraCharges = partExtraCharges[partId] || [];
    const extraChargesTotal = extraCharges.reduce((s, c) => s + Number(c.amount || 0), 0);
    const subWithExtra = sub + extraChargesTotal;

    const discountObj = partDiscount[partId] || { type: 'None', value: 0 };
    let discountAmount = 0;
    if (discountObj.type === 'Fixed') {
      discountAmount = Math.min(subWithExtra, Number(discountObj.value || 0));
    } else if (discountObj.type === 'Percentage') {
      discountAmount = Math.min(subWithExtra, subWithExtra * (Number(discountObj.value || 0) / 100));
    }
    const afterDiscount = Math.max(0, subWithExtra - discountAmount);

    const txList = taxListOf(afterDiscount);
    const total = totalOf(afterDiscount, txList);
    
    return {
      tableId, partLabel: part?.label || 'Bill', items, sub, txList, total,
      extraCharges, extraChargesTotal,
      discountType: discountObj.type, discountValue: discountObj.value, discountAmount,
      afterDiscount,
      restaurantName: user?.restaurantName || 'My Restaurant',
      restaurantAddress: user?.restaurantAddress || '',
      restaurantPhone: user?.restaurantPhone || '',
      gstNumber: user?.gstNumber || '',
      fssaiNumber: user?.fssaiNumber || '',
      orderId: partOrderIds[partId] || '',
      orderNumber: partOrderNumbers[partId],
      paymentType,
      guestNote: paymentType === 'Guest' ? guestNote : '',
      paymentMode,
      cashAmount,
      onlineAmount,
      timestamp: new Date().toLocaleString('en-IN'),
    };
  };

  const waMessage = (bill) =>
    [
      `🍽 *${bill.restaurantName}*`,
      bill.restaurantAddress ? `📍 ${bill.restaurantAddress}` : undefined,
      bill.restaurantPhone ? `📞 ${bill.restaurantPhone}` : undefined,
      bill.fssaiNumber ? `FSSAI: ${bill.fssaiNumber}` : undefined,
      bill.gstNumber ? `GSTIN: ${bill.gstNumber}` : undefined,
      '', `🧾 *I N V O I C E*`,
      `Order ID: ${formatOrderDisplay(bill.orderNumber, bill.orderId)}`,
      `Mode: ${bill.paymentMode}`, '',
      ...bill.items.map(i => `  ${i.name} × ${i.qty}  →  ₹${(i.price * i.qty).toFixed(2)}`),
      '',
      ...(bill.extraCharges && bill.extraCharges.length > 0 ? bill.extraCharges.map(c => `  ${c.name}  →  ₹${Number(c.amount).toFixed(2)}`) : []),
      ...(bill.discountAmount > 0 ? [`  Discount (${bill.discountType})  →  -₹${bill.discountAmount.toFixed(2)}`] : []),
      ...(bill.txList.length > 0 ? [
        `Subtotal: ₹${bill.afterDiscount.toFixed(2)}`,
        ...bill.txList.map(t => `${t.name} (${t.pct}%): ₹${t.amt.toFixed(2)}`)
      ] : []),
      `*TOTAL: ₹${bill.total.toFixed(2)}*`, '',
      `Thank you! Visit again 🙏`,
    ].filter(l => l !== undefined).join('\n');

  // ── ONE-CLICK SETTLE ──────────────────────────────────────────────────────────────────────
  const handleSettle = async (partId, mode = 'print') => {
    const unsaved = currentRoundOf(partId);
    let oid = partOrderIds[partId];
    if (unsaved.length > 0) {
      const savedId = await saveRound(partId);
      if (savedId) oid = savedId;
    }
    const bill = buildBill(partId);
    if (!oid) {
      alert("No saved items to settle! Please add items and save first.");
      return;
    }
    const hasWA = mode === 'wa' || mode === 'both';
    const doPrint = mode === 'print' || mode === 'both';
    const phone = phoneOf(partId).replace(/\D/g, '');
    if (hasWA && phone.length < 10) {
      alert('Please enter a valid 10-digit customer mobile number for WhatsApp.');
      return;
    }
    try {
      await axios.patch(`/api/orders/${oid}/status`, {
        status: 'Paid', paymentType,
        guestNote: paymentType === 'Guest' ? guestNote : '',
        paymentMode: paymentType === 'Guest' ? 'Guest' : (paymentMode === 'Split' ? 'Split' : (paymentMode === 'Cash' ? 'Cash' : 'Online')),
        cashAmount: paymentMode === 'Split' ? Number(cashAmount) : (paymentMode === 'Cash' ? bill.total : 0),
        onlineAmount: paymentMode === 'Split' ? Number(onlineAmount) : (paymentMode === 'Cash' ? 0 : bill.total),
        customerPhone: phone.length >= 10 ? phone : '',
        extraCharges: bill.extraCharges,
        discountType: bill.discountType,
        discountValue: bill.discountValue,
        discountAmount: bill.discountAmount,
        subtotal: bill.sub,
        taxAmount: bill.txList.reduce((s, t) => s + t.amt, 0),
        totalAmount: bill.total
      });
      if (hasWA) window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
      if (doPrint) window.print();
      showToast?.('Settled', bill.orderNumber ? String(bill.orderNumber).padStart(4, '0') : '');
      // If only 1 part remains, revert it to table name and sync to backend BEFORE completing
      const remaining = parts.filter(p => p.id !== partId);
      if (remaining.length === 1 && tableId) {
        const lastPart = remaining[0];
        const lastOid = partOrderIds[lastPart.id];
        if (lastOid) {
          await axios.patch(`/api/orders/${lastOid}/label`, { partLabel: tableId }).catch(console.error);
        }
        setParts([{ ...lastPart, label: tableId }]);
      } else {
        setParts(remaining);
      }

      onCheckoutComplete?.();
    } catch (err) {
      console.error('Settlement failed:', err);
      alert('Error finalizing payment on server.');
    }
  };

  const handleSaveCartChanges = async (shouldNavigateToMenu = true) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      // Let's clean up tempParts to remove any qty === 0 items
      const cleanedParts = tempParts.map(p => {
        if (p.id !== currentPartId) return p;
        return {
          ...p,
          rounds: p.rounds.map(r => ({
            ...r,
            items: r.items.filter(i => i.qty > 0)
          })).filter(r => r.items.length > 0)
        };
      });

      // Let's clean up tempRoundItems to remove any qty === 0 items
      const cleanedRoundItemsMap = {
        ...tempRoundItems,
        [currentPartId]: (tempRoundItems[currentPartId] || []).filter(i => i.qty > 0)
      };

      // Check if the entire order is now empty (no items left across all parts)
      const hasAnySavedItems = cleanedParts.some(p => p.rounds.some(r => r.items.some(i => i.qty > 0)));
      const hasAnyUnsavedItems = Object.values(cleanedRoundItemsMap).some(list => list.some(i => i.qty > 0));
      const hasAnyItemsLeft = hasAnySavedItems || hasAnyUnsavedItems;

      if (!hasAnyItemsLeft) {
        const oid = partOrderIds[currentPartId];
        if (oid) {
          await axios.delete(`/api/orders/${oid}`);
        }
        setParts([]);
        setRoundItems({});
        setIsEditingCart(false);
        clearDraft();
        if (shouldNavigateToMenu) {
          navigate('/tables');
        }
        return;
      }

      // 1. Commit the parts state (decreased/deleted saved items) to backend
      const part = cleanedParts.find(p => p.id === currentPartId);
      const oid = partOrderIds[currentPartId];
      if (part && oid) {
        const flattenedItems = part.rounds.flatMap(r => r.items.map(i => ({ ...i, quantity: i.qty, round: r.roundNumber })));
        await axios.put(`/api/orders/${oid}/items`, { items: flattenedItems });
      }

      // 2. Commit the new unsaved items (from tempRoundItems) to backend
      const newUnsavedItems = cleanedRoundItemsMap[currentPartId] || [];
      if (newUnsavedItems.length > 0) {
        if (oid) {
          await axios.patch(`/api/orders/${oid}/add-items`, { items: newUnsavedItems.map(i => ({ ...i, quantity: i.qty })) });
        } else {
          // If no order ID exists yet, saveRound will create a new order on the backend!
          setRoundItems(cleanedRoundItemsMap);
          setParts(cleanedParts);
          const savedId = await saveRound(currentPartId, { closeAfterSave: false, ignoreLock: true });
          if (!savedId) throw new Error("Failed to create order");
          setIsEditingCart(false);
          if (shouldNavigateToMenu) {
            navigate('/tables');
          }
          return;
        }
      }

      // 3. Update real React state with our cleaned temp state
      setParts(cleanedParts);
      setRoundItems(prev => ({ ...prev, [currentPartId]: [] })); // Clear the unsaved items since they are saved!
      setIsEditingCart(false);

      // Save draft to localStorage (which is now empty for this table)
      saveDraft(cleanedParts, { ...roundItems, [currentPartId]: [] });

      if (shouldNavigateToMenu) {
        navigate('/tables');
      }

      // Show success toast/message
      setRoundMsg(true);
      setTimeout(() => setRoundMsg(false), 2000);

    } catch (err) {
      console.error('Failed to save cart changes:', err);
      alert('Failed to save changes: ' + (err.response?.data?.error || err.message));
      throw err;
    } finally {
      isSavingRef.current = false;
    }
  };

  // Confirm & Save from cart screen
  const handleConfirmAndSave = async () => {
    // Save changes first
    await handleSaveCartChanges(false);
    // Settle with chosen paymentMode
    await handleSettle(currentPartId, 'none');
  };

  const handleKOTHold = async () => {
    if (isEditingCart) {
      await handleSaveCartChanges(true);
    } else {
      await saveRound(currentPartId, { closeAfterSave: true });
    }
  };

  const handleKOTBill = async () => {
    const unsaved = currentRoundOf(currentPartId);
    let oid = partOrderIds[currentPartId];
    if (unsaved.length > 0) {
      const savedId = await saveRound(currentPartId);
      if (savedId) oid = savedId;
    }
    if (!oid && activeAllItems.length === 0) { alert('No items added yet.'); return; }
    onScreenChange?.('cart');
  };

  // ── Print area ────────────────────────────────────────────────────────────────────────────
  const renderPrintBill = ({ partId }) => {
    const bill = buildBill(partId);
    return (
      <div className="hidden print:block print-only font-sans" ref={billRef}>
        <div className="text-center font-black text-xl mb-2">{bill.restaurantName}</div>
        {(bill.restaurantPhone || bill.restaurantAddress) && (
          <div className="flex justify-between text-sm mb-1">
            <span>{bill.restaurantPhone ? `Ph: ${bill.restaurantPhone}` : ''}</span>
            <span className="text-right">{bill.restaurantAddress || ''}</span>
          </div>
        )}
        {(bill.fssaiNumber || bill.gstNumber) && (
          <div className="flex justify-between text-xs text-gray-600 mb-2">
            <span>{bill.fssaiNumber ? `FSSAI: ${bill.fssaiNumber}` : ''}</span>
            <span>{bill.gstNumber ? `GSTIN: ${bill.gstNumber}` : ''}</span>
          </div>
        )}
        <div className="border-t border-dashed border-gray-400 my-2"></div>
        <div className="relative my-3">
          <div className="text-center font-black text-base tracking-[0.3em] uppercase">Invoice</div>
          <div className="absolute left-1 top-1/2 -translate-y-[65%] text-xs text-slate-700 text-left">
            <div>Mode: <span className="font-bold">{bill.paymentType === 'Guest' ? 'Guest' : bill.paymentMode}</span></div>
            {bill.paymentType === 'Guest' && bill.guestNote && <div className="italic text-[10px]">Note: {bill.guestNote}</div>}
          </div>
          <div className="absolute right-1 top-1/2 -translate-y-[65%] text-xs text-slate-700 text-right">
            <div>Order ID: {formatOrderDisplay(bill.orderNumber, bill.orderId)}</div>
          </div>
        </div>
        {bill.items.map((item, i) => (
          <div key={i} className="flex justify-between text-base mb-1.5">
            <span>{item.name} × {item.qty}</span>
            <span>₹{(item.price * item.qty).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-400 mt-3 pt-3">
          {bill.txList.length > 0 && (
            <>
              <div className="flex justify-between text-sm mb-1 text-slate-700">
                <span>Subtotal</span><span>₹{bill.sub.toFixed(2)}</span>
              </div>
              {bill.txList.map((t, i) => (
                <div key={i} className="flex justify-between text-sm mb-1 text-slate-700">
                  <span>{t.name} ({t.pct}%)</span><span>₹{t.amt.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-gray-400 my-2"></div>
            </>
          )}
          <div className="flex justify-between font-black text-xl mb-3">
            <span>TOTAL</span><span>₹{bill.total.toFixed(2)}</span>
          </div>
          <div className="border-t border-dashed border-gray-400 mb-3"></div>
        </div>
        <p className="text-center text-sm mt-4">Thank you! Visit again 🙏</p>
      </div>
    );
  };

  // ── Derived for active part ────────────────────────────────────────────────────────────────
  const activePartData = parts[activePart];
  const isReadOnly = isHistoryView || activePartData?.status === 'Paid' || activePartData?.status === 'Cancelled';
  const isWaiter = user?.role === 'Waiter';
  const activeAllItems = activePartData ? allItemsForPart(activePartData.id) : [];
  const activeCurrent = currentRoundOf(currentPartId);
  const billInfo = activePartData ? buildBill(activePartData.id) : null;
  const activeSub = billInfo ? billInfo.sub : 0;
  const activeTaxes = billInfo ? billInfo.txList : [];
  const activeTotal = billInfo ? billInfo.total : 0;
  const activeExtraChargesTotal = billInfo ? billInfo.extraChargesTotal : 0;
  const activeExtraCharges = billInfo ? billInfo.extraCharges : [];
  const activeDiscountAmount = billInfo ? billInfo.discountAmount : 0;
  const activeDiscountType = billInfo ? billInfo.discountType : 'None';
  const activeDiscountValue = billInfo ? billInfo.discountValue : 0;
  const cartItemCount = activeAllItems.reduce((s, i) => s + i.qty, 0);

  // Auto-adjust split or cash/online amounts when total cart value changes
  useEffect(() => {
    if (paymentMode === 'Cash') {
      setCashAmount(activeTotal);
      setOnlineAmount(0);
    } else if (paymentMode === 'Split') {
      setCashAmount(Math.floor(activeTotal / 2));
      setOnlineAmount(activeTotal - Math.floor(activeTotal / 2));
    } else {
      setOnlineAmount(activeTotal);
      setCashAmount(0);
    }
  }, [activeTotal, paymentMode]);

  // ── LOADING ───────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    );
  }

  // Payment modes for cart screen - simplified
  const paymentModes = ['Cash', 'UPI', 'Split'];

  // ── Variations modal ──────────────────────────────────────────────────────────────────────
  const renderVariationsModal = ({ item, onClose }) => {
    if (!item) return null;
    return (
      <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0" onClick={closeModals}>
        <div className="bg-white rounded-t-2xl w-full flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* Header - Item Name focused */}
          <div className="flex items-start gap-3 px-6 py-4 border-b border-slate-50 shrink-0">
            <button onClick={closeModals} className="w-10 h-10 -ml-2 -mt-1.5 flex items-center justify-center text-slate-900 active:scale-95 transition-all">
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
            <h3 className="font-black text-slate-900 text-[18px] tracking-tight leading-snug">
              {item.name} <span className="text-slate-400 font-bold">(Choose Options)</span>
            </h3>
          </div>

          {/* List - Clean White UI */}
          <div className="flex-1 overflow-y-auto px-4 py-6 bg-white no-scrollbar">
            <div className="space-y-3">
              {(item.variations || []).map(v => {
                const varId = `${item._id}_${v.name}`;
                const qty = tempVariations[varId] || 0;
                return (
                  <div key={v.name} className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {/* Left: Image */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100">
                      {item.image ? (
                        <img src={item.image} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                          <Utensils size={20} />
                        </div>
                      )}
                    </div>

                    {/* Center: Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-black text-slate-900 leading-tight truncate">{v.name}</p>
                      <p className="text-[12px] font-bold text-emerald-600 mt-1">₹{v.price}</p>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-xl shrink-0 border border-slate-100">
                      <button
                        onClick={() => {
                          setTempVariations(prev => ({ ...prev, [varId]: Math.max(0, (prev[varId] || 0) - 1) }));
                        }}
                        disabled={qty === 0}
                        className={cn(
                          'w-8 h-8 flex items-center justify-center rounded-lg transition-all',
                          qty === 0 ? 'text-slate-200' : 'bg-white text-slate-900 shadow-sm active:scale-90'
                        )}
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                      <span className={cn('w-5 text-center text-[14px] font-black', qty > 0 ? 'text-slate-900' : 'text-slate-300')}>{qty}</span>
                      <button
                        onClick={() => {
                          setTempVariations(prev => ({ ...prev, [varId]: (prev[varId] || 0) + 1 }));
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-white bg-blue-600 shadow-md active:scale-90 transition-all"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer - KOT Style Buttons */}
          <div className="p-4 bg-white border-t border-slate-100 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
            <button
              onClick={closeModals}
              className="flex-1 py-3.5 rounded-xl font-bold text-[13px] border border-slate-300 bg-white text-slate-800 active:scale-[0.97] transition-all tracking-wide shadow-sm"
            >
              Discard Changes
            </button>
            <button
              onClick={() => {
                if (isEditingCart) {
                  // 1. Update tempRoundItems
                  setTempRoundItems(prev => {
                    const list = [...(prev[currentPartId] || [])];
                    const filtered = list.filter(it => !it.menuId.startsWith(`${item._id}_`));

                    const newItems = [];
                    (item.variations || []).forEach(v => {
                      const varId = `${item._id}_${v.name}`;
                      const q = tempVariations[varId] || 0;

                      // Check if it's a saved item
                      const originalPart = parts.find(p => p.id === currentPartId);
                      const isSaved = originalPart?.rounds.some(r => r.items.some(it => it.menuId === varId));

                      if (!isSaved) {
                        // For unsaved items, keep it even if q is 0 when isEditingCart is true
                        newItems.push({ menuId: varId, name: `${item.name} (${v.name})`, price: v.price, qty: q });
                      }
                    });

                    return { ...prev, [currentPartId]: [...filtered, ...newItems] };
                  });

                  // 2. Update tempParts
                  setTempParts(prev => {
                    return prev.map(p => {
                      if (p.id !== currentPartId) return p;
                      const newRounds = p.rounds.map(r => {
                        const newItems = r.items.map(it => {
                          if (it.menuId.startsWith(`${item._id}_`)) {
                            const q = tempVariations[it.menuId] !== undefined ? tempVariations[it.menuId] : it.qty;
                            return { ...it, qty: q };
                          }
                          return it;
                        });
                        return { ...r, items: newItems };
                      });
                      return { ...p, rounds: newRounds };
                    });
                  });
                } else {
                  // Apply all temp variations to the main roundItems
                  setRoundItems(prev => {
                    const list = [...(prev[currentPartId] || [])];
                    // Filter out existing variation items for THIS parent item
                    const filtered = list.filter(it => !it.menuId.startsWith(`${item._id}_`));

                    // Add back new ones from tempVariations if qty > 0
                    const newItems = [];
                    (item.variations || []).forEach(v => {
                      const varId = `${item._id}_${v.name}`;
                      const q = tempVariations[varId] || 0;
                      if (q > 0) {
                        newItems.push({ menuId: varId, name: `${item.name} (${v.name})`, price: v.price, qty: q });
                      }
                    });

                    return { ...prev, [currentPartId]: [...filtered, ...newItems] };
                  });
                }
                closeModals();
              }}
              className="flex-1 py-3.5 rounded-xl font-bold text-[13px] text-white bg-blue-600 active:scale-[0.97] transition-all shadow-md shadow-blue-200 tracking-wide"
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiscardModal = () => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0">
      <div className="bg-white rounded-t-2xl w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom)]" onClick={e => e.stopPropagation()}>
        {/* Grabber Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={28} className="text-[#FF5A36]" />
          </div>
          <h3 className="text-[20px] font-black text-slate-900 mb-2">Unsaved Items!</h3>
          <p className="text-[14px] text-slate-500 leading-relaxed px-4">
            You have items that aren't sent to kitchen. What would you like to do?
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2.5 p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex gap-2.5">
            <button
              onClick={() => {
                setRoundItems({}); // Explicitly clear local unsaved state
                clearDraft(); // Clear localStorage draft
                closeModals();
                onClose(); // Exit TableView completely
              }}
              className="flex-1 py-4 rounded-xl font-bold text-[14px] border border-red-200 bg-white text-red-500 active:scale-[0.98] transition-all"
            >
              Discard Unsaved
            </button>
            <button
              onClick={() => {
                closeModals();
                handleKOTHold();
                // If we were in cart, we might want to stay in TableView (menu) after save, 
                // but handleKOTHold with closeAfterSave: true will close it. 
                // That's usually what "KOT & Exit" implies.
              }}
              className="flex-1 py-4 rounded-xl font-bold text-[14px] border border-slate-300 bg-white text-slate-900 active:scale-[0.98] transition-all shadow-sm"
            >
              KOT & Exit
            </button>
          </div>
          <button
            onClick={closeModals}
            className="w-full py-4 rounded-xl font-bold text-[14px] text-white bg-slate-900 active:scale-[0.98] transition-all shadow-xl shadow-slate-200"
          >
            Cancel (Keep Editing)
          </button>
        </div>
      </div>
    </div>
  );

  const renderDeleteModal = () => (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0" onClick={closeModals}>
      <div className="bg-white rounded-t-2xl w-full overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={28} className="text-red-500" />
          </div>
          <h3 className="text-[20px] font-black text-slate-900 mb-2">Delete Permanently?</h3>
          <p className="text-[14px] text-slate-500 leading-relaxed">
            This action cannot be undone. This order will be removed from your history forever.
          </p>
        </div>
        <div className="flex flex-col border-t border-slate-100">
          <button
            onClick={handleDeleteOrder}
            className="w-full py-4 text-[15px] font-bold text-red-500 active:bg-red-50 transition-colors"
          >
            Yes, Delete it
          </button>
          <button
            onClick={closeModals}
            className="w-full py-4 text-[15px] font-bold text-slate-400 border-t border-slate-100 active:bg-slate-50 transition-colors uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // ── Transfer Modal ────────────────────────────────────────────────────────────────────────

  const renderTransferModal = () => {
    // Group tables by area/section, exclude current table
    const otherTables = availableTables.filter(t => t.tableId !== tableId);
    const sections = otherTables.reduce((acc, t) => {
      const area = (t.area || 'Main Floor').trim();
      if (!acc[area]) acc[area] = [];
      acc[area].push(t);
      return acc;
    }, {});
    const sectionNames = Object.keys(sections);

    return (
      <div className="fixed inset-0 z-[400] bg-white flex flex-col animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
        {/* Header - Minimalist Style with Right-Aligned Table ID */}
        <div className="flex items-center gap-2 px-3 h-16 border-b border-slate-50 shrink-0">
          <button onClick={closeModals} className="w-10 h-10 flex items-center justify-center text-slate-900 active:scale-95 transition-all">
            <ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <h3 className="font-black text-slate-900 text-[19px] tracking-tight ml-1">
            Transfer Order
          </h3>
          <div className="flex-1" />
          <div className="pr-3">
            <span className="text-[19px] font-black text-blue-600 lg:text-[#FF5A36] uppercase tracking-tight leading-none">{tableId || parts[activePart]?.label || 'Current'}</span>
          </div>
        </div>

        {/* Scrollable table list - Clean White UI with Black Text */}
        <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar bg-white">
          {sectionNames.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-900">
              <LayoutGrid size={48} strokeWidth={1} className="mb-4 opacity-10" />
              <p className="text-sm font-black uppercase tracking-widest">No available tables</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-12 pb-20">
              {sectionNames.map(area => (
                <div key={area}>
                  <div className="flex items-center gap-4 mb-6">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">{area}</p>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {sections[area].map(t => {
                      const isOccupied = t.status === 'Occupied';
                      const isSelected = selectedTransferTable === t.tableId;
                      const isSelf = t.tableId === tableId;

                      return (
                        <button
                          key={t._id || t.tableId}
                          onClick={() => !isSelf && setSelectedTransferTable(t.tableId)}
                          disabled={isSelf}
                          className={cn(
                            "relative h-24 flex flex-col items-center justify-center rounded-2xl border-2 transition-all duration-300",
                            isSelf
                              ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed opacity-50"
                              : isSelected
                                ? "bg-blue-600 lg:bg-[#FF5A36] border-blue-600 lg:border-[#FF5A36] text-white shadow-xl shadow-blue-500/30 lg:shadow-orange-500/30 active:scale-95"
                                : isOccupied
                                  ? "bg-blue-50/50 lg:bg-orange-50/50 border-blue-100 lg:border-orange-100 text-slate-900 hover:border-blue-400 lg:hover:border-[#FF5A36] hover:shadow-lg active:scale-95"
                                  : "bg-white border-slate-100 text-slate-900 hover:border-blue-400 lg:hover:border-[#FF5A36] hover:shadow-lg active:scale-95"
                          )}
                        >
                          <span className="text-2xl font-black tracking-tight">{t.tableId}</span>
                          <span className={cn("text-[10px] font-black uppercase tracking-widest mt-1", isSelected ? "text-blue-100 lg:text-orange-100" : (isOccupied ? "text-blue-600 lg:text-[#FF5A36]" : "text-slate-400"))}>
                            {isSelf ? "Current" : (isOccupied ? "Occupied" : "Empty")}
                          </span>
                          {isSelected && <div className="absolute -top-2 -right-2 w-7 h-7 bg-white text-blue-600 lg:text-[#FF5A36] rounded-full flex items-center justify-center border-2 border-blue-600 lg:border-[#FF5A36] shadow-lg animate-in zoom-in-50 duration-200"><Check size={14} strokeWidth={4} /></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Sticky */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
          <div className="max-w-xl mx-auto w-full flex gap-3">
            <button
              onClick={closeModals}
              className="flex-1 py-3 rounded-xl font-bold text-[13px] border border-slate-300 bg-white text-slate-800 active:scale-[0.97] transition-all tracking-wide shadow-sm"
            >
              Go Back
            </button>
            <button
              onClick={() => handleTransfer(selectedTransferTable)}
              disabled={!selectedTransferTable}
              className={cn(
                "flex-1 py-3 rounded-xl font-bold text-[13px] text-white bg-blue-600 lg:bg-[#FF5A36] active:scale-[0.97] transition-all shadow-md tracking-wide",
                !selectedTransferTable ? "opacity-40 cursor-not-allowed" : "shadow-blue-200 lg:shadow-orange-100"
              )}
            >
              Confirm Move
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDiscountModal = () => {
    if (!showDiscountModal) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDiscountModal(false)}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[17px] font-bold text-slate-900">Add Discount</h2>
            <button onClick={() => setShowDiscountModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X size={18}/></button>
          </div>
          
          <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setTempDiscountType('Percentage')} className={cn('flex-1 py-2 text-[12px] font-bold rounded-lg transition-all', tempDiscountType === 'Percentage' ? 'bg-white shadow text-blue-600' : 'text-slate-500')}>Percentage (%)</button>
            <button onClick={() => setTempDiscountType('Fixed')} className={cn('flex-1 py-2 text-[12px] font-bold rounded-lg transition-all', tempDiscountType === 'Fixed' ? 'bg-white shadow text-blue-600' : 'text-slate-500')}>Fixed (₹)</button>
          </div>

          <div className="mb-3 relative">
            <input type="number" value={tempDiscountValue} onChange={e => setTempDiscountValue(e.target.value)} placeholder="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-10 text-[16px] font-bold outline-none focus:border-blue-500 text-slate-800" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{tempDiscountType === 'Percentage' ? '%' : '₹'}</span>
          </div>

          {tempDiscountType === 'Percentage' && (
            <div className="flex gap-2 mb-5">
              {[5, 10, 15, 20].map(pct => (
                <button key={pct} onClick={() => setTempDiscountValue(pct)} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">{pct}%</button>
              ))}
            </div>
          )}
          {tempDiscountType === 'Fixed' && (
            <div className="flex gap-2 mb-5">
              <button onClick={() => setTempDiscountValue(50)} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">₹50</button>
              <button onClick={() => setTempDiscountValue(100)} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">₹100</button>
              <button onClick={() => setTempDiscountValue(activeSub)} className="flex-[2] py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors">Full (₹{Math.floor(activeSub)})</button>
            </div>
          )}
          
          <div className="flex gap-2">
            <button onClick={() => { setPartDiscount(prev => ({...prev, [currentPartId]: { type: 'None', value: 0 }})); setShowDiscountModal(false); }} className="flex-1 py-3 rounded-xl font-bold text-[13px] border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all">Clear</button>
            <button onClick={() => { setPartDiscount(prev => ({...prev, [currentPartId]: { type: tempDiscountType, value: Number(tempDiscountValue) }})); setShowDiscountModal(false); }} className="flex-[2] py-3 rounded-xl font-bold text-[13px] text-white bg-blue-600 shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all">Apply Discount</button>
          </div>
        </div>
      </div>
    );
  };

  const renderExtraChargeModal = () => {
    if (!showExtraChargeModal) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowExtraChargeModal(false)}>
        <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[17px] font-bold text-slate-900">Extra Charges</h2>
            <button onClick={() => setShowExtraChargeModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X size={18}/></button>
          </div>
          
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            <span className="text-[10px] text-slate-400 font-bold uppercase py-1.5 px-1 shrink-0">Quick Add:</span>
            {['Packaging', 'Delivery', 'Service'].map(n => (
              <button key={n} onClick={() => setTempExtraCharges([...tempExtraCharges, { name: n, amount: '' }])} className="px-3 py-1.5 shrink-0 rounded-full border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-600 hover:bg-blue-100 transition-colors">
                + {n}
              </button>
            ))}
          </div>
          
          <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-1">
            {tempExtraCharges.length === 0 ? <p className="text-[12px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">No extra charges added.</p> : tempExtraCharges.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={c.name} onChange={e => { const updated = [...tempExtraCharges]; updated[i].name = e.target.value; setTempExtraCharges(updated); }} placeholder="e.g. Packaging" className="flex-1 w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-semibold" />
                <input type="number" value={c.amount} onChange={e => { const updated = [...tempExtraCharges]; updated[i].amount = e.target.value; setTempExtraCharges(updated); }} placeholder="₹0" className="w-20 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-semibold" />
                <button onClick={() => { const updated = tempExtraCharges.filter((_, idx) => idx !== i); setTempExtraCharges(updated); }} className="p-2 shrink-0 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>

          <button onClick={() => setTempExtraCharges([...tempExtraCharges, { name: '', amount: '' }])} className="w-full py-2.5 mb-5 rounded-xl border-2 border-dashed border-slate-200 text-[12px] font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-center gap-1"><Plus size={14} strokeWidth={3} /> Add Charge</button>

          <div className="flex gap-2">
            <button onClick={() => setShowExtraChargeModal(false)} className="flex-1 py-3 rounded-xl font-bold text-[13px] border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all">Cancel</button>
            <button onClick={() => { setPartExtraCharges(prev => ({...prev, [currentPartId]: tempExtraCharges.filter(c => c.name && Number(c.amount) > 0) })); setShowExtraChargeModal(false); }} className="flex-[2] py-3 rounded-xl font-bold text-[13px] text-white bg-blue-600 shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all">Save Charges</button>
          </div>
        </div>
      </div>
    );
  };


  // ── Menu Item Card — name outside, controls anchored bottom-right ─────────────────────────
  const renderMenuItemCard = ({ item, overrideQty, key }) => {
    const hasVars = item.variations?.length >= 2;
    const isSingleVar = item.variations?.length === 1;

    const basePrice = hasVars
      ? Math.min(...item.variations.map(v => v.price))
      : isSingleVar
        ? item.variations[0].price
        : item.price;

    const inCartItems = activeCurrent.filter(i => i.menuId === item._id || i.menuId.startsWith(`${item._id}_`));
    const currentQty = inCartItems.reduce((acc, i) => acc + i.qty, 0);
    // overrideQty lets the cart screen show total (saved + unsaved) qty
    const totalQty = overrideQty !== undefined ? overrideQty : currentQty;

    const handleAdd = (e) => {
      e?.stopPropagation();
      if (isReadOnly) return;
      if (hasVars) openVariations(item);
      else if (isSingleVar) addVariationItem(item, item.variations[0]);
      else addItem(item);
    };
    const handleRemove = (e) => {
      e?.stopPropagation();
      if (isReadOnly) return;
      if (hasVars) openVariations(item);
      else if (isSingleVar) removeVariationItem(item, item.variations[0]);
      else updateQty(item._id, -1);
    };

    return (
      <div key={key} className="flex flex-col gap-1.5">
        {/* ── Card box — image only, no name inside ── */}
        <div
          className="relative rounded-2xl overflow-hidden bg-[#f2f2f7] border border-slate-200/80 shadow-sm"
          style={{ aspectRatio: '3/4' }}
        >
          {/* Price badge — white bg, black text, top right */}
          <span className="absolute top-2 right-2 z-10 bg-white text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-lg leading-tight shadow-sm">
            ₹{basePrice}{hasVars ? '+' : ''}
          </span>

          {/* Options badge for multi-var — top left */}
          {hasVars && (
            <span className="absolute top-2 left-2 z-10 bg-indigo-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
              Opts
            </span>
          )}

          {/* Image or placeholder */}
          {item.image ? (
            <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImageIcon size={26} strokeWidth={1} className="text-slate-300" />
            </div>
          )}

          {/* ── Controls anchored BOTTOM-RIGHT ── */}
          <div
            className="absolute bottom-2 right-2 z-10 flex items-center justify-end"
            onClick={e => e.stopPropagation()}
          >
            {(totalQty > 0 || (isEditingCart && overrideQty !== undefined)) ? (
              /* Blue pill: [−] [count] [+] */
              <div className="flex items-center bg-blue-600 lg:bg-[#FF5A36] rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={handleRemove}
                  disabled={isReadOnly}
                  className="w-8 h-8 flex items-center justify-center text-white active:bg-blue-700 lg:active:bg-orange-600 transition-colors"
                >
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="px-1 min-w-[24px] text-center text-[14px] font-black text-white">
                  {totalQty}
                </span>
                <button
                  onClick={handleAdd}
                  disabled={isReadOnly}
                  className="w-8 h-8 flex items-center justify-center text-white active:bg-blue-700 lg:active:bg-orange-600 transition-colors"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            ) : (
              /* White + button — blue border, rounded-lg, no shadow */
              <button
                onClick={handleAdd}
                disabled={isReadOnly}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-blue-500 lg:border-[#FF5A36] text-blue-600 lg:text-[#FF5A36] active:scale-90 transition-all disabled:opacity-50 shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* ── Name OUTSIDE the card, below it ── */}
        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-5 px-0.5 mt-0.5">
          {item.name}
          {isSingleVar && <span className="text-slate-500 font-medium"> · {item.variations[0].name}</span>}
        </p>
      </div>
    );
  };

  // ── DESKTOP UI ────────────────────────────────────────────────────────────────────────────
  const renderDesktopUI = () => {
    return (
      <div className="hidden md:flex flex-1 overflow-hidden bg-[#f8f9fa]">
        
        {/* ── LEFT: Menu Area ── */}
        <div className="flex-1 flex flex-col min-w-0 h-full bg-white overflow-hidden relative shadow-sm border-r border-slate-100">
          
          {/* HEADER */}
          <div className="flex items-center gap-2 px-6 h-14 bg-white border-b border-slate-100 no-print shrink-0 mt-2">
            <button onClick={handleBack} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
              <ArrowLeft size={16} className="text-slate-600" />
            </button>
            <div className="flex flex-col leading-tight ml-2">
              <span className="text-sm font-bold text-slate-900">{tableId || parts[0]?.label || 'Order'}</span>
              <span className="text-[10px] text-slate-400">{tableId ? 'Dine-in' : 'Parcel'}</span>
            </div>
            <div className="flex-1" />
            {!isReadOnly && parts.length > 0 && <>
              <button onClick={() => openModal('transfer')} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors">Transfer</button>
              <button onClick={addPart} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors">Split</button>
            </>}
            {isReadOnly && isHistoryView && (
              <button onClick={() => openModal('delete')} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-colors shrink-0 ml-1">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Parts Tabs */}
          {parts.length > 1 && (
            <div className="flex gap-2 px-6 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto no-print shrink-0">
              {parts.map((p, idx) => {
                const its = allItemsForPart(p.id);
                const tot = totalOf(subtotalOf(its), taxListOf(subtotalOf(its)));
                return (
                  <button key={p.id} onClick={() => setActivePart(idx)} className={cn('flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all', activePart === idx ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                    <Users size={11} />{p.label}
                    {its.length > 0 && <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded-full', activePart === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>₹{tot.toFixed(0)}</span>}
                    <span key={`remove-${p.id}`} onClick={e => { e.stopPropagation(); removePart(idx); }} className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-xs cursor-pointer text-slate-400 hover:text-red-500">×</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search bar */}
          <div className="flex gap-2.5 px-6 py-3 bg-white shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
                className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[13px] font-semibold text-slate-700 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white transition-colors" />
            </div>
            {isMicSupported && !isReadOnly && (
              <button onClick={toggleListening} className={cn('w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border transition-all relative', isListening ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-[#ff5a36] hover:border-[#ff5a36]')}>
                {isListening && <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-40" />}
                {isListening ? <Mic size={15} /> : <MicOff size={15} />}
              </button>
            )}
          </div>
          {transcriptResult && (
            <div className={cn('mx-6 mb-2 px-3 py-2 rounded-xl text-xs font-semibold', transcriptResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : transcriptResult.startsWith('❌') || transcriptResult.startsWith('⚠') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-800 text-white')}>{transcriptResult}</div>
          )}

          {/* Horizontal Categories */}
          <div className="px-6 pb-4 bg-white shrink-0 no-print">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap border shrink-0 transition-all flex items-center gap-1.5',
                    catFilter === cat
                      ? 'bg-white border-blue-500 text-blue-600 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {cat === 'All' ? <Utensils size={12} /> : <VegDot category={cat} />}
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Center Menu Grid */}
          <div className="flex-1 overflow-y-auto bg-[#f8f9fa] px-6 py-4">
            {filteredMenu.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Utensils size={28} strokeWidth={1} className="mb-3 opacity-40" />
                <p className="text-[13px] font-semibold">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filteredMenu.map(item => (
                  <div key={item._id}>
                    {renderMenuItemCard({ item })}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT: Cart Area (QuickOrder Style) ── */}
        <div className="hidden lg:flex w-[400px] flex-col h-full bg-white border-l border-slate-200 shrink-0 z-50">
          
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <h2 className="text-[15px] font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <ShoppingCart size={16} className="text-[#4B6FFF]" />
              Current Order
            </h2>
            {activeAllItems.length > 0 && !isReadOnly && (
              <button
                onClick={() => openModal('discard')}
                className="text-[11px] font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} /> Clear
              </button>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-5 py-2 no-scrollbar bg-white">
            {activeAllItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Utensils size={24} className="text-slate-300" />
                </div>
                <p className="text-[13px] font-semibold text-slate-400">Order is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeAllItems.map(item => {
                  const menuItem = menuItems.find(m => item.menuId === m._id || item.menuId.startsWith(m._id));
                  const name = item.name || menuItem?.name || 'Item';
                  return (
                  <div key={item.menuId} className="py-3.5 flex gap-3.5">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 bg-slate-50 border border-slate-100 flex items-center justify-center">
                      {menuItem?.image ? (
                        <img src={menuItem.image} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <Utensils size={16} className="text-slate-300" />
                      )}
                    </div>
                    
                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center overflow-hidden pr-2">
                          <span className="text-[14px] font-bold text-slate-800 leading-none truncate mt-0.5">{name}</span>
                        </div>
                        <span className="text-[14px] font-bold text-slate-900 leading-none mt-0.5 shrink-0">₹{item.price * item.qty}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-slate-400">₹{item.price}</span>
                        
                        {/* Sleek Pill Stepper */}
                        {!isReadOnly && (
                          <div className="flex items-center bg-[#f2f2f7] rounded-full h-7 px-1">
                            <button 
                              onClick={() => updateQty(item.menuId, -1)} 
                              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-full transition-colors"
                            >
                              <Minus size={12} strokeWidth={3} />
                            </button>
                            <span className="text-[12px] font-bold w-6 text-center text-slate-800">{item.qty}</span>
                            <button 
                              onClick={() => updateQty(item.menuId, 1)} 
                              className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 rounded-full transition-colors"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>



          {/* ── Desktop Cart Bottom Checkout Panel (QuickOrder Style) ── */}
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 shrink-0 relative shadow-[0_-10px_40px_rgba(79,70,229,0.2)] border-t border-indigo-500/30 flex flex-col">

            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden mb-4 shadow-sm relative z-20">
              
              <div className="px-3 py-2.5 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Payment</p>
                <div className="flex bg-slate-200/60 p-0.5 rounded-lg relative overflow-hidden">
                  <div className={cn("absolute top-0.5 bottom-0.5 w-[calc(33.33%-2px)] rounded-md shadow-sm bg-white transition-all duration-300",
                    paymentMode === 'UPI' || paymentMode === 'Online' ? "translate-x-0" :
                      paymentMode === 'Cash' ? "translate-x-[calc(100%+2px)]" :
                        "translate-x-[calc(200%+4px)]")} />
                  <button onClick={() => { setPaymentMode('UPI'); setOnlineAmount(activeTotal); setCashAmount(0); }} className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wide relative z-10 rounded-md transition-colors", (paymentMode === 'UPI' || paymentMode === 'Online') ? "text-slate-800" : "text-slate-500 hover:text-slate-700")}>UPI</button>
                  <button onClick={() => { setPaymentMode('Cash'); setCashAmount(activeTotal); setOnlineAmount(0); }} className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wide relative z-10 rounded-md transition-colors", paymentMode === 'Cash' ? "text-slate-800" : "text-slate-500 hover:text-slate-700")}>Cash</button>
                  <button onClick={() => { setPaymentMode('Split'); setCashAmount(Math.floor(activeTotal / 2)); setOnlineAmount(activeTotal - Math.floor(activeTotal / 2)); }} className={cn("px-3 py-1 text-[10px] font-bold uppercase tracking-wide relative z-10 rounded-md transition-colors", paymentMode === 'Split' ? "text-slate-800" : "text-slate-500 hover:text-slate-700")}>Split</button>
                </div>
              </div>

              {paymentMode === 'Split' && (
                <div className="flex gap-3 px-3 py-3 border-b border-slate-100 bg-white">
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">Cash (₹)</span>
                    <input type="text" inputMode="decimal" value={cashAmount} onChange={e => { const val = Number(e.target.value); setCashAmount(val); setOnlineAmount(Math.max(0, activeTotal - val)); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[14px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF] transition-colors shadow-sm" placeholder="0" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest block mb-1">UPI (₹)</span>
                    <input type="text" inputMode="decimal" value={onlineAmount} onChange={e => { const val = Number(e.target.value); setOnlineAmount(val); setCashAmount(Math.max(0, activeTotal - val)); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[14px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF] transition-colors shadow-sm" placeholder="0" />
                  </div>
                </div>
              )}

              {/* Discount / Pack */}
              {!isReadOnly && (
                <div className="flex relative border-b border-slate-100">
                  <div className="flex-1 px-3 py-2.5 border-r border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Discount (₹)</p>
                    <input
                      type="text" readOnly value={activeDiscountType === 'Fixed' ? activeDiscountValue : ''} onClick={() => setShowNumpad(true)}
                      className="w-full text-[16px] font-bold text-emerald-500 outline-none placeholder:text-slate-300 cursor-pointer" placeholder="0"
                    />
                  </div>
                  <div className="flex-1 p-2 flex items-center justify-center">
                    {(() => {
                      const packPrice = user?.packagingCharge || 20;
                      const packObj = (activeExtraCharges || []).find(c => c.name === 'Packaging');
                      const packQty = packObj ? packObj.amount / packPrice : 0;
                      const handleUpdatePack = (delta) => {
                        const newQty = Math.max(0, packQty + delta);
                        const charges = [...(partExtraCharges[currentPartId] || [])];
                        const packIdx = charges.findIndex(c => c.name === 'Packaging');
                        if (packIdx >= 0) charges.splice(packIdx, 1);
                        if (newQty > 0) charges.push({ name: 'Packaging', amount: newQty * packPrice });
                        setPartExtraCharges(prev => ({ ...prev, [currentPartId]: charges }));
                      };
                      if (packQty === 0) {
                        return (
                          <button onClick={() => handleUpdatePack(1)} className="w-full h-full rounded-lg flex items-center justify-center gap-2 transition-all border bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                            <Package size={16} strokeWidth={2.5} />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Add Pack</span>
                          </button>
                        );
                      }
                      return (
                        <div className="w-full h-full py-1.5 flex items-center justify-between px-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-600 shadow-sm">
                          <button onClick={() => handleUpdatePack(-1)} className="w-8 h-full flex items-center justify-center hover:bg-amber-100 rounded-md transition-colors"><Minus size={14} strokeWidth={3} /></button>
                          <span className="text-[11px] font-bold uppercase tracking-widest">{packQty} Pack</span>
                          <button onClick={() => handleUpdatePack(1)} className="w-8 h-full flex items-center justify-center hover:bg-amber-100 rounded-md transition-colors"><Plus size={14} strokeWidth={3} /></button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Smooth Expanding Numpad */}
              <div className={cn("grid transition-all duration-300 ease-in-out border-slate-100", showNumpad ? "grid-rows-[1fr] opacity-100 border-b" : "grid-rows-[0fr] opacity-0 border-b-0")}>
                <div className="overflow-hidden">
                  <CustomNumpad value={activeDiscountType === 'Fixed' ? activeDiscountValue : ''} onChange={(val) => setPartDiscount(prev => ({ ...prev, [currentPartId]: val ? { type: 'Fixed', value: Number(val) } : null }))} onClose={() => setShowNumpad(false)} />
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="px-3 py-3 bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                  <span className="text-[14px] font-bold text-slate-900 leading-none">₹{activeSub.toFixed(2)}</span>
                </div>
                {activeExtraCharges.map((c, i) => (
                  <div key={i} className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{c.name}</span>
                    <span className="text-[14px] font-bold text-slate-900 leading-none">₹{Number(c.amount).toFixed(2)}</span>
                  </div>
                ))}
                {activeDiscountAmount > 0 && (
                  <div className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">Discount ({activeDiscountType})</span>
                    <span className="text-[14px] font-bold text-emerald-600 leading-none">-₹{activeDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                {activeTaxes.map(t => (
                  <div key={t.name} className="flex justify-between items-end">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.name} ({t.pct}%)</span>
                    <span className="text-[14px] font-bold text-slate-900 leading-none">+₹{t.amt.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-end justify-between px-1 mb-4 relative z-20">
              <div className="flex flex-col">
                <span className="text-indigo-200 text-[12px] font-bold uppercase tracking-widest mb-1 shadow-sm">Total Pay</span>
                <span className="text-[28px] font-black text-white leading-none drop-shadow-md">₹{activeTotal.toFixed(0)}</span>
              </div>
            </div>

            {activeCurrent.length > 0 && !isReadOnly ? (
              <button
                onClick={() => saveRound(currentPartId)}
                disabled={isDispatching}
                className="relative overflow-hidden w-full h-[52px] rounded-xl flex items-center justify-center gap-2 group active:scale-[0.98] transition-transform z-20 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <div className="absolute inset-0 bg-white transition-opacity duration-300" />
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                {roundMsg ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-600 relative z-10" />
                    <span className="text-[15px] font-black uppercase tracking-wider text-emerald-600 relative z-10">Dispatched!</span>
                  </>
                ) : (
                  <>
                    <ArrowRight size={18} className="text-indigo-600 relative z-10" />
                    <span className="text-[15px] font-black uppercase tracking-wider text-indigo-600 relative z-10">
                      Dispatch {activeCurrent.reduce((a, c) => a + c.qty, 0)} Items
                    </span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={async () => { await handleConfirmAndSave(); }}
                disabled={activeAllItems.length === 0}
                className="relative overflow-hidden w-full h-[52px] rounded-xl flex items-center justify-center gap-2 group active:scale-[0.98] transition-transform z-20 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              >
                <div className="absolute inset-0 bg-white transition-opacity duration-300" />
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <CheckCircle2 size={18} className="text-indigo-600 relative z-10" />
                <span className="text-[15px] font-black uppercase tracking-wider text-indigo-600 relative z-10">Confirm Bill</span>
              </button>
            )}

          </div>

        </div>

      </div>
    );
  };

  // ── MOBILE MENU SCREEN ────────────────────────────────────────────────────────────────────
  const renderMobileMenuScreen = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header: back arrow + title + settings icon */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={handleBack} className="text-slate-800 active:scale-95 transition-transform shrink-0">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          {parts.length > 1 ? (
            <select value={activePart} onChange={e => setActivePart(Number(e.target.value))}
              className="bg-transparent text-slate-900 text-[17px] font-bold outline-none truncate max-w-[160px]">
              {parts.map((p, idx) => <option key={p.id} value={idx}>{p.label}</option>)}
            </select>
          ) : (
            <span className="text-slate-900 font-bold text-[17px] truncate">
              {parts[0]?.label || tableId || 'Add Order'}
            </span>
          )}
          {/* {activeTotal > 0 && (
            <span className="ml-2 text-[14px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg shrink-0">
              ₹{activeTotal.toFixed(0)}
            </span>
          )} */}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnly && !isCreatingParcel && !searchParams.get('newParcel') && orderType !== 'Parcel' && (
            <>
              <button onClick={() => openModal('transfer')}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white active:scale-95">
                Transfer
              </button>
              <button onClick={addPart}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white active:scale-95">
                Split
              </button>
            </>
          )}
          <button
            onClick={() => {
              setTempCategoryLayout(categoryLayout);
              openModal('settings');
            }}
            className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all shadow-sm active:scale-90", searchParams.get('modal') === 'settings' ? "bg-slate-900 text-white shadow-lg" : "text-slate-600 bg-white border border-slate-200")}>
            <Settings size={18} strokeWidth={2.5} />
          </button>

          {searchParams.get('modal') === 'settings' && (
            <div className="fixed inset-0 z-[500] flex items-end justify-center bg-black/60 backdrop-blur-sm p-0" onClick={closeModals}>
              <div className="bg-white rounded-t-2xl w-full flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header - Super Minimal */}
                <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-50 shrink-0">
                  <button onClick={closeModals} className="w-8 h-8 -ml-1 flex items-center justify-center text-slate-900 active:scale-95 transition-all">
                    <ChevronLeft size={22} strokeWidth={2.5} />
                  </button>
                  <h3 className="font-black text-slate-900 text-[15px] tracking-tight">
                    Interface Settings
                  </h3>
                </div>

                {/* Content - Single Column Minimal List */}
                <div className="px-5 py-6 bg-white">
                  <div className="space-y-1">
                    {[
                      { id: 'horizontal', label: 'Horizontal Bar' },
                      { id: 'vertical', label: 'Vertical Sidebar' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setTempCategoryLayout(opt.id); }}
                        className="w-full flex items-center justify-between py-4 group"
                      >
                        <span className={cn(
                          "text-[14px] font-bold transition-colors",
                          tempCategoryLayout === opt.id ? "text-slate-900" : "text-slate-400 group-hover:text-slate-600"
                        )}>
                          {opt.label}
                        </span>

                        {/* Custom Radio Button */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          tempCategoryLayout === opt.id
                            ? "border-slate-900 bg-slate-900"
                            : "border-slate-200 bg-transparent"
                        )}>
                          {tempCategoryLayout === opt.id && (
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer - KOT Style Confirmation */}
                <div className="p-4 bg-white border-t border-slate-100 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                  <button
                    onClick={closeModals}
                    className="flex-1 py-3.5 rounded-xl font-bold text-[13px] border border-slate-300 bg-white text-slate-800 active:scale-[0.97] transition-all tracking-wide shadow-sm"
                  >
                    Discard Changes
                  </button>
                  <button
                    onClick={() => {
                      setCategoryLayout(tempCategoryLayout);
                      localStorage.setItem('restro_category_layout', tempCategoryLayout);
                      closeModals();
                    }}
                    className="flex-1 py-3.5 rounded-xl font-bold text-[13px] text-white bg-blue-600 lg:bg-[#FF5A36] active:scale-[0.97] transition-all shadow-md shadow-blue-200 lg:shadow-orange-100 tracking-wide"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          {isReadOnly && isHistoryView && (
            <button onClick={() => openModal('delete')} className="w-9 h-9 flex items-center justify-center rounded-lg text-red-500 bg-red-50 border border-red-100 ml-1">
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Search + Mic */}
      <div className="flex gap-2.5 px-4 py-2.5 bg-white shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[15px] text-slate-700 placeholder:text-slate-400"
          />
        </div>
        {isMicSupported && !isReadOnly && (
          <button
            onClick={toggleListening}
            className={cn(
              'w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border-2 transition-all relative',
              isListening
                ? 'bg-blue-600 lg:bg-[#FF5A36] border-blue-600 lg:border-[#FF5A36] text-white'
                : 'bg-white border-blue-500 lg:border-[#FF5A36] text-blue-500 lg:text-[#FF5A36]'
            )}
          >
            {isListening && <span className="absolute inset-0 rounded-xl bg-blue-400 lg:bg-orange-400 animate-ping opacity-30" />}
            <Mic size={18} />
          </button>
        )}
      </div>

      {/* Transcript */}
      {transcriptResult && (
        <div className={cn('mx-4 mb-1 px-3 py-2 rounded-xl text-xs font-semibold shrink-0',
          transcriptResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
            transcriptResult.startsWith('❌') || transcriptResult.startsWith('⚠') ? 'bg-red-50 text-red-600 border border-red-100' :
              'bg-slate-800 text-white')}>
          {transcriptResult}
        </div>
      )}

      {/* Category chips / Sidebar Logic */}
      {categoryLayout === 'horizontal' && (
        <div className="flex gap-2 px-4 pb-2.5 bg-white overflow-x-auto shrink-0 no-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border shrink-0 transition-all',
                catFilter === cat
                  ? 'bg-white border-blue-500 lg:border-[#FF5A36] text-blue-600 lg:text-[#FF5A36] shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              {cat.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Parts tabs when split */}
      {parts.length > 1 && (
        <div className="flex gap-2 px-4 py-2 bg-slate-50 border-y border-slate-100 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {parts.map((p, idx) => {
            const its = allItemsForPart(p.id);
            const tot = totalOf(subtotalOf(its), taxListOf(subtotalOf(its)));
            return (
              <button key={p.id} onClick={() => setActivePart(idx)}
                className={cn('flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                  activePart === idx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200')}>
                <Users size={10} />{p.label}
                {its.length > 0 && <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded-full',
                  activePart === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>₹{tot.toFixed(0)}</span>}
                <span onClick={e => { e.stopPropagation(); removePart(idx); }} className="text-xs ml-0.5 text-slate-400 hover:text-red-500">×</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {categoryLayout === 'vertical' && (
          <div className="w-20 bg-slate-50 border-r border-slate-100 overflow-y-auto no-scrollbar shrink-0 flex flex-col pt-2 pb-40">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={cn(
                  'flex flex-col items-center py-4 px-1 gap-1.5 transition-all relative',
                  catFilter === cat ? 'bg-white text-blue-600 lg:text-[#FF5A36]' : 'text-slate-400'
                )}
              >
                {catFilter === cat && <div className="absolute right-0 top-2 bottom-2 w-1 bg-blue-600 lg:bg-[#FF5A36] rounded-l-full" />}
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  catFilter === cat ? "bg-blue-50 lg:bg-orange-50" : "bg-transparent"
                )}>
                  {cat === 'All' ? <Utensils size={18} /> :
                    cat.toLowerCase().includes('drink') ? <Coffee size={18} /> :
                    cat.toLowerCase().includes('pizza') ? <Pizza size={18} /> :
                        <Box size={18} />}
                </div>
                <span className={cn("text-[9px] font-black uppercase tracking-tighter text-center leading-none px-1", catFilter === cat ? "text-blue-700 lg:text-[#FF5A36]" : "text-slate-500")}>
                  {cat}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-white px-3 pt-3 pb-40 no-scrollbar">
          {filteredMenu.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Utensils size={32} strokeWidth={1} className="mb-3 opacity-30" />
              <p className="text-sm">No items found</p>
            </div>
          ) : (
            <div className={cn("grid gap-2.5", categoryLayout === 'vertical' ? "grid-cols-2" : "grid-cols-3")}>
              {filteredMenu.map(item => renderMenuItemCard({ item, key: item._id }))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.07)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* View Cart row — only when items exist */}
        {activeAllItems.length > 0 && (
          <button
            onClick={() => onScreenChange?.('cart')}
            className="w-full flex items-center px-4 py-3 mb-1 border-b border-slate-200 bg-white active:bg-slate-50 transition-colors gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ShoppingCart size={15} className="text-blue-500 lg:text-[#FF5A36] shrink-0" />
              <span className="text-[13px] font-bold text-slate-800">View Cart</span>
              <span className="text-[11px] font-medium text-slate-400">·  {cartItemCount} items</span>
            </div>
            <span className="text-[14px] font-black text-blue-600 lg:text-[#FF5A36] shrink-0">₹{activeTotal.toFixed(0)}</span>
            <ChevronRight size={14} className="text-blue-400 lg:text-orange-400 shrink-0" />
          </button>
        )}

        {/* KOT buttons — lifted with mx padding and mb */}
        <div className="flex gap-2.5 px-3 pt-2.5 pb-3">
          <button
            onClick={handleKOTHold}
            disabled={activeCurrent.length === 0 || isReadOnly}
            className={cn(
              'flex-1 py-3 rounded-xl font-bold text-[13px] border border-slate-300 bg-white text-slate-800 active:scale-[0.97] transition-all tracking-wide',
              (activeCurrent.length === 0 || isReadOnly) ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'
            )}
          >
            {roundMsg ? '✓ KOT Sent!' : 'KOT & Hold'}
          </button>
          <button
            onClick={handleKOTBill}
            disabled={activeAllItems.length === 0 || isReadOnly}
            className={cn(
              'flex-1 py-3 rounded-xl font-bold text-[13px] text-white bg-blue-600 lg:bg-[#FF5A36] active:scale-[0.97] transition-all shadow-md shadow-blue-200 lg:shadow-orange-100 tracking-wide',
              (activeAllItems.length === 0 || isReadOnly) ? 'opacity-40 cursor-not-allowed' : ''
            )}
          >
            {activeAllItems.length > 0 ? `KOT & Settle (₹${activeTotal.toFixed(0)})` : 'KOT & Settle'}
          </button>
        </div>
      </div>

    </div>
  );

  // ── MOBILE CART SCREEN ─────────────────────────────────────────────────────────────────────
  const renderMobileCartScreen = () => {
    const bill = buildBill(currentPartId);
    const activeTotal = bill.total;
    const cartItems = activeAllItems;

    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">

        {/* Header — Cart title + table number on right */}
        <div className="flex items-center px-4 h-14 bg-white border-b border-slate-100 shrink-0">
          <button onClick={handleBack} className="mr-3 text-slate-800 active:scale-95">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <span className="text-[17px] font-bold text-slate-900 flex-1">Cart</span>

          {tableId && (
            <span className="text-[12px] font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
              Table No : {tableId}
            </span>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

          {/* Items grid — same MenuItemCard as menu screen */}
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest px-4 pt-4 pb-2">Items in order</p>
          <div className="px-3 pb-4">
            <div className="grid grid-cols-3 gap-2.5">
              {cartItems.map(item => {
                const menuItem = menuItems.find(m => item.menuId === m._id || item.menuId.startsWith(m._id));
                if (!menuItem) return null;
                return (
                  <div key={item.menuId}>
                    {renderMenuItemCard({ item: menuItem, overrideQty: item.qty })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details card */}
          <div className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setCustomerDetailsOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-4"
            >
              <span className="text-[15px] font-semibold text-slate-800">Customer Details</span>
              <span className="text-blue-600 lg:text-[#FF5A36] text-[14px] font-bold">{customerDetailsOpen ? 'HIDE' : 'ADD'}</span>
            </button>
            {customerDetailsOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                <div className="mt-3">
                  <label className="text-xs text-slate-500 font-medium mb-1 block">Name</label>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 lg:focus:border-[#FF5A36] bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium mb-1 block">Phone</label>
                  <input
                    type="tel"
                    value={phoneOf(currentPartId)}
                    onChange={e => setPartPhones(prev => ({ ...prev, [currentPartId]: e.target.value }))}
                    placeholder="Mobile number"
                    maxLength={10}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 lg:focus:border-[#FF5A36] bg-slate-50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table No card */}
          <div className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white">
            <div className="px-4 pt-3 pb-1">
              <p className="text-[13px] text-slate-500 font-medium mb-2">Table No.</p>
              <div className="border border-slate-200 rounded-xl px-3 py-3 bg-white mb-3">
                <span className="text-[16px] font-semibold text-slate-800">{tableId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Payment Type card */}
          <div className="mx-4 mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-[14px] font-semibold text-slate-800 mb-3">Payment Type</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {paymentModes.map(mode => (
                <button
                  key={mode}
                  onClick={() => {
                    setPaymentMode(mode);
                    if (mode === 'Cash') { setCashAmount(activeTotal); setOnlineAmount(0); }
                    else if (mode === 'Split') { setCashAmount(Math.floor(activeTotal / 2)); setOnlineAmount(activeTotal - Math.floor(activeTotal / 2)); }
                    else { setOnlineAmount(activeTotal); setCashAmount(0); }
                  }}
                  className={cn(
                    'px-4 py-2 rounded-full text-[13px] font-semibold border transition-all',
                    paymentMode === mode
                      ? 'border-blue-500 lg:border-[#FF5A36] text-blue-600 lg:text-[#FF5A36] bg-white'
                      : 'border-slate-200 text-slate-700 bg-white'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            {paymentMode === 'Split' && (
              <div className="flex gap-3 animate-in fade-in slide-in-from-top-2 duration-200 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Cash Amt</label>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCashAmount(val);
                      setOnlineAmount(Math.max(0, activeTotal - val));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[15px] font-black text-slate-800 outline-none focus:border-blue-500 lg:focus:border-[#FF5A36]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Online Amt</label>
                  <input
                    type="number"
                    value={onlineAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOnlineAmount(val);
                      setCashAmount(Math.max(0, activeTotal - val));
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[15px] font-black text-slate-800 outline-none focus:border-blue-500 lg:focus:border-[#FF5A36]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bill Details card */}
          <div className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-[14px] font-semibold text-slate-800 mb-3">Bill Details</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList size={16} className="text-slate-400" />
                  <span className="text-[14px] text-slate-700">Sub Total</span>
                </div>
                <span className="text-[14px] font-semibold text-slate-800">₹{activeSub.toFixed(2)}</span>
              </div>
              
              {activeExtraCharges.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500 pl-6">{c.name}</span>
                  <span className="text-[13px] text-slate-600">₹{Number(c.amount).toFixed(2)}</span>
                </div>
              ))}
              
              {activeDiscountAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-emerald-500 pl-6">Discount ({activeDiscountType})</span>
                  <span className="text-[13px] text-emerald-600">-₹{activeDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {activeTaxes.map(t => (
                <div key={t.name} className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500 pl-6">{t.name} ({t.pct}%)</span>
                  <span className="text-[13px] text-slate-600">₹{t.amt.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[14px] font-black text-slate-800">Total Amount</span>
                <span className="text-[16px] font-black text-blue-600 lg:text-[#FF5A36]">₹{activeTotal.toFixed(0)}</span>
              </div>
            </div>

            {!isReadOnly && (
              <div className="flex flex-col mt-2 pt-2 border-t border-slate-100">
                {/* Inline Quick Actions */}
                <div className="flex relative border-b border-slate-100 mb-4 pb-4 mt-2">
                  <div className="flex-1 px-3 py-1 border-r border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Discount (₹)</p>
                    <input
                      type="text"
                      readOnly
                      value={activeDiscountType === 'Fixed' ? activeDiscountValue : ''}
                      onClick={() => setShowNumpad(true)}
                      className="w-full text-[16px] font-bold text-emerald-500 outline-none placeholder:text-slate-300 cursor-pointer"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex-1 px-2 flex flex-col justify-center gap-1.5">
                    {(() => {
                      const packPrice = user?.packagingCharge || 20;
                      const packObj = (activeExtraCharges || []).find(c => c.name === 'Packaging');
                      const packQty = packObj ? packObj.amount / packPrice : 0;
                      const handleUpdatePack = (delta) => {
                        const newQty = Math.max(0, packQty + delta);
                        const charges = [...(partExtraCharges[currentPartId] || [])];
                        const packIdx = charges.findIndex(c => c.name === 'Packaging');
                        if (packIdx >= 0) charges.splice(packIdx, 1);
                        if (newQty > 0) charges.push({ name: 'Packaging', amount: newQty * packPrice });
                        setPartExtraCharges(prev => ({ ...prev, [currentPartId]: charges }));
                      };
                      if (packQty === 0) {
                        return (
                          <button onClick={() => handleUpdatePack(1)} className="w-full py-1.5 rounded-lg flex items-center justify-center gap-2 transition-all border bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700">
                            <Package size={14} strokeWidth={2.5} />
                            <span className="text-[11px] font-bold uppercase tracking-widest">Add Pack</span>
                          </button>
                        );
                      }
                      return (
                        <div className="w-full py-1.5 flex items-center justify-between px-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-600 shadow-sm">
                          <button onClick={() => handleUpdatePack(-1)} className="w-6 flex items-center justify-center hover:bg-amber-100 rounded-md transition-colors"><Minus size={14} strokeWidth={3} /></button>
                          <span className="text-[11px] font-bold uppercase tracking-widest">{packQty} Pack</span>
                          <button onClick={() => handleUpdatePack(1)} className="w-6 flex items-center justify-center hover:bg-amber-100 rounded-md transition-colors"><Plus size={14} strokeWidth={3} /></button>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Smooth Expanding Numpad */}
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out border-slate-100 mb-4",
                    showNumpad ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden border border-slate-200 rounded-xl">
                    <CustomNumpad
                      value={activeDiscountType === 'Fixed' ? activeDiscountValue : ''}
                      onChange={(val) => setPartDiscount(prev => ({ ...prev, [currentPartId]: val ? { type: 'Fixed', value: Number(val) } : null }))}
                      onClose={() => setShowNumpad(false)}
                    />
                  </div>
                </div>


              </div>
            )}
          </div>

          {/* Final Bill Items Summary Card */}
          <div className="mx-4 mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-[14px] font-semibold text-slate-800 mb-3">Items in Bill</p>
            <div className="space-y-3">
              {cartItems.filter(i => i.qty > 0).map((item, idx) => {
                const menuItem = menuItems.find(m => item.menuId === m._id || item.menuId.startsWith(m._id));
                const name = item.name || menuItem?.name || 'Item';
                return (
                  <div key={idx} className="flex justify-between items-center text-[13px] pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{name}</span>
                      <span className="text-[11px] text-slate-400">₹{item.price} × {item.qty}</span>
                    </div>
                    <span className="font-bold text-slate-700">₹{item.price * item.qty}</span>
                  </div>
                );
              })}
              {cartItems.filter(i => i.qty > 0).length === 0 && (
                <p className="text-center text-xs text-slate-400 py-2">No items to bill</p>
              )}
            </div>
          </div>

          {/* Bottom spacer for button */}
          <div className="h-24" />
        </div>

        {/* Footer Buttons — fixed bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-3 bg-white border-t border-slate-100 flex gap-2.5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button
            onClick={() => handleKOTHold()}
            disabled={isReadOnly}
            className={cn(
              'flex-1 py-3.5 rounded-xl font-bold text-[13px] border border-slate-300 bg-white text-slate-800 active:scale-[0.97] transition-all tracking-wide',
              isReadOnly ? 'opacity-40 cursor-not-allowed' : 'shadow-sm'
            )}
          >
            {roundMsg ? '✓ Saved!' : 'Save Changes'}
          </button>
          <button
            onClick={async () => {
              await handleConfirmAndSave();
            }}
            disabled={activeAllItems.length === 0 || isReadOnly}
            className={cn(
              'flex-1 py-3.5 rounded-xl font-bold text-[13px] text-white bg-blue-600 lg:bg-[#FF5A36] active:scale-[0.97] transition-all shadow-md shadow-blue-200 lg:shadow-orange-100 tracking-wide',
              (activeAllItems.length === 0 || isReadOnly) ? 'opacity-40 cursor-not-allowed' : ''
            )}
          >
            {activeTotal > 0 ? `Confirm & Bill (₹${activeTotal.toFixed(0)})` : 'Confirm & Bill'}
          </button>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      "h-screen bg-white flex flex-col overflow-hidden font-sans transition-all duration-150",
      isDispatching && "opacity-0 -translate-y-1 scale-[0.995]"
    )}>
      {activePartData && renderPrintBill({ partId: activePartData.id })}

      {/* Modals */}
      {(showDiscardModal || modalParam === 'unsaved') && renderDiscardModal()}
      {showDeleteModal && renderDeleteModal()}
      {selectedItemForVars && renderVariationsModal({ item: selectedItemForVars, onClose: () => setSelectedItemForVars(null) })}
      {showTransferModal && renderTransferModal()}

      {/* Desktop UI */}
      {renderDesktopUI()}

      {/* Mobile UI */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden relative">
        {mobileScreen === 'menu' ? renderMobileMenuScreen() : renderMobileCartScreen()}
      </div>
    </div>
  );
};

export default TableView;