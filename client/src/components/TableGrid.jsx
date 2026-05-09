import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users, Trash2, MoreVertical, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TableGridSkeleton } from './Skeleton';

const cn = (...inputs) => twMerge(clsx(inputs));
const LOCAL_AREAS_KEY = 'restro_table_areas';
const LOCAL_AREA_MAP_KEY = 'restro_table_area_map';
const LOCAL_TABLES_KEY = 'restro_tables_cache';

// ── Table SVG Icon ──────────────────────────────────────────────────────────
const TableIcon = ({ label = '', occupied = false }) => {
  const fontSize = label.length > 8 ? 18 : label.length > 6 ? 22 : 28;
  const iconColor    = occupied ? '#FF5A36' : '#64748B';
  const chairOpacity = occupied ? '0.35' : '0.28';
  const tableOpacity = occupied ? '1' : '0.82';
  return (
    <svg className="w-full h-full drop-shadow-sm" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="25" y="4"  width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="69" y="4"  width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="25" y="94" width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="69" y="94" width="16" height="12" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="4"  y="28" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="4"  y="66" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="94" y="28" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="94" y="66" width="12" height="16" rx="4" fill={iconColor} opacity={chairOpacity}/>
      <rect x="20" y="20" width="70" height="70" rx="14" fill={iconColor} opacity={tableOpacity}/>
      <text x="55" y="57" textAnchor="middle" dominantBaseline="middle" fill="white"
        fontFamily="'DM Sans', sans-serif" fontWeight="800" fontSize={fontSize} letterSpacing="-0.4">
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

const STATUS = {
  Occupied:  { label: 'Occupied',  text: 'text-[#FF5A36]',   bg: 'bg-orange-50 border-orange-100' },
  Available: { label: 'Available', text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
};

// ── Local cache helpers ─────────────────────────────────────────────────────
const readCache = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const writeCache = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

const TableGrid = ({ activeOrders, onTableClick, readOnly = false }) => {
  const [tables, setTables] = useState([]);
  const [areaOptions, setAreaOptions] = useState(['Main Floor']);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addToArea, setAddToArea] = useState('Main Floor');
  const [newTable, setNewTable] = useState({ tableId: '', seats: 4 });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [newArea, setNewArea] = useState('');

  const getLocalAreaMap = () => readCache(LOCAL_AREA_MAP_KEY, {});
  const saveLocalAreaMap = (m) => writeCache(LOCAL_AREA_MAP_KEY, m);

  const tableMapKey = (t) => t?._id || `legacy:${t?.tableId || ''}`;

  const resolveTableArea = (table) => {
    const explicit = (table?.area || '').trim();
    if (explicit) return explicit;
    const map = getLocalAreaMap();
    const key = tableMapKey(table);
    if (key && map[key]) return map[key];
    if (table?.tableId && map[table.tableId]) return map[table.tableId];
    return 'Main Floor';
  };

  const fetchAll = async () => {
    try {
      const [tablesRes, areasRes] = await Promise.all([
        axios.get('/api/tables'),
        axios.get('/api/table-areas'),
      ]);
      const t = tablesRes.data || [];
      const a = Array.isArray(areasRes.data) && areasRes.data.length ? areasRes.data : ['Main Floor'];
      setTables(t);
      setAreaOptions(a);
      writeCache(LOCAL_TABLES_KEY, t);
      writeCache(LOCAL_AREAS_KEY, a);
      // rebuild local area map
      const map = {};
      t.forEach(tbl => { const k = tableMapKey(tbl); if (k) map[k] = resolveTableArea(tbl); });
      saveLocalAreaMap(map);
    } catch (err) {
      console.error('Error fetching tables/areas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleAddTable = async () => {
    if (!newTable.tableId || isAdding) return;
    setIsAdding(true);
    try {
      const res = await axios.post('/api/tables', { ...newTable, area: addToArea });
      const created = res?.data;
      const map = getLocalAreaMap();
      map[tableMapKey(created)] = addToArea;
      saveLocalAreaMap(map);
      setShowAddModal(false);
      setNewTable({ tableId: '', seats: 4 });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add table');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTable = async (tableId) => {
    if (!window.confirm(`Remove ${tableId}?`)) return;
    try {
      await axios.delete(`/api/tables/${tableId}`);
      fetchAll();
    } catch { alert('Failed to remove table'); }
  };

  const handleUpdateSeats = async (tableId, seats) => {
    try {
      await axios.patch(`/api/tables/${tableId}`, { seats });
      setShowEditModal(null);
      fetchAll();
    } catch { alert('Failed to update seats'); }
  };

  const handleCreateArea = async () => {
    const name = (newArea || '').trim();
    if (!name) return;
    try {
      await axios.post('/api/table-areas', { name });
    } catch (err) {
      console.warn('Area backend sync failed:', err?.response?.data?.error || err.message);
    }
    setShowAddAreaModal(false);
    setNewArea('');
    fetchAll();
  };

  const handleRemoveArea = async (area) => {
    if (!window.confirm(`Remove floor "${area}" and all its tables?`)) return;
    try {
      await axios.delete(`/api/table-areas/${encodeURIComponent(area)}`);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove area');
    }
  };

  const getTableInfo = (tableId) => {
    const orders = (activeOrders || []).filter(
      o => o.tableId === tableId && o.orderType === 'Dine-in' && o.status !== 'Paid' && o.status !== 'Cancelled'
    );
    if (!orders.length) return { status: 'Available', billTotal: 0 };
    return { status: 'Occupied', billTotal: orders.reduce((s, o) => s + (o.totalAmount || 0), 0) };
  };

  const sortTables = (arr) => [...arr].sort((a, b) => {
    const numA = parseInt((a.tableId || '').replace(/\D+/g, ''), 10);
    const numB = parseInt((b.tableId || '').replace(/\D+/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return (a.tableId || '').localeCompare(b.tableId || '');
  });

  // Check if a table has unsaved draft items in localStorage
  const hasDraft = (tId) => {
    try {
      const v = localStorage.getItem(`restro_draft_${tId}`);
      if (!v) return false;
      const arr = JSON.parse(v);
      return Array.isArray(arr) && arr.length > 0;
    } catch { return false; }
  };

  const totalOccupied  = tables.filter(t => getTableInfo(t.tableId).status === 'Occupied').length;
  const totalAvailable = tables.filter(t => getTableInfo(t.tableId).status === 'Available').length;

  if (loading) return <TableGridSkeleton />;

  return (
    <section className="p-4 lg:p-6 pb-24 lg:pb-6 animate-in fade-in duration-500">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 lg:mb-6">
        <div>
          <h1 className="text-lg lg:text-[1.7rem] font-black text-slate-900 tracking-tight uppercase">Tables</h1>
          <p className="text-[8px] lg:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-1">Floor Management</p>
        </div>
        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
          {/* Stats pill */}
          <div className="flex items-center gap-3 lg:gap-4 bg-white rounded-xl lg:rounded-2xl px-3 lg:px-4 py-2.5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36]" />
              <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Occ</span>
              <span className="text-sm lg:text-lg font-black text-[#FF5A36]">{totalOccupied}</span>
            </div>
            <span className="text-slate-200">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Free</span>
              <span className="text-sm lg:text-lg font-black text-emerald-500">{totalAvailable}</span>
            </div>
          </div>
          {!readOnly && (
            <button
              onClick={() => { setAddToArea(areaOptions[0] || 'Main Floor'); setShowAddModal(true); }}
              className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2.5 lg:py-3 bg-[#FF5A36] hover:bg-orange-600 text-white rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-200 active:scale-95"
            >
              <Plus size={14} strokeWidth={3}/> Add Table
            </button>
          )}
        </div>
      </div>

      {/* ── Sections ─────────────────────────────────────────────── */}
      <div className="space-y-8">
        {areaOptions.map((area) => {
          const areaTables = sortTables(tables.filter(t => resolveTableArea(t) === area));
          const areaOccupied  = areaTables.filter(t => getTableInfo(t.tableId).status === 'Occupied').length;
          const areaAvailable = areaTables.filter(t => getTableInfo(t.tableId).status === 'Available').length;

          return (
            <div key={area}>
              {/* Section heading */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Building2 size={13} className="text-slate-400 shrink-0" />
                    <h2 className="text-xs lg:text-sm font-black text-slate-900 uppercase tracking-widest">{area}</h2>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="px-2 py-0.5 bg-orange-50 text-[#FF5A36] rounded-full border border-orange-100">{areaOccupied} occ</span>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">{areaAvailable} free</span>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => { setAddToArea(area); setShowAddModal(true); }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors border border-slate-100"
                    >
                      <Plus size={10} strokeWidth={3}/> Add
                    </button>
                  )}
                </div>
                {!readOnly && area.toLowerCase() !== 'main floor' && (
                  <button
                    onClick={() => handleRemoveArea(area)}
                    className="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-all shrink-0"
                    title="Remove section"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="h-px bg-slate-100 mb-3" />

              {areaTables.length === 0 ? (
                <div className="py-8 text-center text-slate-300 text-xs font-bold uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-slate-100">
                  No tables — tap Add above
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5 lg:gap-3">
                  {areaTables.map((table) => {
                    const { status, billTotal } = getTableInfo(table.tableId);
                    const cfg = STATUS[status] || STATUS.Available;
                    const isOccupied = status === 'Occupied';
                    const seats = table.seats || 4;
                    const isMenuOpen = openMenuId === table.tableId;
                    const tablHasDraft = hasDraft(table.tableId);

                    return (
                      <div
                        key={table._id}
                        className={cn(
                          'rounded-[1rem] lg:rounded-xl border shadow-sm hover:shadow-md transition-all duration-300 relative h-[148px] lg:h-[150px]',
                          tablHasDraft
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : isOccupied ? 'bg-white border-orange-100' : 'bg-white border-slate-100'
                        )}
                      >
                        {/* Status badge */}
                        <div className={cn(
                          'absolute top-1.5 right-1.5 px-1 lg:px-1.5 py-[2px] rounded-full text-[6px] lg:text-[8px] font-black uppercase tracking-wider border',
                          cfg.bg, cfg.text
                        )}>
                          {cfg.label}
                        </div>

                        {/* Draft indicator — pulsing green dot */}
                        {tablHasDraft && (
                          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            <span className="text-[6px] lg:text-[7px] font-black text-emerald-600 uppercase tracking-wider hidden lg:block">Draft</span>
                          </div>
                        )}

                        {!readOnly && (
                          <div className="absolute top-1 left-1 z-20" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setOpenMenuId(isMenuOpen ? null : table.tableId)}
                              className="w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                            >
                              <MoreVertical size={12} className="w-[10px] h-[10px] lg:w-3 lg:h-3"/>
                            </button>
                            {isMenuOpen && (
                              <div className="absolute left-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-150">
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

                        <div
                          onClick={() => onTableClick(table.tableId)}
                          className="cursor-pointer p-2 lg:p-3.5 pt-4 lg:pt-4 flex flex-col h-full"
                        >
                          <div className="flex justify-center mb-1 lg:mb-3 mt-0 lg:mt-2 flex-grow items-center">
                            <div className="w-[70px] h-[70px] lg:w-[62px] lg:h-[62px] flex items-center justify-center hover:scale-105 transition-transform">
                              <TableIcon label={table.tableId} occupied={isOccupied}/>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <div className="flex flex-col">
                              <span className="text-[8px] lg:text-[11px] font-black text-slate-900 leading-tight">{seats} Seats</span>
                              <span className="text-[7px] lg:text-[9px] font-semibold text-slate-400 capitalize">{sizeLabel(seats)}</span>
                            </div>
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
              )}
            </div>
          );
        })}

        {/* Add new section */}
        {!readOnly && (
          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowAddAreaModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-slate-100"
            >
              <Plus size={14} strokeWidth={3}/> Add Section / Floor
            </button>
          </div>
        )}
      </div>

      {/* ── Add Table Modal ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-8 lg:p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">New Table</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">Adding to <span className="text-[#FF5A36]">{addToArea}</span></p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Table ID</label>
                <input type="text" placeholder="e.g. T-11 or VIP-1"
                  value={newTable.tableId}
                  onChange={e => setNewTable({...newTable, tableId: e.target.value})}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Section</label>
                <select value={addToArea} onChange={e => setAddToArea(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all appearance-none cursor-pointer"
                >
                  {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
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
              <button onClick={handleAddTable} disabled={isAdding}
                className={`flex-1 py-4 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-2 ${
                  isAdding ? 'bg-orange-400 cursor-not-allowed' : 'bg-[#FF5A36] hover:bg-orange-600'
                }`}>
                {isAdding ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Adding...</>
                ) : 'Create Table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Seats Modal ────────────────────────────────────── */}
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

      {/* ── Add Section Modal ───────────────────────────────────── */}
      {showAddAreaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">Add Section</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-8">Create a new floor or room</p>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Section Name</label>
              <input
                type="text" autoFocus placeholder="e.g. First Floor or VIP Room"
                value={newArea} onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateArea()}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-400 transition-all"
              />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => { setShowAddAreaModal(false); setNewArea(''); }}
                className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                Cancel
              </button>
              <button onClick={handleCreateArea}
                className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all">
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default TableGrid;
