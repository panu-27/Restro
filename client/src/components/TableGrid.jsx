import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Users, Trash2, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

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

const TableGrid = ({ activeOrders, onTableClick }) => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(null);
  const [newTable, setNewTable] = useState({ tableId: '', seats: 4 });
  const [openMenuId, setOpenMenuId] = useState(null);

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

  useEffect(() => { fetchTables(); }, []);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleAddTable = async () => {
    if (!newTable.tableId) return;
    try {
      await axios.post('/api/tables', newTable);
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
      await axios.delete(`/api/tables/${tableId}`);
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

  const occupied  = tables.filter(t => getTableInfo(t.tableId).status === 'Occupied').length;
  const available = tables.filter(t => getTableInfo(t.tableId).status === 'Available').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-400 rounded-full animate-spin"/>
    </div>
  );

  return (
    <section className="p-6 lg:p-8 animate-in fade-in duration-500">

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Tables</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Floor Management</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary pills */}
          <div className="flex items-center gap-1 bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">Occupied</span>
            <span className="text-xl font-black text-[#FF5A36]">{occupied}</span>
            <span className="mx-3 text-slate-200 font-bold">|</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">Available</span>
            <span className="text-xl font-black text-emerald-500">{available}</span>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[#FF5A36] hover:bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            <Plus size={16} strokeWidth={3}/> Add Table
          </button>
        </div>
      </div>

      {/* ── Cards Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
        {[...tables]
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
                'bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 relative',
                isOccupied ? 'border-orange-100' : 'border-slate-100'
              )}
            >
              {/* Status badge */}
              <div className={cn(
                'absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border',
                cfg.bg, cfg.text
              )}>
                {cfg.label}
              </div>

              {/* Admin menu */}
              <div className="absolute top-1.5 left-1.5 z-20" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setOpenMenuId(isMenuOpen ? null : table.tableId)}
                  className="w-5 h-5 flex items-center justify-center rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  <MoreVertical size={13}/>
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

              {/* Clickable area */}
              <div
                onClick={() => onTableClick(table.tableId)}
                className="cursor-pointer p-4 pt-8"
              >
                {/* Icon centered */}
                <div className="flex justify-center mb-4 mt-2">
                  <div className="w-[80px] h-[80px] flex items-center justify-center">
                    <TableIcon label={table.tableId} occupied={isOccupied}/>
                  </div>
                </div>

                {/* Bottom info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">{size}</span>
                    <span className="text-slate-200 text-[10px] leading-none">·</span>
                    <span className="text-[10px] font-bold text-slate-400">{seats} Person</span>
                  </div>
                  {/* Bill amount only when occupied */}
                  {isOccupied && billTotal > 0 && (
                     <span className="text-xs font-black text-[#FF5A36] ml-2 truncate">
                      ₹{Math.round(billTotal)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
    </section>
  );
};

export default TableGrid;
