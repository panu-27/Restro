import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  X, Plus, Minus, Search, Printer, MessageCircle,
  ShoppingCart, Phone, Leaf, Flame,
  Coffee, IceCream, Utensils, ArrowLeft, ArrowRight, CreditCard, Users, SplitSquareHorizontal,
  Package, CheckCircle2, History, Mic, MicOff, User,
  Settings, ClipboardList, ChevronRight, Image as ImageIcon, ChevronDown, ChevronUp,
  ChevronLeft
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
const newPart = (n) => ({
  id: `part-${Date.now()}-${_counter++}`,
  label: `Part ${n}`,
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

// ── Main Component ────────────────────────────────────────────────────────────────────────────
const TableView = ({ tableId, orderId, isHistoryView, menuItems = [], user, onClose, onCheckoutComplete }) => {

  // ── State ─────────────────────────────────────────────────────────────────────────────────
  const [parts, setParts] = useState([]);
  const [activePart, setActivePart] = useState(0);
  const [roundItems, setRoundItems] = useState({});
  const [partPhones, setPartPhones] = useState({});
  const [partOrderIds, setPartOrderIds] = useState({});
  const [partOrderNumbers, setPartOrderNumbers] = useState({});
  const [roundMsg, setRoundMsg] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [settled, setSettled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTransferTable, setSelectedTransferTable] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState('');
  const [paymentType, setPaymentType] = useState('Paid');
  const [guestNote, setGuestNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [selectedItemForVars, setSelectedItemForVars] = useState(null);
  // Mobile screens: 'menu' | 'cart'
  const [mobileScreen, setMobileScreen] = useState('menu');
  // Customer details expand
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const billRef = useRef(null);
  const isSavingRef = useRef(false);

  // ── Draft cache ──────────────────────────────────────────────────────────────────────────
  const draftKey = tableId ? `restro_draft_${tableId}` : null;

  const saveDraft = (currentParts, roundItemsMap) => {
    if (!draftKey) return;
    try {
      const snapshot = currentParts.map(p => ({
        label: p.label,
        items: roundItemsMap[p.id] || []
      }));
      const hasAny = snapshot.some(s => s.items.length > 0);
      if (hasAny) localStorage.setItem(draftKey, JSON.stringify(snapshot));
      else localStorage.removeItem(draftKey);
    } catch { }
  };

  const loadDraft = () => {
    if (!draftKey) return null;
    try { const v = localStorage.getItem(draftKey); return v ? JSON.parse(v) : null; }
    catch { return null; }
  };

  const clearDraft = () => { if (draftKey) { try { localStorage.removeItem(draftKey); } catch { } } };

  const applyDraft = (loadedParts, draft) => {
    if (!draft || !draft.length) return;
    const restored = {};
    draft.forEach((d, idx) => {
      const part = loadedParts[idx];
      if (part && d.items && d.items.length > 0) restored[part.id] = d.items;
    });
    if (Object.keys(restored).length > 0) setRoundItems(restored);
  };

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
          active = res.data.filter(o => o.tableId === tableId && o.orderType === 'Dine-in');
        }

        if (active.length > 0) {
          const loadedParts = active.map((o, idx) => ({
            id: `part-${o._id}`,
            label: o.partLabel || (o.orderType === 'Parcel' ? o.customerName || `Parcel #${idx + 1}` : `Part ${idx + 1}`),
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
            if (o.customerPhone) initPhones[pid] = o.customerPhone;
            if (idx === 0) {
              if (o.paymentType) setPaymentType(o.paymentType);
              if (o.guestNote) setGuestNote(o.guestNote);
            }
          });
          setParts(loadedParts);
          setPartOrderIds(orderIds);
          setPartOrderNumbers(orderNumbers);
          setPartPhones(initPhones);
          applyDraft(loadedParts, loadDraft());
        } else {
          const p1 = newPart(1);
          if (tableId) p1.label = `Table ${tableId.replace('Table ', '')}`;
          const draft = loadDraft();
          if (draft && draft.length > 1) {
            const restoredParts = draft.map((d, i) => {
              const p = newPart(i + 1);
              p.label = d.label || `Part ${i + 1}`;
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
        setParts([newPart(1)]);
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
  const currentRoundOf = (partId) => roundItems[partId] || [];
  const phoneOf = (partId) => partPhones[partId] || '';

  const allItemsForPart = (partId) => {
    const part = parts.find(p => p.id === partId);
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
    const n = parts.length + 1;
    const p = newPart(n);
    setParts(prev => [...prev, p]);
    setActivePart(parts.length);
  };

  const removePart = (idx) => {
    if (parts.length === 1) return;
    setParts(prev => prev.filter((_, i) => i !== idx));
    setActivePart(prev => (prev >= idx && prev > 0 ? prev - 1 : prev));
  };

  // ── Cart operations ───────────────────────────────────────────────────────────────────────
  const addItem = (item) => updateQty(item._id, 1);

  const addVariationItem = (item, variation) => {
    const varId = `${item._id}_${variation.name}`;
    setRoundItems(prev => {
      const list = [...(prev[currentPartId] || [])];
      const ex = list.find(i => i.menuId === varId);
      if (ex) return { ...prev, [currentPartId]: list.map(i => i.menuId === varId ? { ...i, qty: i.qty + 1 } : i) };
      return { ...prev, [currentPartId]: [...list, { menuId: varId, name: `${item.name} (${variation.name})`, price: variation.price, qty: 1 }] };
    });
  };

  const removeVariationItem = (item, variation) => {
    const varId = `${item._id}_${variation.name}`;
    setRoundItems(prev => {
      const list = [...(prev[currentPartId] || [])];
      const ex = list.find(i => i.menuId === varId);
      if (!ex) return prev;
      if (ex.qty <= 1) return { ...prev, [currentPartId]: list.filter(i => i.menuId !== varId) };
      return { ...prev, [currentPartId]: list.map(i => i.menuId === varId ? { ...i, qty: i.qty - 1 } : i) };
    });
  };

  const updateQty = (menuId, delta) => {
    if (delta > 0) {
      setRoundItems(prev => {
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

    const curRound = roundItems[currentPartId] || [];
    const inCurrent = curRound.find(i => i.menuId === menuId);
    if (inCurrent) {
      setRoundItems(prev => {
        const list = (prev[currentPartId] || [])
          .map(i => i.menuId === menuId ? { ...i, qty: i.qty + delta } : i)
          .filter(i => i.qty > 0);
        return { ...prev, [currentPartId]: list };
      });
      return;
    }

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
  };

  const saveRound = async (partId, options = {}) => {
    if (isSavingRef.current) return;
    const { closeAfterSave = false } = options;
    const items = currentRoundOf(partId);
    if (!items.length) return;
    isSavingRef.current = true;
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
      alert('Error saving round to database.');
    } finally {
      isSavingRef.current = false;
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
      const idx = parts.findIndex(p => p.id === currentPartId);
      const newParts = parts.filter(p => p.id !== currentPartId);
      if (newParts.length === 0) {
        onClose?.();
      } else {
        setParts(newParts);
        setActivePart(Math.min(idx, newParts.length - 1));
        setShowTransferModal(false);
      }
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
    const items = allItemsForPart(partId);
    const sub = subtotalOf(items);
    const txList = taxListOf(sub);
    const total = totalOf(sub, txList);
    return {
      tableId, partLabel: part?.label || 'Bill', items, sub, txList, total,
      restaurantName: user?.restaurantName || 'Restaurant',
      restaurantAddress: user?.restaurantAddress || '',
      restaurantPhone: user?.restaurantPhone || '',
      gstNumber: user?.gstNumber || '',
      fssaiNumber: user?.fssaiNumber || '',
      orderId: partOrderIds[partId] || '',
      orderNumber: partOrderNumbers[partId],
      paymentType,
      guestNote: paymentType === 'Guest' ? guestNote : '',
      paymentMode,
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
      ...(bill.txList.length > 0 ? [
        `Subtotal: ₹${bill.sub.toFixed(2)}`,
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
        paymentMode: paymentType === 'Guest' ? 'Guest' : paymentMode,
        customerPhone: phone.length >= 10 ? phone : ''
      });
      if (hasWA) window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(waMessage(bill))}`, '_blank');
      if (doPrint) window.print();
      const idx = parts.findIndex(p => p.id === partId);
      const newParts = parts.filter(p => p.id !== partId);
      if (newParts.length === 0) {
        setSettled(true);
        setTimeout(() => { onCheckoutComplete?.(); onClose?.(); }, 1800);
        return;
      }
      setParts(newParts);
      setActivePart(Math.min(idx, newParts.length - 1));
    } catch (err) {
      console.error('Settlement failed:', err);
      alert('Error finalizing payment on server.');
    }
  };

  // Confirm & Save from cart screen
  const handleConfirmAndSave = async () => {
    const unsaved = currentRoundOf(currentPartId);
    let oid = partOrderIds[currentPartId];
    if (unsaved.length > 0) {
      const savedId = await saveRound(currentPartId);
      if (savedId) oid = savedId;
    }
    if (!oid) { alert('No items to save.'); return; }
    // Settle with chosen paymentMode
    await handleSettle(currentPartId, 'none');
  };

  const handleKOTHold = async () => {
    await saveRound(currentPartId, { closeAfterSave: true });
  };

  const handleKOTBill = async () => {
    const unsaved = currentRoundOf(currentPartId);
    let oid = partOrderIds[currentPartId];
    if (unsaved.length > 0) {
      const savedId = await saveRound(currentPartId);
      if (savedId) oid = savedId;
    }
    if (!oid && activeAllItems.length === 0) { alert('No items added yet.'); return; }
    setMobileScreen('cart');
  };

  // ── Print area ────────────────────────────────────────────────────────────────────────────
  const PrintBill = ({ partId }) => {
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

  // ── Derived for active part ────────────────────────────────────────────────────────────────
  const activePartData = parts[activePart];
  const isReadOnly = isHistoryView || activePartData?.status === 'Paid' || activePartData?.status === 'Cancelled';
  const isWaiter = user?.role === 'Waiter';
  const activeAllItems = activePartData ? allItemsForPart(activePartData.id) : [];
  const activeCurrent = currentRoundOf(currentPartId);
  const activeSub = subtotalOf(activeAllItems);
  const activeTaxes = taxListOf(activeSub);
  const activeTotal = totalOf(activeSub, activeTaxes);
  const cartItemCount = activeAllItems.reduce((s, i) => s + i.qty, 0);

  // Payment modes for cart screen - matching screenshot exactly
  const paymentModes = ['Cash', 'UPI', 'PhonePe', 'Google Pay'];

  // ── Variations modal ──────────────────────────────────────────────────────────────────────
  const VariationsModal = ({ item, onClose }) => {
    if (!item) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-10" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-slate-900 text-lg">{item.name}</p>
              <p className="text-xs text-slate-400">Choose a variation</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={16} /></button>
          </div>
          <div className="space-y-2">
            {(item.variations || []).map(v => {
              const varId = `${item._id}_${v.name}`;
              const inCart = activeCurrent.find(i => i.menuId === varId);
              const qty = inCart?.qty || 0;
              return (
                <div key={v.name} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                    <p className="text-xs text-slate-500">{v.name} · ₹{v.price}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                    <button onClick={() => removeVariationItem(item, v)} disabled={qty === 0}
                      className={cn('w-7 h-7 flex items-center justify-center rounded-lg transition-all', qty === 0 ? 'opacity-30 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50')}>
                      <Minus size={14} strokeWidth={3} />
                    </button>
                    <span className={cn('w-5 text-center text-sm font-black', qty > 0 ? 'text-slate-900' : 'text-slate-400')}>{qty}</span>
                    <button onClick={() => addVariationItem(item, v)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-white bg-blue-600 shadow-sm active:scale-90 transition-all">
                      <Plus size={14} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={onClose} className="mt-4 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm">Done</button>
        </div>
      </div>
    );
  };

  // ── Transfer Modal ────────────────────────────────────────────────────────────────────────
  const TransferModal = () => {
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
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowTransferModal(false)}>
        <div className="bg-white rounded-t-3xl w-full max-w-md flex flex-col" style={{ height: '75vh' }} onClick={e => e.stopPropagation()}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
            <div>
              <p className="font-black text-slate-900 text-base">Transfer Table</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Move order from <span className="font-bold text-slate-600">{tableId}</span> to another table</p>
            </div>
            <button onClick={() => setShowTransferModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"><X size={16} /></button>
          </div>

          {/* Scrollable section list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {sectionNames.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No other tables available</p>
            ) : (
              sectionNames.map(area => (
                <div key={area}>
                  {/* Section label */}
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{area}</p>
                  {/* Tables grid */}
                  <div className="grid grid-cols-4 gap-2">
                    {sections[area].map(t => (
                      <button
                        key={t._id || t.tableId}
                        onClick={() => setSelectedTransferTable(t.tableId)}
                        className={cn(
                          'py-3 rounded-xl text-sm font-bold border transition-all',
                          selectedTransferTable === t.tableId
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                        )}
                      >
                        {t.tableId}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-100 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <button
              onClick={handleTransfer}
              disabled={!selectedTransferTable}
              className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-200 transition-all active:scale-[0.98]"
            >
              {selectedTransferTable ? `Transfer to ${selectedTransferTable}` : 'Select a table'}
            </button>
          </div>
        </div>
      </div>
    );
  };


  // ── Menu Item Card — name outside, controls anchored bottom-right ─────────────────────────
  const MenuItemCard = ({ item, overrideQty }) => {
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
      if (hasVars) setSelectedItemForVars(item);
      else if (isSingleVar) addVariationItem(item, item.variations[0]);
      else addItem(item);
    };
    const handleRemove = (e) => {
      e?.stopPropagation();
      if (isReadOnly) return;
      if (hasVars) setSelectedItemForVars(item);
      else if (isSingleVar) removeVariationItem(item, item.variations[0]);
      else updateQty(item._id, -1);
    };

    return (
      <div className="flex flex-col gap-1.5">
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
            {totalQty > 0 ? (
              /* Blue pill: [−] [count] [+] */
              <div className="flex items-center bg-blue-600 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={handleRemove}
                  disabled={isReadOnly}
                  className="w-8 h-8 flex items-center justify-center text-white active:bg-blue-700 transition-colors"
                >
                  <Minus size={14} strokeWidth={3} />
                </button>
                <span className="px-1 min-w-[24px] text-center text-[14px] font-black text-white">
                  {totalQty}
                </span>
                <button
                  onClick={handleAdd}
                  disabled={isReadOnly}
                  className="w-8 h-8 flex items-center justify-center text-white active:bg-blue-700 transition-colors"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            ) : (
              /* White + button — blue border, rounded-lg, no shadow */
              <button
                onClick={handleAdd}
                disabled={isReadOnly}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-blue-500 text-blue-600 active:scale-90 transition-all disabled:opacity-50 shadow-sm"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>

        {/* ── Name OUTSIDE the card, below it ── */}
        <p className="text-[13px] font-bold text-slate-900 leading-snug line-clamp-2 px-0.5 mt-0.5">
          {item.name}
          {isSingleVar && <span className="text-slate-500 font-medium"> · {item.variations[0].name}</span>}
        </p>
      </div>
    );
  };

  // ── DESKTOP UI ────────────────────────────────────────────────────────────────────────────
  const DesktopUI = () => {
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
    const toggleLeft = () => { setLeftOpen(v => { const n = !v; if (n) setRightOpen(false); return n; }); };
    const toggleRight = () => { setRightOpen(v => { const n = !v; if (n) setLeftOpen(false); return n; }); };

    return (
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center gap-2 px-4 h-14 bg-white border-b border-slate-100 no-print shrink-0">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
            <ArrowLeft size={16} className="text-slate-600" />
          </button>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-slate-900">{tableId || parts[0]?.label || 'Order'}</span>
            <span className="text-[10px] text-slate-400">{tableId ? 'Dine-in' : 'Parcel'}</span>
          </div>
          <div className="flex-1" />
          <button onClick={toggleLeft} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all", leftOpen ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
            <Utensils size={13} /><span className="hidden sm:inline">Categories</span>
          </button>
          <button onClick={toggleRight} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all", rightOpen ? "bg-[#FF5A36] text-white border-[#FF5A36]" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>
            <CreditCard size={13} /><span className="hidden sm:inline">Bill</span>
            {activeAllItems.length > 0 && <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", rightOpen ? "bg-white/20 text-white" : "bg-orange-50 text-[#FF5A36]")}>₹{activeTotal.toFixed(0)}</span>}
          </button>
          {!isReadOnly && parts.length > 0 && <>
            <button onClick={() => setShowTransferModal(true)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors">Transfer</button>
            <button onClick={addPart} className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-colors">Split</button>
          </>}
        </div>

        {parts.length > 1 && (
          <div className="flex gap-2 px-4 py-2 bg-white border-b border-slate-100 overflow-x-auto no-print shrink-0">
            {parts.map((p, idx) => {
              const its = allItemsForPart(p.id);
              const tot = totalOf(subtotalOf(its), taxListOf(subtotalOf(its)));
              return (
                <button key={p.id} onClick={() => setActivePart(idx)} className={cn('flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all', activePart === idx ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300')}>
                  <Users size={11} />{p.label}
                  {its.length > 0 && <span className={cn('text-[9px] font-bold px-1 py-0.5 rounded-full', activePart === idx ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>₹{tot.toFixed(0)}</span>}
                  <span onClick={e => { e.stopPropagation(); removePart(idx); }} className="w-3.5 h-3.5 flex items-center justify-center rounded-full text-xs cursor-pointer text-slate-400 hover:text-red-500">×</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-1 overflow-hidden no-print">
          {/* Left category sidebar */}
          <div className={cn("flex-col bg-white border-r border-slate-100 overflow-hidden transition-all duration-300 shrink-0", leftOpen ? "flex w-44" : "hidden")}>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 px-4 pt-4 pb-2 shrink-0">Categories</p>
            <div className="flex-1 overflow-y-auto">
              {categories.map(cat => {
                const count = cat === 'All' ? (menuItems || []).filter(i => i.isAvailable !== false).length : (menuItems || []).filter(i => i.isAvailable !== false && i.category === cat).length;
                return (
                  <button key={cat} onClick={() => setCatFilter(cat)} className={cn("w-full flex items-center justify-between px-4 py-3 text-xs font-semibold transition-all relative", catFilter === cat ? "text-[#FF5A36] bg-orange-50" : "text-slate-500 hover:bg-slate-50")}>
                    {catFilter === cat && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FF5A36] rounded-r-full" />}
                    <span>{cat}</span>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", catFilter === cat ? "bg-orange-100 text-[#FF5A36]" : "bg-slate-100 text-slate-400")}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center menu */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-3 pb-2 bg-white border-b border-slate-100 shrink-0">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search menu..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 outline-none text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-400 focus:bg-white transition-colors" />
                </div>
                {isMicSupported && !isReadOnly && (
                  <button onClick={toggleListening} className={cn('w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border transition-all relative', isListening ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-[#ff5a36] hover:border-[#ff5a36]')}>
                    {isListening && <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-40" />}
                    {isListening ? <Mic size={15} /> : <MicOff size={15} />}
                  </button>
                )}
              </div>
              {transcriptResult && (
                <div className={cn('mt-2 px-3 py-2 rounded-xl text-xs font-semibold', transcriptResult.startsWith('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : transcriptResult.startsWith('❌') || transcriptResult.startsWith('⚠') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-800 text-white')}>{transcriptResult}</div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto bg-[#f8f7f5] px-4 py-3">
              {filteredMenu.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Utensils size={28} strokeWidth={1} className="mb-3 opacity-40" />
                  <p className="text-sm font-medium">No items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredMenu.map(item => <MenuItemCard key={item._id} item={item} />)}
                </div>
              )}
            </div>
          </div>

          {/* Right bill panel */}
          <div className={cn("flex-col bg-white border-l border-slate-100 overflow-hidden transition-all duration-300 shrink-0", rightOpen ? "flex w-72" : "hidden")}>
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 shrink-0 bg-slate-900">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{tableId || parts[activePart]?.label || 'Order'}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-slate-400 font-medium">Net Payable</p>
                  <p className="text-4xl font-black text-white tracking-tight">₹{activeTotal.toFixed(0)}</p>
                </div>
                {isReadOnly && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-1 rounded uppercase">Archived</span>}
              </div>
              {activeTaxes.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-slate-700 pt-3">
                  <div className="flex justify-between text-[10px] text-slate-400"><span>Subtotal</span><span>₹{activeSub.toFixed(2)}</span></div>
                  {activeTaxes.map(t => <div key={t.name} className="flex justify-between text-[10px] text-slate-400"><span>{t.name} ({t.pct}%)</span><span>₹{t.amt.toFixed(2)}</span></div>)}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {activeAllItems.length === 0 && (
                <div className="py-10 text-center"><ShoppingCart size={24} strokeWidth={1} className="mx-auto mb-2 text-slate-200" /><p className="text-xs text-slate-400">No items yet</p></div>
              )}
              {activeAllItems.map(item => (
                <div key={item.menuId} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-bold text-slate-800 text-sm leading-tight truncate">{item.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">₹{item.price} each</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                      <button onClick={() => updateQty(item.menuId, -1)} disabled={isReadOnly} className="p-1 hover:bg-white rounded-md transition-colors text-slate-600 shadow-sm disabled:opacity-40"><Minus size={14} strokeWidth={3} /></button>
                      <span className="w-5 text-center font-bold text-slate-800">{item.qty}</span>
                      <button onClick={() => updateQty(item.menuId, 1)} disabled={isReadOnly} className="p-1 hover:bg-white rounded-md transition-colors text-slate-600 shadow-sm disabled:opacity-40"><Plus size={14} strokeWidth={3} /></button>
                    </div>
                    <span className="font-black text-slate-800 w-12 text-right">₹{item.price * item.qty}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-4 space-y-3 border-t border-slate-100 shrink-0">
              {activeCurrent.length > 0 && !isReadOnly && (
                <button onClick={() => saveRound(currentPartId)} disabled={isDispatching}
                  className={cn('w-full py-3 rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 active:scale-[0.98] transition-all', roundMsg ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600')}>
                  {roundMsg ? <><CheckCircle2 size={14} /> Dispatched!</> : <><ArrowRight size={14} /> Dispatch to Kitchen</>}
                </button>
              )}
              {activeAllItems.length > 0 && (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                    <input type="tel" value={phoneOf(currentPartId)} onChange={e => setPartPhones(prev => ({ ...prev, [currentPartId]: e.target.value }))} placeholder="Mobile (optional)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 outline-none text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#ff5a36] transition-colors" maxLength={10} />
                  </div>
                  {!isReadOnly && !isWaiter && (
                    <div className="flex bg-slate-100 p-0.5 rounded-full relative overflow-hidden shadow-inner">
                      <div className={cn("absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full shadow-sm bg-emerald-500 transition-all duration-300", paymentMode === 'Online' ? "translate-x-0" : "translate-x-[calc(100%+4px)]")} />
                      <button onClick={() => setPaymentMode('Online')} className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-wide relative z-10 rounded-full transition-colors", paymentMode === 'Online' ? "text-white" : "text-slate-400")}>Online</button>
                      <button onClick={() => setPaymentMode('Cash')} className={cn("flex-1 py-2 text-[10px] font-bold uppercase tracking-wide relative z-10 rounded-full transition-colors", paymentMode === 'Cash' ? "text-white" : "text-slate-400")}>Cash</button>
                    </div>
                  )}
                  {!isReadOnly && !isWaiter ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleSettle(currentPartId, 'print')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-slate-600 active:scale-95 transition-all"><Printer size={15} /><span className="text-[9px] font-bold uppercase tracking-widest">Print</span></button>
                      <button onClick={() => handleSettle(currentPartId, 'wa')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-200 text-[#00a884] active:scale-95 transition-all"><MessageCircle size={15} /><span className="text-[9px] font-bold uppercase tracking-widest">WhatsApp</span></button>
                      <button onClick={() => handleSettle(currentPartId, 'both')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-[#FF5A36] hover:bg-orange-600 text-white active:scale-95 transition-all shadow-md shadow-orange-200"><CheckCircle2 size={15} /><span className="text-[9px] font-bold uppercase tracking-widest">Print + WA</span></button>
                      <button onClick={() => handleSettle(currentPartId, 'none')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 transition-all"><ArrowRight size={15} /><span className="text-[9px] font-bold uppercase tracking-widest">No Bill</span></button>
                    </div>
                  ) : isReadOnly ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => window.print()} className="py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:border-slate-300"><Printer size={14} /> Reprint</button>
                      {phoneOf(currentPartId).replace(/\D/g, '').length >= 10 && (
                        <button onClick={() => { const bill = buildBill(currentPartId); window.open(`https://wa.me/91${phoneOf(currentPartId).replace(/\D/g, '')}?text=${encodeURIComponent(waMessage(bill))}`, '_blank'); }} className="py-3 bg-white border border-[#00a884] text-[#00a884] rounded-xl font-semibold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50"><MessageCircle size={14} /> WhatsApp</button>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── MOBILE MENU SCREEN ────────────────────────────────────────────────────────────────────
  const MobileMenuScreen = () => (
    <div className="flex flex-col h-full overflow-hidden bg-white">

      {/* Header: back arrow + title + settings icon */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="text-slate-800 active:scale-95 transition-transform shrink-0">
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          {parts.length > 1 ? (
            <select value={activePart} onChange={e => setActivePart(Number(e.target.value))}
              className="bg-transparent text-slate-900 text-[17px] font-bold outline-none truncate max-w-[160px]">
              {parts.map((p, idx) => <option key={p.id} value={idx}>{p.label}</option>)}
            </select>
          ) : (
            <span className="text-slate-900 font-bold text-[17px] truncate">
              {tableId || parts[0]?.label || 'Add Order'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isReadOnly && (
            <>
              <button onClick={() => setShowTransferModal(true)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white active:scale-95">
                Transfer
              </button>
              <button onClick={addPart}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white active:scale-95">
                Split
              </button>
            </>
          )}
          <button className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500">
            <Settings size={18} />
          </button>
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
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-blue-500 text-blue-500'
            )}
          >
            {isListening && <span className="absolute inset-0 rounded-xl bg-blue-400 animate-ping opacity-30" />}
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

      {/* Category chips */}
      <div className="flex gap-2 px-4 pb-2.5 bg-white overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={cn(
              'px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border shrink-0 transition-all',
              catFilter === cat
                ? 'bg-white border-blue-500 text-blue-600'
                : 'bg-white border-slate-200 text-slate-600'
            )}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

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

      {/* Menu grid — scrollable, padding bottom for sticky bar */}
      <div className="flex-1 overflow-y-auto bg-white px-3 pt-3 pb-40" style={{ scrollbarWidth: 'none' }}>
        {filteredMenu.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Utensils size={32} strokeWidth={1} className="mb-3 opacity-30" />
            <p className="text-sm">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {filteredMenu.map(item => <MenuItemCard key={item._id} item={item} />)}
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 shadow-[0_-4px_16px_rgba(0,0,0,0.07)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* View Cart row — only when items exist */}
        {activeAllItems.length > 0 && (
          <button
            onClick={() => setMobileScreen('cart')}
            className="w-full flex items-center px-4 py-3 mb-1 border-b border-slate-200 bg-white active:bg-slate-50 transition-colors gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ShoppingCart size={15} className="text-blue-500 shrink-0" />
              <span className="text-[13px] font-bold text-slate-800">View Cart</span>
              <span className="text-[11px] font-medium text-slate-400">·  {cartItemCount} items</span>
            </div>
            <span className="text-[14px] font-black text-blue-600 shrink-0">₹{activeTotal.toFixed(0)}</span>
            <ChevronRight size={14} className="text-blue-400 shrink-0" />
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
              'flex-1 py-3 rounded-xl font-bold text-[13px] text-white bg-blue-600 active:scale-[0.97] transition-all shadow-md shadow-blue-200 tracking-wide',
              (activeAllItems.length === 0 || isReadOnly) ? 'opacity-40 cursor-not-allowed' : ''
            )}
          >
            KOT & Bill
          </button>
        </div>
      </div>

    </div>
  );

  // ── MOBILE CART SCREEN ─────────────────────────────────────────────────────────────────────
  const MobileCartScreen = () => {
    const bill = buildBill(currentPartId);
    const cartItems = activeAllItems;

    return (
      <div className="flex flex-col h-full bg-white overflow-hidden">

        {/* Header — Cart title + table number on right */}
        <div className="flex items-center px-4 h-14 bg-white border-b border-slate-100 shrink-0">
          <button onClick={() => setMobileScreen('menu')} className="mr-3 text-slate-800 active:scale-95">
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
                return <MenuItemCard key={item.menuId} item={menuItem} overrideQty={item.qty} />;
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
              <span className="text-blue-600 text-[14px] font-bold">{customerDetailsOpen ? 'HIDE' : 'ADD'}</span>
            </button>
            {customerDetailsOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                <div className="mt-3">
                  <label className="text-xs text-slate-500 font-medium mb-1 block">Name</label>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50"
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
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 bg-slate-50"
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
            <div className="flex gap-2 flex-wrap">
              {paymentModes.map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={cn(
                    'px-4 py-2 rounded-full text-[13px] font-semibold border transition-all',
                    paymentMode === mode
                      ? 'border-blue-500 text-blue-600 bg-white'
                      : 'border-slate-200 text-slate-700 bg-white'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
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
                <span className="text-[14px] font-semibold text-slate-800">₹{activeSub.toFixed(0)}</span>
              </div>
              {activeTaxes.map(t => (
                <div key={t.name} className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-500">{t.name} ({t.pct}%)</span>
                  <span className="text-[13px] text-slate-600">₹{t.amt.toFixed(2)}</span>
                </div>
              ))}
              {activeTaxes.length > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[14px] font-bold text-slate-800">Total</span>
                  <span className="text-[14px] font-bold text-slate-800">₹{activeTotal.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom spacer for button */}
          <div className="h-24" />
        </div>

        {/* Confirm & Save button — fixed bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-white border-t border-slate-100"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
          <button
            onClick={async () => {
              await handleSettle(currentPartId, 'print');
            }}
            disabled={activeAllItems.length === 0}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-[13px] tracking-wide active:scale-[0.98] transition-all shadow-md shadow-blue-200 disabled:opacity-50"
          >
            Confirm & Save
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
      {activePartData && <PrintBill partId={activePartData.id} />}

      {/* Modals */}
      {selectedItemForVars && <VariationsModal item={selectedItemForVars} onClose={() => setSelectedItemForVars(null)} />}
      {showTransferModal && <TransferModal />}

      {/* Desktop UI */}
      <DesktopUI />

      {/* Mobile UI */}
      <div className="flex md:hidden flex-col flex-1 overflow-hidden relative">
        {mobileScreen === 'menu' ? <MobileMenuScreen /> : <MobileCartScreen />}
      </div>
    </div>
  );
};

export default TableView;