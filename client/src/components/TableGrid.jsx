import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users, Trash2, MoreVertical, Building2, X, Search, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TableGridSkeleton } from './Skeleton';

const cn = (...inputs) => twMerge(clsx(inputs));
const LOCAL_AREAS_KEY = 'restro_table_areas';
const LOCAL_AREA_MAP_KEY = 'restro_table_area_map';
const LOCAL_TABLES_KEY = 'restro_tables_cache';

// ── Local cache helpers ─────────────────────────────────────────────────────
const readCache = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
};
const writeCache = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { }
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
  const [search, setSearch] = useState('');
  const [activeAreaFilter, setActiveAreaFilter] = useState('All');
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
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
    if (!orders.length) return { status: 'Available', billTotal: 0, partsCount: 0 };
    return { 
      status: 'Occupied', 
      billTotal: orders.reduce((s, o) => s + (o.totalAmount || 0), 0),
      partsCount: orders.length
    };
  };

  const sortTables = (arr) => [...arr].sort((a, b) => {
    const numA = parseInt((a.tableId || '').replace(/\D+/g, ''), 10);
    const numB = parseInt((b.tableId || '').replace(/\D+/g, ''), 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return (a.tableId || '').localeCompare(b.tableId || '');
  });

  const hasDraft = (tId) => {
    try {
      const v = localStorage.getItem(`restro_draft_${tId}`);
      if (!v) return false;
      const arr = JSON.parse(v);
      return Array.isArray(arr) && arr.some(p => p.items && p.items.length > 0);
    } catch { return false; }
  };

  // Stats (disjoint mutually exclusive logic to match visual priority)
  const draftTables = tables.filter(t => hasDraft(t.tableId));
  const occupiedTables = tables.filter(t => !hasDraft(t.tableId) && getTableInfo(t.tableId).status === 'Occupied');
  const availableTables = tables.filter(t => !hasDraft(t.tableId) && getTableInfo(t.tableId).status === 'Available');

  const totalDraft = draftTables.length;
  const totalOccupied = occupiedTables.length;
  const totalAvailable = availableTables.length;

  // Filter tables by search + area + status
  const allAreaOptions = ['All', ...areaOptions];
  const filteredTables = tables.filter(t => {
    const matchSearch = !search || t.tableId.toLowerCase().includes(search.toLowerCase());
    const matchArea = activeAreaFilter === 'All' || resolveTableArea(t) === activeAreaFilter;

    let matchStatus = true;
    if (activeStatusFilter === 'Draft') matchStatus = hasDraft(t.tableId);
    else if (activeStatusFilter === 'Occupied') matchStatus = !hasDraft(t.tableId) && getTableInfo(t.tableId).status === 'Occupied';
    else if (activeStatusFilter === 'Available') matchStatus = !hasDraft(t.tableId) && getTableInfo(t.tableId).status === 'Available';

    return matchSearch && matchArea && matchStatus;
  });

  if (loading) return <TableGridSkeleton />;

  // ── Table Card ──────────────────────────────────────────────────────────────
  const TableCard = ({ table }) => {
    const { status, billTotal } = getTableInfo(table.tableId);
    const isOccupied = status === 'Occupied';
    const tablHasDraft = hasDraft(table.tableId);
    const isMenuOpen = openMenuId === table.tableId;

    return (
      <div
        onClick={() => onTableClick(table.tableId)}
        className={cn(
          'group relative rounded-2xl border cursor-pointer transition-all duration-200 active:scale-[0.97] overflow-hidden flex flex-col justify-between p-4 min-h-[110px]',
          isOccupied
            ? 'bg-orange-50 border-orange-200 shadow-sm shadow-orange-100'
            : tablHasDraft
              ? 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
        )}
      >
        {/* Table ID — big */}
        <div className="flex-1 flex items-start mt-1">
          <p className={cn(
            "text-3xl font-black tracking-tight leading-none uppercase transition-colors",
            isOccupied ? "text-orange-600" : tablHasDraft ? "text-emerald-600" : "text-slate-800 group-hover:text-blue-600"
          )}>
            {table.tableId}
          </p>
        </div>

        {/* Bottom — bill */}
        <div className="flex items-end justify-end mt-2 h-6">
          {isOccupied && billTotal > 0 && (
            <span className="text-[17px] font-black text-orange-600">₹{Math.round(billTotal)}</span>
          )}
        </div>
      </div>
    );
  };

  // ── Bottom sheet modal shared style ──────────────────────────────────────────
  const BottomSheet = ({ onClose: closeSheet, title, subtitle, children, footer }) => (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={closeSheet}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-black text-slate-900 text-base">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={closeSheet}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: 'none' }}>
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-slate-100 shrink-0" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-14 bg-white border-b border-slate-100 shrink-0">
        <span className="text-[17px] font-bold text-slate-900">Tables</span>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={() => setShowAddAreaModal(true)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 bg-white active:scale-95"
              >
                + Section
              </button>
              <button
                onClick={() => { setAddToArea(areaOptions[0] || 'Main Floor'); setShowAddModal(true); }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold active:scale-95 shadow-md shadow-blue-200"
              >
                + Table
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="flex gap-2.5 px-4 py-2.5 bg-white shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tables"
            className="w-full bg-[#f2f2f7] rounded-xl py-2.5 pl-10 pr-4 outline-none text-[15px] text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* ── Area filter chips ── */}
      <div className="px-4 pb-2.5 bg-white shrink-0">
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {allAreaOptions.map(area => (
            <button
              key={area}
              onClick={() => setActiveAreaFilter(area)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap border shrink-0 transition-all',
                activeAreaFilter === area
                  ? 'bg-white border-blue-500 text-blue-600'
                  : 'bg-white border-slate-200 text-slate-600'
              )}
            >
              {area.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats strip (Filters) ── */}
      <div className="flex justify-between gap-1.5 px-3 pb-3 shrink-0">
        <button
          onClick={() => setActiveStatusFilter('All')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border transition-all active:scale-[0.98]',
            activeStatusFilter === 'All' ? 'bg-slate-800 border-slate-900 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
          )}
        >
          <span className="text-[10px] font-bold">{tables.length} All</span>
        </button>
        <button
          onClick={() => setActiveStatusFilter('Occupied')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border transition-all active:scale-[0.98]',
            activeStatusFilter === 'Occupied' ? 'bg-orange-100 border-orange-300 shadow-sm' : 'bg-orange-50/50 border-orange-100/50 hover:bg-orange-50'
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A36] shrink-0" />
          <span className="text-[10px] font-bold text-[#FF5A36]">{totalOccupied} Occ</span>
        </button>
        <button
          onClick={() => setActiveStatusFilter('Draft')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border transition-all active:scale-[0.98]',
            activeStatusFilter === 'Draft' ? 'bg-emerald-100 border-emerald-300 shadow-sm' : 'bg-emerald-50/50 border-emerald-100/50 hover:bg-emerald-50'
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[10px] font-bold text-emerald-600">{totalDraft} Draft</span>
        </button>
        <button
          onClick={() => setActiveStatusFilter('Available')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border transition-all active:scale-[0.98]',
            activeStatusFilter === 'Available' ? 'bg-slate-200 border-slate-300 shadow-sm' : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100'
          )}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-600">{totalAvailable} Free</span>
        </button>
      </div>

      {/* ── Table grid ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-28" style={{ scrollbarWidth: 'none', paddingBottom: 'calc(env(safe-area-inset-bottom) + 112px)' }}>
        {activeAreaFilter === 'All' ? (
          // Group by area
          <div className="space-y-8">
            {areaOptions.map(area => {
              const areaTables = sortTables(
                filteredTables.filter(t => resolveTableArea(t) === area)
              );
              if (areaTables.length === 0 && search) return null;
              return (
                <div key={area}>
                  {/* Area heading */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{area}</span>
                      {/* <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {areaTables.length}
                      </span> */}
                    </div>
                    {/* {!readOnly && (
                      <button
                        onClick={() => { setAddToArea(area); setShowAddModal(true); }}
                        className="text-[10px] font-bold text-blue-500 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        + Add
                      </button>
                    )} */}
                  </div>

                  {areaTables.length === 0 ? (
                    <div className="py-16 text-center text-slate-300 text-xs font-bold uppercase tracking-widest bg-slate-50 rounded-2xl border border-slate-100">
                      No tables yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {areaTables.map(table => <TableCard key={table._id || table.tableId} table={table} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          // Single area view
          <div>
            {sortTables(filteredTables).length === 0 ? (
              <div className="py-16 text-center text-slate-300 text-xs font-bold uppercase tracking-widest">
                No tables found
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sortTables(filteredTables).map(table => <TableCard key={table._id || table.tableId} table={table} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MODALS — all as bottom sheets, matching TableView style
      ══════════════════════════════════════════════════════════════ */}

      {/* Add Table */}
      {showAddModal && (
        <BottomSheet
          onClose={() => setShowAddModal(false)}
          title="Add Table"
          subtitle={`Adding to ${addToArea}`}
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-[13px] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                disabled={isAdding || !newTable.tableId}
                className={cn(
                  'flex-1 py-3.5 text-white rounded-2xl font-bold text-[13px] active:scale-[0.98] transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2',
                  isAdding || !newTable.tableId ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600'
                )}
              >
                {isAdding
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Adding...</>
                  : 'Create Table'
                }
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Table ID</label>
              <input
                type="text"
                placeholder="e.g. T-11 or VIP-1"
                value={newTable.tableId}
                onChange={e => setNewTable({ ...newTable, tableId: e.target.value })}
                className="w-full px-4 py-3 bg-[#f2f2f7] rounded-xl text-[15px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Section</label>
              <select
                value={addToArea}
                onChange={e => setAddToArea(e.target.value)}
                className="w-full px-4 py-3 bg-[#f2f2f7] rounded-xl text-[15px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-400 transition-all appearance-none cursor-pointer"
              >
                {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Seats</label>
              <input
                type="number"
                value={newTable.seats}
                min={1} max={20}
                onChange={e => setNewTable({ ...newTable, seats: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-[#f2f2f7] rounded-xl text-[15px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-400 transition-all"
              />
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Edit Seats */}
      {showEditModal && (
        <BottomSheet
          onClose={() => setShowEditModal(null)}
          title="Edit Seats"
          subtitle={`Update capacity for ${showEditModal.tableId}`}
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditModal(null)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-[13px] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const s = parseInt(document.getElementById('edit-seats-input').value);
                  handleUpdateSeats(showEditModal.tableId, s);
                }}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-[13px] active:scale-[0.98] transition-all shadow-md shadow-blue-200"
              >
                Save
              </button>
            </div>
          }
        >
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Seat Count</label>
            <input
              id="edit-seats-input"
              type="number"
              autoFocus
              min={1} max={20}
              defaultValue={showEditModal.seats}
              className="w-full px-4 py-3 bg-[#f2f2f7] rounded-xl text-[15px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-400 transition-all"
            />
          </div>
        </BottomSheet>
      )}

      {/* Add Section */}
      {showAddAreaModal && (
        <BottomSheet
          onClose={() => { setShowAddAreaModal(false); setNewArea(''); }}
          title="Add Section"
          subtitle="Create a new floor or room"
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => { setShowAddAreaModal(false); setNewArea(''); }}
                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-[13px] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateArea}
                disabled={!newArea.trim()}
                className="flex-1 py-3.5 bg-blue-600 text-white rounded-2xl font-bold text-[13px] active:scale-[0.98] transition-all shadow-md shadow-blue-200 disabled:opacity-50"
              >
                Save Section
              </button>
            </div>
          }
        >
          <div>
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Section Name</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. First Floor or VIP Room"
              value={newArea}
              onChange={e => setNewArea(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateArea()}
              className="w-full px-4 py-3 bg-[#f2f2f7] rounded-xl text-[15px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-400 transition-all"
            />
          </div>
        </BottomSheet>
      )}
    </div>
  );
};

export default TableGrid;