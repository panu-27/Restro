import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

const TableGrid = ({ activeOrders, onTableClick, tableCount = 10 }) => {
  const tables = Array.from({ length: tableCount }, (_, i) => `Table ${i + 1}`);

  const getTableStatus = (tableId) => {
    const order = activeOrders.find(o => o.tableId === tableId && o.orderType === 'Dine-in' && o.status !== 'Paid');
    if (!order) return { status: 'Available', order: null };
    return { status: order.status === 'Served' ? 'Served' : 'Occupied', order };
  };

  const statusStyles = {
    Available: 'bg-white border-gray-100 hover:border-arche-blue-light/40 hover:shadow-lg hover:-translate-y-1',
    Occupied: 'bg-arche-blue-deep/5 border-arche-blue-deep/20 hover:shadow-lg hover:-translate-y-1',
    Served: 'bg-emerald-50/50 border-emerald-200/40 hover:shadow-lg hover:-translate-y-1',
  };

  const dotStyles = {
    Available: 'bg-gray-200',
    Occupied: 'bg-arche-blue-deep shadow-[0_0_6px_#0EA5E9]',
    Served: 'bg-emerald-500 shadow-[0_0_6px_#10B981]',
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-[10px] font-bold text-arche-blue-light tracking-[0.3em] uppercase">Floor Plan</span>
        <div className="h-px w-12 bg-arche-blue-light/30" />
        <div className="ml-auto flex items-center gap-4">
          {['Available', 'Occupied', 'Served'].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('w-2.5 h-2.5 rounded-full', dotStyles[s])} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map((tableId) => {
          const { status, order } = getTableStatus(tableId);
          const tableNum = tableId.replace('Table ', '');
          return (
            <button
              key={tableId}
              onClick={() => onTableClick(tableId)}
              className={cn(
                'relative rounded-[1.5rem] border-2 p-5 transition-all duration-500 text-left group cursor-pointer active:scale-[0.97]',
                statusStyles[status]
              )}
            >
              {/* Status dot */}
              <div className={cn('absolute top-4 right-4 w-2.5 h-2.5 rounded-full transition-all', dotStyles[status])} />
              
              {/* Table number */}
              <div className="text-2xl font-black text-arche-text mb-1">
                {tableNum}
              </div>
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                Table
              </div>

              {/* Order info */}
              {order && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-[10px] font-bold text-gray-400">
                    {order.items?.length || 0} items
                  </div>
                  <div className="text-sm font-black text-arche-text">
                    ₹{order.totalAmount || 0}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default TableGrid;
