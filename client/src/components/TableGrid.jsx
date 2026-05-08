import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users, Trash2, MoreVertical, ChevronDown, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TableGridSkeleton } from './Skeleton';

const cn = (...inputs) => twMerge(clsx(inputs));
const LOCAL_AREAS_KEY = 'restro_table_areas';
const LOCAL_AREA_MAP_KEY = 'restro_table_area_map';
const LOCAL_SEEDED_AREAS_KEY = 'restro_seeded_areas';

// ── Table SVG Icon with proper inner text via SVG <text> ─────────────────────
const TableIcon = ({ label = '', occupied = false }) => {
  // Shrink font for longer labels
  const fontSize = label.length > 8 ? 13 : label.length > 6 ? 16 : 19;
  const iconColor    = occupied ? '#FF5A36' : '#64748B';
  const chairOpacity = occupied ? '0.35' : '0.28';
  const tableOpacity = occupied ? '1' : '0.82';

  return (
    <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top chairs */}
      <rect x="25" y="4"  width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="69" y="4"  width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      {/* Bottom chairs */}
      <rect x="25" y="94" width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="69" y="94" width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      {/* Left chairs */}
      <rect x="4"  y="28" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="4"  y="66" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      {/* Right chairs */}
      <rect x="94" y="28" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="94" y="66" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      {/* Table surface */}
      <rect x="20" y="20" width="70" height="70" rx="14" fill={iconColor} opacity={tableOpacity}/>
      {/* Table ID */}
      <text
        x="55" y="57"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontFamily="'DM Sans', sans-serif"
        fontWeight="800"
        fontSize={fontSize}
        letterSpacing="-0.4"
      >
        {label}
      </text>
    </svg>
  );
};

const sizeLabel = (seats) => {
  if (seats <= 4) return 'Small';
  if (seats <= 6) return 'Medium';
  return 'Large';
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  Occupied:  { label: 'Occupied',  text: 'text-[#FF5A36]',    bg: 'bg-orange-50 border-orange-100' },
  Available: { label: 'Available', text: 'text-emerald-600',  bg: 'bg-emerald-50 border-emerald-100' },
  Reserved:  { label: 'Reserved',  text: 'text-blue-500',     bg: 'bg-blue-50 border-blue-100' },
};

