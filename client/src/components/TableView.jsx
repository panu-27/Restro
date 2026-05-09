import React, { useState, useMemo, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  X, Plus, Minus, Search, Printer, MessageCircle,
  ShoppingCart, Phone, Leaf, Flame,
  Coffee, IceCream, Utensils, ArrowLeft, ArrowRight, CreditCard, Users, SplitSquareHorizontal,
  Package, CheckCircle2, History, Mic, MicOff, User
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
    case 'Veg': return <Leaf size={12} className="text-emerald-500" />;
    case 'Non-Veg': return <Flame size={12} className="text-rose-500" />;
    case 'Beverage': return <Coffee size={12} className="text-amber-500" />;
    case 'Dessert': return <IceCream size={12} className="text-purple-500" />;
    default: return <Utensils size={12} className="text-gray-400" />;
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
  const [parts, setParts] = useState([]);
  const [activePart, setActivePart] = useState(0);
  const [roundItems, setRoundItems] = useState({}); // partId → [{menuId,name,price,qty}]
  const [partPhones, setPartPhones] = useState({}); // partId → phone string
  const [partOrderIds, setPartOrderIds] = useState({}); // partId → server order._id
  const [partOrderNumbers, setPartOrderNumbers] = useState({}); // partId → server orderNumber
  const [roundMsg, setRoundMsg] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [settled, setSettled] = useState(false); // success screen
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(true); // mobile menu collapse toggle
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTransferTable, setSelectedTransferTable] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState('');
  const [paymentType, setPaymentType] = useState('Paid'); // 'Paid' or 'Guest'
  const [guestNote, setGuestNote] = useState('');
  const [paymentMode, setPaymentMode] = useState('Online');
  const billRef = useRef(null);
  const isSavingRef = useRef(false); // prevents double-dispatch

  // ── Draft cache — stores [{label, items}] per part, keyed by tableId ─────
  const draftKey = tableId ? `restro_draft_${tableId}` : null;

  // Serialize all parts' current round items into [{label, items}]
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
    } catch {}
  };

  // Returns [{label, items}] or null
  const loadDraft = () => {
    if (!draftKey) return null;
    try { const v = localStorage.getItem(draftKey); return v ? JSON.parse(v) : null; }
    catch { return null; }
  };

  const clearDraft = () => { if (draftKey) { try { localStorage.removeItem(draftKey); } catch {} } };

  // Apply a draft snapshot onto a list of parts (matched by index)
  const applyDraft = (loadedParts, draft) => {
    if (!draft || !draft.length) return;
    const restored = {};
    draft.forEach((d, idx) => {
      const part = loadedParts[idx];
      if (part && d.items && d.items.length > 0) restored[part.id] = d.items;
    });
    if (Object.keys(restored).length > 0) setRoundItems(restored);
  };

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
          // Restore draft into matching parts by index
          applyDraft(loadedParts, loadDraft());
        } else {
          // New session — create first part, restore draft
          const p1 = newPart(1);
          if (tableId) p1.label = `Table ${tableId.replace('Table ', '')}`;
          // Check if draft had multiple parts (split session)
          const draft = loadDraft();
          if (draft && draft.length > 1) {
            // Recreate all parts from draft
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

  // ── Auto-save ALL parts' draft whenever roundItems or parts change ────────
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

  // ── Tax config ────────────────────────────────────────────────────────
  const taxEnabled = user?.taxEnabled || false;
  const taxes = (user?.taxes || []).filter(t => t.enabled);

  // ── Menu derived ──────────────────────────────────────────────────────
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

  // ── Helpers ───────────────────────────────────────────────────────────
  const currentPartId = parts[activePart]?.id;
  const currentPartIdRef = useRef(currentPartId);
  const menuItemsRef = useRef(menuItems);
  // Keep refs always up to date
  currentPartIdRef.current = currentPartId;
  menuItemsRef.current = menuItems;
  const currentRoundOf = (partId) => roundItems[partId] || [];
  const phoneOf = (partId) => partPhones[partId] || '';

  const allItemsForPart = (partId) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return [];
    const saved = part.rounds.flatMap(r => r.items);
    const current = currentRoundOf(partId);
    const merged = [...saved];
    current.forEach(ci => {
      const ex = merged.find(m => m.menuId === ci.menuId);
      if (ex) ex.qty += ci.qty;
      else merged.push({ ...ci });
    });
    return merged;
  };

  const subtotalOf = (items) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const taxListOf = (sub) =>
    taxEnabled
      ? taxes.map(t => ({ name: t.name, pct: t.percentage, amt: +(sub * t.percentage / 100).toFixed(2) }))
      : [];
  const totalOf = (sub, txList) => +(sub + txList.reduce((s, t) => s + t.amt, 0)).toFixed(2);

  // ── Part operations ───────────────────────────────────────────────────
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

  // ── Cart operations ───────────────────────────────────────────────────
  const addItem = (item) => {
    setRoundItems(prev => {
      const list = prev[currentPartId] || [];
      const ex = list.find(i => i.menuId === item._id);
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
    if (isSavingRef.current) return; // block double-calls
    const { closeAfterSave = false } = options;
    const items = currentRoundOf(partId);
    if (!items.length) return;

    isSavingRef.current = true;
    try {
      let orderId = partOrderIds[partId];
      if (orderId) {
        await axios.patch(`/api/orders/${orderId}/add-items`, { items: items.map(i => ({ ...i, quantity: i.qty })) });
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
        orderId = res.data._id;
        setPartOrderIds(prev => ({ ...prev, [partId]: orderId }));
        setPartOrderNumbers(prev => ({ ...prev, [partId]: res.data.orderNumber }));
        setParts(prev => prev.map(p => {
          if (p.id !== partId) return p;
          return { ...p, rounds: [{ roundNumber: 1, items: [...items] }] };
        }));
      }

      setRoundItems(prev => ({ ...prev, [partId]: [] }));
      clearDraft(); // clear draft after successful dispatch
      setRoundMsg(true);
      setTimeout(() => setRoundMsg(false), 2000);
      if (closeAfterSave) {
        setIsDispatching(true);
        setTimeout(() => { onClose?.(); }, 170);
      }
      return orderId;
    } catch (err) {
      console.error('Failed to save round:', err);
      alert('Error saving round to database.');
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleTransfer = async () => {
    const orderId = partOrderIds[currentPartId];
    if (!orderId) {
      alert("Please save this part first before transferring. Click 'Dispatch to kitchen' to save.");
      return;
    }
    if (!selectedTransferTable) {
      alert("Please select a destination table.");
      return;
    }
    
    try {
      await axios.patch(`/api/orders/${orderId}/transfer`, { newTableId: selectedTransferTable });
      
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

  // ── Voice Ordering Logic ─────────────────────────────────────────────────
  // lang='mr-IN' handles Marathi AND English speech in one session.
  // Alias table built from live menu + hardcoded Marathi spoken forms.
  // All errors handled per-type; never crashes; 6s auto-stop timer.

  const SpeechRecognitionAPI = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
  const isMicSupported = Boolean(SpeechRecognitionAPI);

  const recognitionRef  = useRef(null);
  const isListeningRef  = useRef(false); // guards against double-start
  const silenceTimerRef = useRef(null);

  const MARATHI_NUMBERS = {
    '\u090F\u0915':1,'\u0926\u094B\u0928':2,'\u0924\u0940\u0928':3,'\u091A\u093E\u0930':4,'\u092A\u093E\u091A':5,
    '\u0938\u0939\u093E':6,'\u0938\u093E\u0924':7,'\u0906\u0920':8,'\u0928\u090A':9,'\u0926\u0939\u093E':10,
    '\u0926\u094B':2,'\u092A\u093E\u0901\u091A':5,'\u091B\u0939':6,
    one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,
  };

  // Build alias-table from live menu items + Marathi spoken aliases
  const _buildAliasTable = () => {
    const items = menuItemsRef.current || [];
    const byName = new Map(items.map(i => [i.name.toLowerCase(), i]));

    const STATIC = [
      ['\u0917\u0941\u0932\u093E\u092C \u091C\u093E\u092E\u0941\u0928','Gulab Jamun'],
      ['\u0917\u0941\u0932\u093E\u092C','Gulab Jamun'],
      ['\u091A\u093F\u0915\u0928 \u091F\u093F\u0915\u094D\u0915\u093E','Chicken Tikka'],
      ['\u091A\u093F\u0915\u0928','Chicken Tikka'],
      ['\u092A\u0928\u0940\u0930 \u092C\u091F\u0930 \u092E\u0938\u093E\u0932\u093E','Paneer Butter Masala'],
      ['butter masala','Paneer Butter Masala'],
      ['\u092C\u091F\u0930 \u092E\u0938\u093E\u0932\u093E','Paneer Butter Masala'],
      ['\u092A\u0928\u0940\u0930 \u091F\u093F\u0915\u094D\u0915\u093E','\u092A\u0928\u0940\u0930 \u091F\u093F\u0915\u094D\u0915\u093E \u092E\u0938\u093E\u0932\u093E'],
      ['\u092D\u0941\u0930\u094D\u091C\u0940','\u092A\u0928\u0940\u0930 \u092D\u0941\u0930\u094D\u091C\u0940'],
      ['\u0936\u0947\u0935','\u0936\u0947\u0935 \u092D\u093E\u091C\u0940'],
    ];

    const table = new Map();
    for (const item of items) table.set(item.name.toLowerCase(), item);
    for (const [spoken, canonical] of STATIC) {
      const item = byName.get(canonical.toLowerCase());
      if (item) table.set(spoken.toLowerCase(), item);
    }
    // Sort longest alias first (most specific wins)
    return [...table.entries()].sort((a, b) => b[0].length - a[0].length);
  };

  // Match transcript against alias table; returns [{item, qty}]
  const _matchMenuItems = (transcript) => {
    const text = transcript.toLowerCase().trim();
    const aliases = _buildAliasTable();
    const segments = text.split(/\s+\u0906\u0923\u093F\s+|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
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

  // Try all maxAlternatives; return first that produces a match
  const _tryAlternatives = (result) => {
    for (let j = 0; j < result.length; j++) {
      const candidate = result[j].transcript.trim();
      const matched = _matchMenuItems(candidate);
      if (matched.length) return { matched, transcript: candidate };
    }
    return { matched: [], transcript: result[0].transcript.trim() };
  };

  // Commit matched items to current part
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
    const summary = matched.map(x => `${x.qty}\u00d7 ${x.item.name}`).join(', ');
    setTranscriptResult(`\u2705 Added: ${summary}`);
    setTimeout(() => setTranscriptResult(''), 3500);
  };

  // Safe stop — always works
  const _stopMic = () => {
    clearTimeout(silenceTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
      recognitionRef.current = null;
    }
    isListeningRef.current = false;
    setIsListening(false);
  };

  // Start a fresh recognition session
  const _startMic = () => {
    if (isListeningRef.current) { _stopMic(); return; }
    if (!SpeechRecognitionAPI) return;

    const rec = new SpeechRecognitionAPI();
    rec.lang            = 'mr-IN'; // handles Marathi + English in one session
    rec.interimResults  = true;
    rec.continuous      = false;
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setTranscriptResult('\uD83C\uDFA4 \u090F\u0948\u0915\u0924\u094B\u092F... / Listening...');
    };

    rec.onresult = (event) => {
      clearTimeout(silenceTimerRef.current);
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const { matched, transcript } = _tryAlternatives(event.results[i]);
          if (matched.length) { _addVoiceItems(matched); _stopMic(); return; }
          setTranscriptResult(`\u274C \u0938\u093E\u092A\u0921\u0932\u0947 \u0928\u093E\u0939\u0940 / Not found: "${transcript}"`);
          setTimeout(() => setTranscriptResult(''), 3000);
          _stopMic();
        } else {
          setTranscriptResult(`\uD83C\uDFA4 ${event.results[i][0].transcript}`);
        }
      }
    };

    rec.onerror = (event) => {
      switch (event.error) {
        case 'aborted': break; // silent
        case 'no-speech': _stopMic(); break;
        case 'audio-capture':
          setTranscriptResult('\u26A0\uFE0F Mic not found / \u092E\u093E\u0907\u0915 \u0938\u093E\u092A\u0921\u0932\u093E \u0928\u093E\u0939\u0940');
          setTimeout(() => setTranscriptResult(''), 3000); _stopMic(); break;
        case 'not-allowed':
          setTranscriptResult('\uD83D\uDD12 Allow mic / \u092E\u093E\u0907\u0915 \u092A\u0930\u0935\u093E\u0928\u0917\u0940 \u0926\u094D\u092F\u093E');
          setTimeout(() => setTranscriptResult(''), 4000); _stopMic(); break;
        case 'network':
          _stopMic(); setTimeout(() => _startMic(), 600); break;
        default: _stopMic(); break;
      }
    };

    rec.onend = () => { isListeningRef.current = false; setIsListening(false); clearTimeout(silenceTimerRef.current); };

    try {
      rec.start();
      recognitionRef.current = rec;
      // Auto-stop after 6 seconds
      silenceTimerRef.current = setTimeout(() => {
        _stopMic();
        setTranscriptResult('\u23F1 Time\'s up. Tap mic & try again.');
        setTimeout(() => setTranscriptResult(''), 2500);
      }, 6000);
    } catch (_) {
      isListeningRef.current = false;
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isReadOnly || !isMicSupported) return;
    isListeningRef.current ? _stopMic() : _startMic();
  };

  // Cleanup on unmount
  useEffect(() => () => _stopMic(), []);

  // ── Bill / WA message builders ────────────────────────────────────────
  const buildBill = (partId) => {
    const part = parts.find(p => p.id === partId);
    const items = allItemsForPart(partId);
    const sub = subtotalOf(items);
    const txList = taxListOf(sub);
    const total = totalOf(sub, txList);
    return {
      tableId,
      partLabel: part?.label || 'Bill',
      items, sub, txList, total,
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
      `🏨 *${bill.restaurantName}*`,
      bill.restaurantAddress ? `📍 ${bill.restaurantAddress}` : undefined,
      bill.restaurantPhone ? `📞 ${bill.restaurantPhone}` : undefined,
      bill.fssaiNumber ? `FSSAI: ${bill.fssaiNumber}` : undefined,
      bill.gstNumber ? `GSTIN: ${bill.gstNumber}` : undefined,
      '',
      `🧾 *I N V O I C E*`,
      `Order ID: ${formatOrderDisplay(bill.orderNumber, bill.orderId)}`,
      `Mode: ${bill.paymentMode}`,
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
    let orderId = partOrderIds[partId];
    if (unsaved.length > 0) {
      // Wait for save before settling
      const savedId = await saveRound(partId);
      if (savedId) orderId = savedId;
    }

    const bill = buildBill(partId);
    // orderId may now be available from the auto-save

    if (!orderId) {
      alert("No saved items to settle! Please add items and 'Save Round' first.");
      return;
    }

    const hasWA = mode === 'wa' || mode === 'both';
    const doPrint = mode === 'print' || mode === 'both';
    const phone = phoneOf(partId).replace(/\D/g, '');
    // Mobile number is required only for WhatsApp and Both; optional for Print
    if (hasWA && phone.length < 10) {
      alert('Please enter a valid 10-digit customer mobile number for WhatsApp.');
      return;
    }

    try {
      // Save phone number + Mark as Paid on Server
      await axios.patch(`/api/orders/${orderId}/status`, {
        status: 'Paid',
        paymentType: paymentType,
        guestNote: paymentType === 'Guest' ? guestNote : '',
        paymentMode: paymentType === 'Guest' ? 'Guest' : paymentMode,
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
      const idx = parts.findIndex(p => p.id === partId);
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
          <div className="text-center font-black text-base tracking-[0.3em] uppercase">
            Invoice
          </div>
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
  const activePartData = parts[activePart];
  const isReadOnly = isHistoryView || activePartData?.status === 'Paid' || activePartData?.status === 'Cancelled';
  const isWaiter = user?.role === 'Waiter';
  const activeAllItems = activePartData ? allItemsForPart(activePartData.id) : [];
  const activeCurrent = currentRoundOf(currentPartId);
  const activeSub = subtotalOf(activeAllItems);
  const activeTaxes = taxListOf(activeSub);
  const activeTotal = totalOf(activeSub, activeTaxes);

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
          <div className="flex gap-2">
            <button
              onClick={() => setShowTransferModal(true)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Transfer
            </button>
            <button
              onClick={addPart}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Split Table
            </button>
          </div>
        )}
      </div>

      <div className="mx-5 border-b border-slate-200 no-print"></div>

      {/* ── Parts Tab Bar ─────────────────────────────────────────────── */}
      {parts.length > 1 && (
        <div className="px-5 no-print">
          <div className="flex gap-2 overflow-x-auto pb-2 pt-3 no-scrollbar">
            {parts.map((p, idx) => {
              const items = allItemsForPart(p.id);
              const tot = totalOf(subtotalOf(items), taxListOf(subtotalOf(items)));
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
                const tot = totalOf(subtotalOf(items), taxListOf(subtotalOf(items)));
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

          {/* ── Mobile collapse toggle (hidden on desktop) ───────────── */}
          <button
            className="lg:hidden flex items-center justify-between w-full px-5 py-3 bg-white border-b border-slate-100 active:bg-slate-50 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Menu</span>
              {activeCurrent.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5a36] text-white text-[9px] font-black">
                  {activeCurrent.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </div>
            <span className={cn(
              'text-slate-400 transition-transform duration-200',
              menuOpen ? 'rotate-180' : 'rotate-0'
            )}>
              <ArrowRight size={14} className="rotate-90" />
            </span>
          </button>

          {/* ── Search + filters + list (collapsible on mobile) ────────── */}
          <div className={cn(menuOpen ? 'block' : 'hidden', 'lg:flex lg:flex-col lg:flex-1 lg:overflow-hidden')}>
            <div className="px-5 pt-2 pb-4 lg:sticky lg:top-0 z-10 bg-[#f8f7f5] lg:bg-white">
              <div className="mb-4">
              <div className="flex items-center gap-2">
                <div className="relative group flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search your cravings..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 outline-none text-sm text-slate-700 placeholder:text-slate-400 focus:border-orange-400 transition-colors"
                  />
                </div>
                {isMicSupported && !isReadOnly && (
                  <button
                    onClick={toggleListening}
                    title={isListening ? 'Tap to stop' : 'Tap to voice order'}
                    className={cn(
                      'w-11 h-11 shrink-0 flex items-center justify-center rounded-xl border transition-all duration-200 relative select-none',
                      isListening
                        ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-200'
                        : 'bg-white border-slate-200 text-slate-400 hover:text-[#ff5a36] hover:border-[#ff5a36]'
                    )}
                  >
                    {isListening && (
                      <span className="absolute inset-0 rounded-xl bg-red-400 animate-ping opacity-40" />
                    )}
                    {isListening ? <Mic size={17} /> : <MicOff size={17} />}
                  </button>
                )}
              </div>
              {transcriptResult && (
                <div
                  className={cn(
                    'mt-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                    transcriptResult.startsWith('\u2705')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : transcriptResult.startsWith('\u274C') || transcriptResult.startsWith('\u26A0')
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-slate-800 text-white'
                  )}
                >
                  {transcriptResult}
                </div>
              )}
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
                          "text-[15px] font-medium text-slate-800 tracking-tight leading-snug",
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
          </div>{/* end collapsible wrapper */}
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

            {activeCurrent.length > 0 && (
              <div className="relative pb-2 mb-2 border-b border-slate-200">
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
          </div>

          <div className="bg-[#f8f7f5] space-y-4">
            {activeCurrent.length > 0 && (
              <button
                onClick={() => saveRound(currentPartId)}
                disabled={isDispatching || isSavingRef.current}
                className={cn(
                  'w-full py-4 rounded-xl text-[14px] font-bold tracking-wide transition-all flex items-center justify-center gap-2.5 border shadow-sm active:scale-[0.98]',
                  (isDispatching || isSavingRef.current) && 'opacity-70 cursor-wait',
                  roundMsg
                    ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200'
                    : 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-200 hover:bg-emerald-600 hover:border-emerald-600'
                )}
              >
                {roundMsg
                  ? <><CheckCircle2 size={16} strokeWidth={2.5} /> Order Dispatched!</>
                  : isSavingRef.current
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</>
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
                    placeholder="10-digit mobile number (optional for print)"
                    className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-10 pr-4 outline-none text-sm text-slate-700 placeholder:text-slate-500 focus:border-[#ff5a36] transition-colors"
                    maxLength={10}
                  />
                </div>

                {!isReadOnly && !isWaiter && (
                  <>
                    <div className="flex bg-slate-100 p-1 rounded-full relative overflow-hidden mt-1 shadow-inner">
                      <div
                        className={cn(
                          "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full shadow-sm transition-all duration-300 ease-in-out",
                          paymentMode === 'Online' 
                            ? "translate-x-0 bg-emerald-500" 
                            : "translate-x-[calc(100%+8px)] bg-emerald-500"
                        )}
                      />
                      <button
                        onClick={() => setPaymentMode('Online')}
                        className={cn(
                          "flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-300 rounded-full",
                          paymentMode === 'Online' ? "text-white drop-shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Paid Online
                      </button>
                      <button
                        onClick={() => setPaymentMode('Cash')}
                        className={cn(
                          "flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-300 rounded-full",
                          paymentMode === 'Cash' ? "text-white drop-shadow-sm" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Paid Cash
                      </button>
                    </div>
                  </>
                )}

                {!isReadOnly && !isWaiter ? (
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

      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 no-print">
          <div className="bg-white rounded-[2rem] p-6 lg:p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-slate-900">Transfer Table</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Select destination for <span className="text-slate-700">{parts[activePart]?.label}</span></p>
            <div className="max-h-72 overflow-y-auto no-scrollbar space-y-4 mb-5">
              {(() => {
                const others = availableTables.filter(t => t.tableId !== tableId);
                const areas = [...new Set(others.map(t => t.area || 'Main Floor'))];
                if (others.length === 0) return (
                  <div className="py-8 text-center text-sm text-slate-400 font-semibold">No other tables available</div>
                );
                return areas.map(area => (
                  <div key={area}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5A36] shrink-0" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{area}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {others.filter(t => (t.area || 'Main Floor') === area)
                        .sort((a, b) => {
                          const na = parseInt((a.tableId||'').replace(/\D+/g,''),10);
                          const nb = parseInt((b.tableId||'').replace(/\D+/g,''),10);
                          return (!isNaN(na)&&!isNaN(nb)) ? na-nb : (a.tableId||'').localeCompare(b.tableId||'');
                        })
                        .map(t => (
                          <button
                            key={t._id}
                            onClick={() => setSelectedTransferTable(t.tableId)}
                            className={cn(
                              "px-3 py-2.5 rounded-xl text-xs font-black border transition-all text-left",
                              selectedTransferTable === t.tableId
                                ? "bg-orange-50 border-orange-300 text-[#FF5A36]"
                                : "bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200"
                            )}
                          >
                            {t.tableId}
                          </button>
                        ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <button
              onClick={handleTransfer}
              disabled={!selectedTransferTable}
              className="w-full py-4 bg-[#FF5A36] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Confirm Transfer
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default TableView;

