import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { Plus, Search, Package, Clock, Activity, X, User, Phone, CheckCircle, CreditCard } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const POSInterface = ({ activeOrders, onOrderUpdate, onOrderClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newParcel, setNewParcel] = useState({ name: '', phone: '' });

  const parcels = useMemo(() => {
    return activeOrders.filter(o => o.orderType === 'Parcel');
  }, [activeOrders]);

  const filteredOrders = useMemo(() => {
    return parcels.filter(o =>
      (o.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerPhone || '').includes(searchTerm)
    );
  }, [parcels, searchTerm]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.patch(`/api/orders/${id}/status`, { status });
      onOrderUpdate();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleCreateParcelProfile = async (e) => {
    if (e) e.preventDefault();
    try {
      const res = await axios.post('/api/orders', {
        orderType: 'Parcel',
        items: [],
        totalAmount: 0,
        customerName: newParcel.name,
        customerPhone: newParcel.phone
      });
      setIsAdding(false);
      setNewParcel({ name: '', phone: '' });
      onOrderUpdate();
      if (onOrderClick) onOrderClick(res.data._id);
    } catch (err) {
      console.error('Error creating parcel profile:', err);
    }
  };

  return (
    <div className="bg-[#F8FAFC] min-h-full space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Live Queue</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
            TAKEAWAY <span className="text-indigo-600 italic text-2xl uppercase tracking-tighter">Deployments</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter active parcels..."
              className="bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all text-sm font-bold w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={3} /> New Parcel
          </button>
        </div>
      </header>

      {/* --- Create Parcel Overlay --- */}
      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-8">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 italic uppercase">Parcel Initializer</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Set deployment metadata</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 bg-slate-50 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateParcelProfile} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="CUSTOMER FULL NAME (OPTIONAL)"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-12 pr-6 focus:outline-none focus:border-indigo-500 font-black text-sm tracking-wide"
                      value={newParcel.name}
                      onChange={(e) => setNewParcel({ ...newParcel, name: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="CONTACT NUMBER (OPTIONAL)"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-5 pl-12 pr-6 focus:outline-none focus:border-indigo-500 font-black text-sm tracking-wide"
                      value={newParcel.phone}
                      onChange={(e) => setNewParcel({ ...newParcel, phone: e.target.value })}
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-xl shadow-slate-200">
                  Generate Order Profile
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 transition-all duration-500">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center text-center space-y-4">
            <div className="p-8 bg-white rounded-full shadow-sm">
              <Activity size={48} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-400 italic">No Active Parcels</h3>
          </div>
        ) : (
          filteredOrders.map((order, i) => (
            <div
              key={order._id}
              onClick={() => onOrderClick && onOrderClick(order._id)}
              className={cn(
                "group bg-white border-2 p-6 rounded-[2rem] transition-all hover:shadow-2xl hover:-translate-y-2 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden",
                order.status === 'Served' ? 'border-emerald-500/20 bg-emerald-50/10' : 'border-slate-100 hover:border-indigo-500/20'
              )}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                  order.status === 'Served' ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                )}>
                  {order.status}
                </div>
                <Package size={18} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
              </div>

              <div className="mb-6">
                <h4 className="text-2xl font-black text-slate-900 tracking-tighter truncate italic uppercase">
                  {order.customerName || `Parcel #${i + 1}`}
                </h4>
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold mt-1">
                  <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic">Total Value</p>
                  <p className="text-xl font-black text-slate-900">₹{Math.round(order.totalAmount)}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  {order.status !== 'Served' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order._id, 'Served'); }}
                      className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 shadow-lg shadow-emerald-100"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order._id, 'Paid'); }}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                  >
                    <CreditCard size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default POSInterface;