const TableGrid = ({ activeOrders, onTableClick, readOnly = false }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [newTable, setNewTable] = useState({ tableId: '', seats: 4 });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedArea, setSelectedArea] = useState('Main Floor');
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newArea, setNewArea] = useState('');
  const [areaOptions, setAreaOptions] = useState(['Main Floor']);

  const getLocalAreas = () => {
    try {
      const raw = localStorage.getItem(LOCAL_AREAS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveLocalAreas = (areas) => {
    try {
      localStorage.setItem(LOCAL_AREAS_KEY, JSON.stringify(areas));
    } catch {
      // no-op
    }
  };

  const getLocalAreaMap = () => {
    try {
      const raw = localStorage.getItem(LOCAL_AREA_MAP_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveLocalAreaMap = (mapObj) => {
    try {
      localStorage.setItem(LOCAL_AREA_MAP_KEY, JSON.stringify(mapObj || {}));
    } catch {
      // no-op
    }
  };

  const getSeededAreas = () => {
    try {
      const raw = localStorage.getItem(LOCAL_SEEDED_AREAS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const saveSeededAreas = (areas) => {
    try {
      localStorage.setItem(LOCAL_SEEDED_AREAS_KEY, JSON.stringify(areas));
    } catch {
      // no-op
    }
  };

  const tableMapKey = (table) => {
    if (!table) return '';
    return table._id || `legacy:${table.tableId || ''}`;
  };

  const resolveTableArea = (table) => {
    const explicit = (table?.area || '').trim();
    if (explicit) return explicit;
    const map = getLocalAreaMap();
    const key = tableMapKey(table);
    if (key && map[key]) return map[key];
    // fallback for older local keys (before _id-based mapping)
    if (table?.tableId && map[table.tableId]) return map[table.tableId];
    return 'Main Floor';
  };

  const getAreaPrefix = (areaName) => {
    // Extract first 3 alphanumeric characters from the area name
    const chars = String(areaName || '')
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '');
    if (!chars) return 'FLR';
    // Capitalize first letter, keep rest as-is, take first 3
    const prefix = chars.slice(0, 3);
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const createDefaultTablesForArea = async (areaName, minCount = 10) => {
    const normalizedArea = String(areaName || '').trim();
    if (!normalizedArea || normalizedArea.toLowerCase() === 'main floor') return;

    // Fetch fresh table data from server to avoid stale-state duplicates
    let freshTables = [];
    try {
      const res = await axios.get('/api/tables');
      freshTables = res.data || [];
    } catch (err) {
      console.error('Failed to fetch fresh tables:', err);
      return;
    }

    const existingForArea = freshTables.filter(t => {
      const area = (t.area || '').trim();
      if (area) return area === normalizedArea;
      const map = getLocalAreaMap();
      const key = tableMapKey(t);
      return (key && map[key] === normalizedArea) || (t.tableId && map[t.tableId] === normalizedArea);
    }).length;
    if (existingForArea >= minCount) return;

    const existingIds = new Set(freshTables.map(t => t.tableId));
    const prefix = getAreaPrefix(normalizedArea);
    const payloads = [];

    for (let i = existingForArea + 1; i <= minCount; i++) {
      let candidate = `${prefix}-T${i}`;
      let seq = i;
      while (existingIds.has(candidate)) {
        seq += 1;
        candidate = `${prefix}-T${seq}`;
      }
      existingIds.add(candidate);
      payloads.push({ tableId: candidate, seats: 4, area: normalizedArea });
    }

    for (const payload of payloads) {
      const res = await axios.post('/api/tables', payload);
      const created = res?.data;
      const map = getLocalAreaMap();
      const key = tableMapKey(created) || `legacy:${payload.tableId}`;
      map[key] = normalizedArea;
      saveLocalAreaMap(map);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await axios.get('/api/tables');
      setTables(res.data);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await axios.get('/api/table-areas');
      if (Array.isArray(res.data) && res.data.length) {
        setAreaOptions(res.data);
        saveLocalAreas(res.data);
      } else {
        const localAreas = getLocalAreas();
        setAreaOptions(localAreas.length ? localAreas : ['Main Floor']);
      }
    } catch (err) {
      console.error('Error fetching table areas:', err);
      const localAreas = getLocalAreas();
      setAreaOptions(localAreas.length ? localAreas : ['Main Floor']);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchAreas();
  }, []);

  useEffect(() => {
    if (areaOptions.length && !areaOptions.includes(selectedArea)) {
      setSelectedArea(areaOptions[0]);
    }
  }, [areaOptions, selectedArea]);

  useEffect(() => {
    const nonMainAreas = (areaOptions || []).filter(a => String(a).trim().toLowerCase() !== 'main floor');
    const seeded = getSeededAreas();
    const run = async () => {
      let changed = false;
      const nextSeeded = [...seeded];
      for (const area of nonMainAreas) {
        if (nextSeeded.includes(area)) continue;
        try {
          await createDefaultTablesForArea(area, 10);
          nextSeeded.push(area);
          changed = true;
        } catch (err) {
          console.error(`Failed seeding default tables for ${area}:`, err);
        }
      }
      saveSeededAreas(nextSeeded);
      if (changed) await fetchTables();
    };
    if (nonMainAreas.length) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaOptions]);

  useEffect(() => {
    const fromTables = Array.from(
      new Set((tables || []).map(t => resolveTableArea(t)).filter(Boolean))
    );
    if (!fromTables.length) return;
    const map = getLocalAreaMap();
    (tables || []).forEach((t) => {
      const key = tableMapKey(t);
      if (!key) return;
      map[key] = resolveTableArea(t);
    });
    saveLocalAreaMap(map);
    setAreaOptions((prev) => {
      const merged = Array.from(new Set([...(prev || []), ...fromTables]));
      saveLocalAreas(merged);
      return merged;
    });
  }, [tables]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleAddTable = async () => {
    if (!newTable.tableId) return;
    try {
      const res = await axios.post('/api/tables', { ...newTable, area: selectedArea });
      const created = res?.data;
      const map = getLocalAreaMap();
      const key = tableMapKey(created) || `legacy:${newTable.tableId}`;
      map[key] = selectedArea;
      saveLocalAreaMap(map);
      setShowAddModal(false);
      setNewTable({ tableId: '', seats: 4 });
      fetchTables();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add table');
    }
  };

  const handleRemoveTable = async (tableId) => {
    if (!window.confirm(`Remove ${tableId}?`)) return;
    try {
      const target = (tables || []).find(t => t.tableId === tableId);
      await axios.delete(`/api/tables/${tableId}`);
      const map = getLocalAreaMap();
      const key = tableMapKey(target);
      if (key && map[key]) {
        delete map[key];
      }
      if (map[tableId]) {
        delete map[tableId]; // clean older key shape if present
        saveLocalAreaMap(map);
      }
      fetchTables();
    } catch (err) { alert('Failed to remove table'); }
  };

  const handleUpdateSeats = async (tableId, seats) => {
    try {
      await axios.patch(`/api/tables/${tableId}`, { seats });
      setShowEditModal(null);
      fetchTables();
    } catch (err) { alert('Failed to update seats'); }
  };

  const getTableInfo = (tableId) => {
    const orders = (activeOrders || []).filter(
      o => o.tableId === tableId && o.orderType === 'Dine-in' && o.status !== 'Paid' && o.status !== 'Cancelled'
    );
    if (!orders.length) return { status: 'Available', billTotal: 0 };
    const total = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { status: 'Occupied', billTotal: total };
  };

  const displayedTables = tables.filter(t => resolveTableArea(t) === selectedArea);

  const occupied  = displayedTables.filter(t => getTableInfo(t.tableId).status === 'Occupied').length;
  const available = displayedTables.filter(t => getTableInfo(t.tableId).status === 'Available').length;

  const handleCreateArea = async () => {
    const name = (newArea || '').trim();
    if (!name) return;

    // Mark as seeded FIRST — before updating areaOptions — so the seeding
    // useEffect that fires on areaOptions change will skip this area.
    const seeded = getSeededAreas();
    if (!seeded.includes(name)) saveSeededAreas([...seeded, name]);

    const mergedLocal = Array.from(new Set([...(areaOptions || []), name]));
    setAreaOptions(mergedLocal);
    saveLocalAreas(mergedLocal);
    setSelectedArea(name);
    setNewArea('');
    setShowAddAreaModal(false);
    setAreaMenuOpen(false);

    try {
      const res = await axios.post('/api/table-areas', { name });
      if (Array.isArray(res.data) && res.data.length) {
        setAreaOptions(res.data);
        saveLocalAreas(res.data);
      } else {
        setAreaOptions(mergedLocal);
      }
    } catch (err) {
      console.warn('Area saved locally; backend sync failed:', err?.response?.data?.error || err.message);
    }

    try {
      await createDefaultTablesForArea(name, 10);
      await fetchTables();
    } catch (err) {
      console.error('Failed creating default floor tables:', err);
      alert(err.response?.data?.error || 'Floor created, but default tables could not be added.');
    }
  };

  const handleRemoveArea = async (areaToRemove) => {
    if (!window.confirm(`Are you sure you want to remove the floor "${areaToRemove}"? All tables inside this floor will be deleted.`)) return;
    
    try {
      const res = await axios.delete(`/api/table-areas/${encodeURIComponent(areaToRemove)}`);
      
      const newOptions = areaOptions.filter(a => a !== areaToRemove);
      setAreaOptions(newOptions);
      saveLocalAreas(newOptions);
      
      if (selectedArea === areaToRemove) {
        setSelectedArea('Main Floor');
      }
      
      await fetchTables();
    } catch (err) {
      console.error('Failed to remove area:', err);
      alert(err.response?.data?.error || 'Failed to remove area');
    }
  };

  if (loading) return <TableGridSkeleton />;

  return (
    <section className="p-4 lg:p-6 pb-24 lg:pb-6 animate-in fade-in duration-500">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 lg:mb-5 gap-3">
        <div className="flex justify-between items-start w-full md:w-auto">
          <div>
            <h1 className="text-lg lg:text-[1.7rem] font-black text-slate-900 tracking-tight uppercase">Tables</h1>
            <p className="text-[8px] lg:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-1">Floor Management</p>
          </div>
          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex md:hidden items-center gap-1.5 px-4 py-2.5 bg-[#FF5A36] hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-200"
            >
              <Plus size={14} strokeWidth={3}/> Add
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 lg:gap-4 w-full md:w-auto">
          <div className="relative shrink-0">
            <button
              onClick={() => setAreaMenuOpen(o => !o)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-100 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm"
            >
              <Building2 size={14} className="text-slate-400" />
              {selectedArea}
              <ChevronDown size={14} className={cn('text-slate-400 transition-transform', areaMenuOpen && 'rotate-180')} />
            </button>
            {areaMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                <div className="max-h-52 overflow-y-auto">
                  {areaOptions.map((area) => (
                    <div key={area} className={cn("flex items-center w-full group", selectedArea === area ? "bg-slate-900 text-white" : "hover:bg-slate-50")}>
                      <button
                        onClick={() => { setSelectedArea(area); setAreaMenuOpen(false); }}
                        className={cn(
                          'flex-1 px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider transition-colors',
                          selectedArea === area ? 'text-white' : 'text-slate-600'
                        )}
                      >
                        {area}
                      </button>
                      {!readOnly && area.toLowerCase() !== 'main floor' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveArea(area); }}
                          className={cn(
                            "px-3 py-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity",
                            selectedArea === area ? "hover:text-white" : "hover:bg-rose-50"
                          )}
                          title="Remove Floor"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => { setShowAddAreaModal(true); setAreaMenuOpen(false); }}
                    className="w-full px-3 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-[#FF5A36] border-t border-slate-100 hover:bg-orange-50"
                  >
                    + Add Floor / Room
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary pills */}
          <div className="flex items-center justify-center flex-1 md:flex-none gap-3 lg:gap-4 bg-white rounded-xl lg:rounded-2xl px-4 py-3 border border-slate-100 shadow-sm w-full md:w-auto">
            <div className="flex items-center gap-1.5 lg:gap-2">
               <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-[#FF5A36]"></span>
               <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Occupied</span>
               <span className="text-sm lg:text-xl font-black text-[#FF5A36]">{occupied}</span>
            </div>
            <span className="text-slate-200 font-bold">|</span>
            <div className="flex items-center gap-1.5 lg:gap-2">
               <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-emerald-400"></span>
               <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">Available</span>
               <span className="text-sm lg:text-xl font-black text-emerald-500">{available}</span>
            </div>
          </div>

          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="hidden md:flex items-center gap-2 px-5 py-3 bg-[#FF5A36] hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-200 active:scale-95 shrink-0"
            >
              <Plus size={16} strokeWidth={3}/> Add Table
            </button>
          )}
        </div>
      </div>

      {/* ── Cards Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 lg:gap-4">
        {[...displayedTables]
          .sort((a, b) => {
            // Natural sort: extract trailing numbers for numeric comparison
            const numA = parseInt((a.tableId || '').replace(/\D+/g, ''), 10);
            const numB = parseInt((b.tableId || '').replace(/\D+/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return (a.tableId || '').localeCompare(b.tableId || '');
          })
          .map((table) => {
          const { status, billTotal } = getTableInfo(table.tableId);
          const cfg = STATUS[status] || STATUS.Available;
          const isOccupied = status === 'Occupied';
          const seats = table.seats || 4;
          const size  = sizeLabel(seats);
          const isMenuOpen = openMenuId === table.tableId;

          return (
            <div
              key={table._id}
              className={cn(
                'bg-white rounded-[1rem] lg:rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 relative h-[96px] lg:h-[150px]',
                isOccupied ? 'border-orange-100' : 'border-slate-100'
              )}
            >
              {/* Status badge */}
              <div className={cn(
                'absolute top-1.5 lg:top-2.5 right-1.5 lg:right-2.5 px-1 lg:px-1.5 py-[2px] rounded-full text-[6px] lg:text-[8px] font-black uppercase tracking-wider border',
                cfg.bg, cfg.text
              )}>
                {cfg.label}
              </div>

              {!readOnly && (
                <div className="absolute top-1 lg:top-1.5 left-1 lg:left-1.5 z-20" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setOpenMenuId(isMenuOpen ? null : table.tableId)}
                    className="w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    <MoreVertical size={13} className="w-[10px] h-[10px] lg:w-[13px] lg:h-[13px]"/>
                  </button>
                  {isMenuOpen && (
                    <div className="absolute left-0 mt-1 w-44 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-1 space-y-0.5">
                        <button
                          onClick={() => { setShowEditModal(table); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-[10px] font-black text-slate-600 hover:bg-slate-50 rounded-lg uppercase tracking-wider"
                        >
                          <Users size={11} className="text-slate-400"/> Change Seats
                        </button>
                        <button
                          onClick={() => { handleRemoveTable(table.tableId); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-[10px] font-black text-rose-500 hover:bg-rose-50 rounded-lg uppercase tracking-wider"
                        >
                          <Trash2 size={11}/> Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clickable area */}
              <div
                onClick={() => onTableClick(table.tableId)}
                className="cursor-pointer p-2 lg:p-3.5 pt-5 lg:pt-4 flex flex-col h-full"
              >
                {/* Icon centered */}
                <div className="flex justify-center mb-1.5 lg:mb-3 mt-1 lg:mt-2 flex-grow items-center">
                  <div className="w-[40px] h-[40px] lg:w-[62px] lg:h-[62px] flex items-center justify-center transfrom hover:scale-105 transition-transform">
                    <TableIcon label={table.tableId} occupied={isOccupied}/>
                  </div>
                </div>

                {/* Bottom info */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[8px] lg:text-[11px] font-black text-slate-900 leading-tight">{seats} Seats</span>
                    <span className="text-[7px] lg:text-[9px] font-semibold text-slate-400 capitalize">{size}</span>
                  </div>
                  {/* Bill amount only when occupied */}
                  {isOccupied && billTotal > 0 && (
                     <span className="text-[8px] lg:text-[12px] font-black text-[#FF5A36] truncate ml-0.5">
                      ₹{Math.round(billTotal)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayedTables.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 mt-4 text-center">
          <p className="text-sm font-black text-slate-300 uppercase tracking-widest">No tables in {selectedArea}</p>
          <p className="text-xs font-semibold text-slate-400 mt-2">Add a table to start managing this area</p>
        </div>
      )}

      {/* ── Add Table Modal ───────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">New Table</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">Add a seating zone to your floor</p>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Table ID</label>
                <input type="text" placeholder="e.g. T-11 or VIP-1"
                  value={newTable.tableId}
                  onChange={e => setNewTable({...newTable, tableId: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Seating Capacity</label>
                <input type="number" value={newTable.seats} min={1} max={20}
                  onChange={e => setNewTable({...newTable, seats: parseInt(e.target.value)})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button onClick={handleAddTable}
                className="flex-1 py-4 bg-[#FF5A36] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-200">
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Seats Modal ──────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">Adjust Seats</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">Update capacity for {showEditModal.tableId}</p>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">New Seat Count</label>
              <input type="number" autoFocus min={1} max={20}
                defaultValue={showEditModal.seats} id="edit-seats-input"
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
              />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowEditModal(null)}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button onClick={() => {
                  const s = parseInt(document.getElementById('edit-seats-input').value);
                  handleUpdateSeats(showEditModal.tableId, s);
                }}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Floor/Room Modal ─────────────────────────────────── */}
      {showAddAreaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">Add Floor / Room</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">Create a new area for tables</p>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Area Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. First Floor or VIP Room"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
              />
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setShowAddAreaModal(false); setNewArea(''); }}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateArea}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all"
              >
                Save Area
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TableGrid;
