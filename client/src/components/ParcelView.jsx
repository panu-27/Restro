import React from 'react';
import { Package, Plus, ArrowUpRight, Phone, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const ParcelView = ({ activeOrders, onNewParcel, onOrderClick }) => {
  const parcels = (activeOrders || []).filter(o => 
    o.orderType === 'Parcel' && o.status !== 'Paid' && o.status !== 'Cancelled'
  );

  const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-full bg-transparent lg:bg-white lg:rounded-3xl p-3 lg:p-6 pb-24 lg:pb-6 animate-in fade-in duration-500">
      <header className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package size={24} className="text-amber-500" />
            Active Parcels
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Manage ongoing takeaways</p>
        </div>
        <button
          onClick={onNewParcel}
          className="flex items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-md shadow-amber-200 active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={3} />
          <span className="hidden sm:inline">New Parcel</span>
        </button>
      </header>

      {parcels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
            <Package size={32} />
          </div>
          <p className="text-slate-500 font-black text-lg mb-1">No active parcels</p>
          <p className="text-xs text-slate-400 font-semibold">Click the button above to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {parcels.map(order => (
            <div
              key={order._id}
              onClick={() => onOrderClick(order._id)}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm cursor-pointer active:scale-[0.98] transition-all hover:border-slate-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 text-amber-500 group-hover:scale-105 transition-transform">
                    <Package size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-slate-900 leading-tight mb-0.5">
                      {order.customerName || `Parcel #${String(order.orderNumber).padStart(4, '0')}`}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      Order #{String(order.orderNumber).padStart(4, '0')}
                    </p>
                  </div>
                </div>
                <div className="px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center gap-1.5 text-slate-500">
                  <Clock size={12} />
                  <span className="text-[10px] font-black uppercase">{fmtTime(order.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="text-[12px] font-black bg-slate-100 px-2 py-1 rounded-md">
                    {order.items?.length || 0} Items
                  </span>
                  {order.customerPhone && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      <Phone size={10} />
                      {order.customerPhone}
                    </div>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors shadow-sm">
                  <ArrowUpRight size={16} strokeWidth={2.5} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParcelView;
