import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { TrendingUp, ShoppingBag, DollarSign, BarChart3, Download, Calendar, ArrowUp, ArrowDown, Trophy, ChevronRight } from 'lucide-react';

const SalesReport = () => {
  const [period, setPeriod] = useState('today');
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);

  const periods = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: '3months', label: '3 Months' },
    { id: 'year', label: 'FY Report' },
    { id: 'all', label: 'All Time' },
  ];

  useEffect(() => {
    fetchSales();
  }, [period]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/analytics/sales?period=${period}`);
      setSalesData(res.data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`/api/analytics/export?period=${period}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `archearc-sales-${period}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };

  const statCards = useMemo(() => {
    if (!salesData) return [];
    return [
      {
        label: 'Total Revenue',
        value: `₹${Math.round(salesData.totalRevenue).toLocaleString('en-IN')}`,
        sub: `${salesData.totalOrders} orders`,
        icon: DollarSign,
        color: 'text-emerald-500',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100'
      },
      {
        label: 'Dine-in Revenue',
        value: `₹${Math.round(salesData.dineInRevenue).toLocaleString('en-IN')}`,
        sub: `${salesData.dineInOrders} orders`,
        icon: ShoppingBag,
        color: 'text-arche-blue-deep',
        bg: 'bg-arche-blue-light/5',
        border: 'border-arche-blue-light/20'
      },
      {
        label: 'Parcel Revenue',
        value: `₹${Math.round(salesData.parcelRevenue).toLocaleString('en-IN')}`,
        sub: `${salesData.parcelOrders} orders`,
        icon: TrendingUp,
        color: 'text-purple-500',
        bg: 'bg-purple-50',
        border: 'border-purple-100'
      },
      {
        label: 'Avg Order Value',
        value: `₹${salesData.avgOrderValue?.toFixed(0) || 0}`,
        sub: 'per order',
        icon: BarChart3,
        color: 'text-amber-500',
        bg: 'bg-amber-50',
        border: 'border-amber-100'
      },
    ];
  }, [salesData]);

  return (
    <div className="space-y-8">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-arche-blue-light tracking-[0.3em] uppercase">Analytics</span>
            <div className="h-px w-12 bg-arche-blue-light/30"></div>
          </div>
          <h2 className="text-4xl font-black text-arche-text tracking-tight">
            Sales Report
          </h2>
        </div>

        <button
          onClick={handleExport}
          className="self-start md:self-end bg-white border border-gray-100 text-arche-text px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:shadow-md transition-all active:scale-95 group"
        >
          <Download size={18} className="text-arche-blue-deep" />
          <span>Export CSV</span>
          <ChevronRight size={16} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-5 py-3 rounded-full text-xs font-bold tracking-wide transition-all duration-300 ${
              period === p.id
                ? 'bg-arche-text text-white shadow-lg shadow-arche-text/15'
                : 'bg-white text-gray-400 border border-gray-100 hover:text-arche-text hover:border-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white border border-gray-50 rounded-[2rem] p-8 animate-pulse">
              <div className="h-4 bg-gray-100 rounded-full w-24 mb-4" />
              <div className="h-8 bg-gray-100 rounded-full w-32 mb-2" />
              <div className="h-3 bg-gray-50 rounded-full w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, i) => (
              <div key={i} className={`${card.bg} border ${card.border} rounded-[2rem] p-8 transition-all hover:shadow-lg hover:-translate-y-1 duration-500`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{card.label}</span>
                  <card.icon size={20} className={card.color} />
                </div>
                <div className="text-3xl font-black text-arche-text tracking-tight mb-1">{card.value}</div>
                <div className="text-xs font-bold text-gray-400">{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Top Items */}
          {salesData?.topItems?.length > 0 && (
            <div className="bg-white border border-gray-50 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <Trophy size={20} className="text-amber-500" />
                <h3 className="text-lg font-black text-arche-text">Top Selling Items</h3>
              </div>
              <div className="space-y-3">
                {salesData.topItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-50/50 rounded-2xl px-6 py-4 group hover:bg-gray-50 transition-all">
                    <span className="text-lg font-black text-gray-200 w-8">{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1">
                      <span className="font-bold text-arche-text text-sm group-hover:text-arche-blue-deep transition-colors">{item.name}</span>
                      <div className="text-[10px] font-bold text-gray-400">{item.quantity} sold</div>
                    </div>
                    <span className="font-black text-arche-text">₹{Math.round(item.revenue).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Breakdown Table */}
          {salesData?.dailyBreakdown?.length > 0 && (
            <div className="bg-white border border-gray-50 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="px-8 py-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-arche-blue-deep" />
                  <h3 className="text-lg font-black text-arche-text">Daily Breakdown</h3>
                </div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">{salesData.dailyBreakdown.length} days</span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                      <th className="text-left px-8 py-4">Date</th>
                      <th className="text-center px-4 py-4">Orders</th>
                      <th className="text-right px-4 py-4">Dine-in</th>
                      <th className="text-right px-4 py-4">Parcel</th>
                      <th className="text-right px-8 py-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {salesData.dailyBreakdown.map((day, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-all">
                        <td className="px-8 py-4 font-bold text-sm text-arche-text">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-arche-blue-light/10 text-arche-blue-deep px-3 py-1 rounded-full text-xs font-black">{day.orders}</span>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-sm text-gray-500">₹{Math.round(day.dineIn).toLocaleString('en-IN')}</td>
                        <td className="px-4 py-4 text-right font-bold text-sm text-gray-500">₹{Math.round(day.parcel).toLocaleString('en-IN')}</td>
                        <td className="px-8 py-4 text-right font-black text-arche-text">₹{Math.round(day.total).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grand Total Footer */}
              <div className="px-8 py-6 bg-arche-text text-white flex justify-between items-center">
                <span className="font-black uppercase text-sm tracking-wider">Period Total</span>
                <div className="text-right">
                  <div className="text-2xl font-black">₹{Math.round(salesData.totalRevenue).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    + GST 5% = ₹{Math.round(salesData.totalRevenue * 1.05).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Data State */}
          {(!salesData?.dailyBreakdown || salesData.dailyBreakdown.length === 0) && (
            <div className="bg-white border border-gray-50 rounded-[2.5rem] p-16 text-center shadow-sm">
              <BarChart3 size={64} className="mx-auto text-gray-100 mb-4" />
              <p className="text-xl font-black text-gray-200">No sales data for this period</p>
              <p className="text-sm text-gray-300 font-medium mt-2">Complete some orders to see analytics here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesReport;
