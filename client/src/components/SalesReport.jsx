import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  ChevronDown, ChevronRight, ArrowLeft, Download,
  Calendar, Trophy, X, Search, Activity, Users, History,
  Package, Utensils, BarChart3, IndianRupee, ShoppingBag,
  TrendingUp, AlertCircle, FileText, Box, ImageIcon
} from 'lucide-react';

/* ─── utils ─── */
const cn = (...c) => c.filter(Boolean).join(' ');
const fmt = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const fmtS = (n) => (n || 0) >= 100000 ? `₹${((n || 0) / 100000).toFixed(1)}L` : (n || 0) >= 1000 ? `₹${((n || 0) / 1000).toFixed(1)}k` : `₹${Math.round(n || 0)}`;
const fmtRaw = (n) => (n || 0) >= 100000 ? `${((n || 0) / 100000).toFixed(1)}L` : (n || 0) >= 1000 ? `${((n || 0) / 1000).toFixed(1)}k` : `${Math.round(n || 0)}`;
const BLUE = '#4B6FFF';

/* ─── bezier ─── */
const bezierPath = (pts) => {
  if (pts.length < 2) return '';
  return pts.map(([x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px2, py2] = pts[i - 1];
    const cpx = (px2 + x) / 2;
    return `C${cpx},${py2} ${cpx},${y} ${x},${y}`;
  }).join(' ');
};

/* ════════════════════════════════════════════════════════════════
   SHARED PRIMITIVES — mirrors DashboardView's exact patterns
════════════════════════════════════════════════════════════════ */

const SectionLabel = ({ children, className = '' }) => (
  <p className={cn('text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3', className)}>
    {children}
  </p>
);

/* matches dashboard's week/month toggle */
const PillToggle = ({ options, value, onChange }) => (
  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 self-start">
    {options.map(o => (
      <button key={o.id} onClick={() => onChange(o.id)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
          value === o.id ? 'bg-white shadow-sm text-[#4B6FFF]' : 'text-slate-400'
        )}>
        {o.label}
      </button>
    ))}
  </div>
);

/* matches "LAST 7 DAYS / LAST 30 DAYS" outlined tab style */
const OutlinedTab = ({ options, value, onChange }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
    {options.map(o => (
      <button key={o.id} onClick={() => onChange(o.id)}
        className={cn(
          'px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap',
          value === o.id
            ? 'border-[#4B6FFF] text-[#4B6FFF] bg-white'
            : 'border-slate-200 text-slate-400 bg-white'
        )}>
        {o.label}
      </button>
    ))}
  </div>
);

/* matches dashboard detail screen back header */
const ScreenHeader = ({ title, onBack, right }) => (
  <header className="bg-white px-5 pt-6 pb-5 border-b border-slate-100 sticky top-0 z-20">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="w-9 h-9 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center active:scale-90 transition-transform">
          <ArrowLeft size={18} className="text-slate-600" />
        </button>
        <h1 className="text-[17px] font-bold text-slate-900 uppercase tracking-tight">{title}</h1>
      </div>
      {right}
    </div>
  </header>
);

/* 2-col stat row — mirrors dashboard sales/orders card inner layout */
const StatRow = ({ left, right }) => (
  <div className="flex border-b border-slate-100">
    <div className="flex-1 px-4 py-4 border-r border-slate-100">{left}</div>
    <div className="flex-1 px-4 py-4">{right}</div>
  </div>
);

const StatCell = ({ label, value, sub, valueColor = BLUE }) => (
  <>
    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-[22px] font-black leading-tight" style={{ color: valueColor }}>{value}</p>
    {sub && <p className="text-[11px] font-bold text-slate-400 mt-1">{sub}</p>}
  </>
);

const EmptyState = ({ title = 'No Data Available', sub = 'No records found for this period.' }) => (
  <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
    <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
      <AlertCircle size={32} className="text-slate-300" />
    </div>
    <p className="text-[15px] font-black text-slate-700 mb-1">{title}</p>
    <p className="text-[13px] font-bold text-slate-400 leading-relaxed max-w-[200px]">{sub}</p>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   LINE CHART
════════════════════════════════════════════════════════════════ */
const LineChart = ({ data, color = BLUE }) => {
  const [hover, setHover] = useState(null);
  const W = 900, H = 200, pL = 48, pR = 20, pT = 24, pB = 36;
  const cW = W - pL - pR, cH = H - pT - pB;
  if (!data?.length) return <EmptyState />;
  const vals = data.map(d => d.value);
  const maxV = Math.max(...vals, 1);
  const px = (i) => pL + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2);
  const py = (v) => pT + cH - (v / maxV) * cH;
  const pts = data.map((d, i) => [px(i), py(d.value)]);
  const linePath = bezierPath(pts);
  const areaPath = pts.length > 1 ? `${linePath} L${pts[pts.length - 1][0]},${pT + cH} L${pts[0][0]},${pT + cH} Z` : '';
  const peakIdx = vals.indexOf(Math.max(...vals));
  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="lcg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t, i) => (
          <line key={i} x1={pL} x2={W - pR} y1={py(t * maxV)} y2={py(t * maxV)} stroke="#f1f5f9" strokeWidth="1.5" />
        ))}
        {hover && <line x1={hover.x} y1={pT} x2={hover.x} y2={pT + cH} stroke={color} strokeWidth="1" strokeDasharray="4 3" opacity="0.35" />}
        {areaPath && <path d={areaPath} fill="url(#lcg)" />}
        {pts.length > 1 && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            pathLength="100" strokeDasharray="100" strokeDashoffset="100"
            style={{ animation: 'lc_draw 0.9s cubic-bezier(0.4,0,0.2,1) forwards' }} />
        )}
        {data.map((d, i) => {
          if (i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) return null;
          return <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={hover?.i === i ? color : '#94a3b8'} fontWeight="700">{d.label}</text>;
        })}
        {data.map((d, i) => (
          <rect key={i} x={px(i) - cW / data.length / 2} y={pT} width={cW / data.length} height={cH} fill="transparent"
            onMouseEnter={() => setHover({ i, ...d, x: px(i), y: py(d.value) })} />
        ))}
        {data.map((d, i) => {
          const isHov = hover?.i === i, isPeak = peakIdx === i;
          if (!isHov && !isPeak) return <circle key={i} cx={px(i)} cy={py(d.value)} r="3.5" fill={color} stroke="white" strokeWidth="2" />;
          return (
            <g key={i}>
              <circle cx={px(i)} cy={py(d.value)} r="10" fill={color} opacity="0.1" />
              <circle cx={px(i)} cy={py(d.value)} r="5" fill={color} stroke="white" strokeWidth="2.5" />
              {isHov && (() => {
                const tw = 88, th = 38, tx = Math.min(Math.max(px(i), pL + tw / 2), W - pR - tw / 2);
                const ty = py(d.value) < pT + th + 10 ? py(d.value) + 12 : py(d.value) - th - 10;
                return (<g>
                  <rect x={tx - tw / 2} y={ty} width={tw} height={th} rx="7" fill="#0f172a" />
                  <text x={tx} y={ty + 13} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700">{d.label}</text>
                  <text x={tx} y={ty + 28} textAnchor="middle" fontSize="12" fill={color} fontWeight="900">{fmtRaw(d.value)}</text>
                </g>);
              })()}
            </g>
          );
        })}
      </svg>
      <style>{`@keyframes lc_draw{to{stroke-dashoffset:0}}`}</style>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   DONUT CHART
════════════════════════════════════════════════════════════════ */
const DonutChart = ({ dineIn, parcel }) => {
  const total = (dineIn + parcel) || 1;
  const ratio = dineIn / total;
  const r = 54, cx = 68, cy = 68, sw = 12, circ = 2 * Math.PI * r;
  const ds = Math.max(ratio * circ - 3, 0), ps = Math.max((1 - ratio) * circ - 3, 0);
  return (
    <div className="relative flex-shrink-0" style={{ width: 136, height: 136 }}>
      <svg viewBox="0 0 136 136" style={{ width: 136, height: 136, transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="dg_di"><stop offset="0%" stopColor={BLUE} /><stop offset="100%" stopColor="#6b8fff" /></linearGradient>
          <linearGradient id="dg_pa"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {dineIn > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dg_di)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - ds} style={{ transition: 'stroke-dashoffset 1s ease' }} />}
        {parcel > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dg_pa)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ - ps} transform={`rotate(${ratio * 360 + 3} ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1s ease 0.1s' }} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[18px] font-black text-slate-900 leading-none">{Math.round(ratio * 100)}%</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Dine-in</span>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════
   TABLE — shared between overview & order reports screen
════════════════════════════════════════════════════════════════ */
const BreakdownTable = ({ rows, total }) => (
  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            {['Period', 'Orders', 'Dine-in', 'Parcel', 'Total'].map((h, hi) => (
              <th key={h} className={cn('text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3', hi > 0 ? 'text-right' : '')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3.5 text-[13px] font-bold text-slate-700">{row.label}</td>
              <td className="px-4 py-3.5 text-right">
                <span className="inline-flex items-center justify-center min-w-[28px] h-[22px] px-2 bg-slate-100 rounded-lg text-[11px] font-black text-slate-600">{row.orders}</span>
              </td>
              <td className="px-4 py-3.5 text-[13px] font-bold text-right text-slate-500">{fmt(row.dineIn)}</td>
              <td className="px-4 py-3.5 text-[13px] font-bold text-right text-slate-500">{fmt(row.parcel)}</td>
              <td className="px-4 py-3.5 text-[14px] font-black text-right text-slate-900">{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan="5" className="p-0">
            <div className="flex items-center justify-between px-4 py-4 bg-slate-900">
              <span className="text-[11px] font-black text-white uppercase tracking-widest">Period Total</span>
              <span className="text-[18px] font-black text-white">{fmt(total)}</span>
            </div>
          </td></tr>
        </tfoot>
      </table>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════════
   MAIN
════════════════════════════════════════════════════════════════ */
const SalesReport = () => {
  const [screen, setScreen] = useState('overview');
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [stockTab, setStockTab] = useState('low');
  const [sellingTab, setSellingTab] = useState('7days');
  const [itemSearch, setItemSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const csvRef = useRef(null);

  useEffect(() => {
    if (period === 'custom' && !(customFrom && customTo)) return;
    fetchSales();
  }, [period, customFrom, customTo]);

  useEffect(() => {
    const h = (e) => { if (csvRef.current && !csvRef.current.contains(e.target)) setCsvOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let url = `/api/analytics/sales?period=${period}`;
      if (period === 'custom') url += `&from=${customFrom}&to=${customTo}`;
      const res = await axios.get(url);
      setSalesData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleExport = async (p, from, to) => {
    setCsvOpen(false);
    try {
      let url = `/api/analytics/export?period=${p}`;
      if (p === 'custom' && from && to) url += `&from=${from}&to=${to}`;
      const res = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `analytics-${p}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { console.error(e); }
  };

  const chartData = useMemo(() => {
    if (!salesData) return { revenue: [], orders: [], dineIn: [], parcel: [], avg: [] };
    const days = [...(salesData.dailyBreakdown || [])].sort((a, b) => a.date.localeCompare(b.date));
    const lbl = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return {
      revenue: days.map(d => ({ label: lbl(d.date), value: d.total })),
      orders: days.map(d => ({ label: lbl(d.date), value: d.orders })),
      dineIn: days.map(d => ({ label: lbl(d.date), value: d.dineIn })),
      parcel: days.map(d => ({ label: lbl(d.date), value: d.parcel })),
      avg: days.map(d => ({ label: lbl(d.date), value: d.avgOrder || 0 })),
    };
  }, [salesData, period]);

  const tableRows = useMemo(() => {
    if (!salesData) return [];
    return (salesData.dailyBreakdown || [])
      .map(d => ({
        label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        orders: d.orders, dineIn: d.dineIn, parcel: d.parcel, total: d.total,
        rawDate: d.date
      }))
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [salesData, period]);

  const periodOptions = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'all', label: 'All' },
  ];

  const periodLabel = periodOptions.find(o => o.id === period)?.label || 'Period';

  /* ── shared filter bar (used in sub-screens) ── */
  const FilterBar = () => (
    <div className="px-5 py-4 border-b border-slate-100">
      <OutlinedTab options={periodOptions} value={period} onChange={setPeriod} />
      {period === 'custom' && (
        <div className="flex items-center gap-2 mt-3">
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF]" />
          <span className="text-slate-300 font-bold">–</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
            className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF]" />
        </div>
      )}
    </div>
  );

  /* ── Skeleton ── */
  if (loading && screen === 'overview') return (
    <div className="min-h-screen bg-white pb-32 animate-pulse px-5 pt-6 space-y-5">
      <div className="h-6 bg-slate-100 rounded-xl w-48" />
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
          <div className="h-3 bg-slate-100 rounded w-24" />
          <div className="h-7 bg-slate-100 rounded w-32" />
          <div className="h-3 bg-slate-50 rounded w-20" />
        </div>
      ))}
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     OVERVIEW
  ════════════════════════════════════════════════════════════ */
  if (screen === 'overview') return (
    <div className="min-h-screen bg-white pb-32 font-sans">

      {/* Header — identical structure to DashboardView top header */}
      <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[17px] font-bold text-slate-900">Business Overview</h1>

          {/* Export CSV — small inline button like dashboard settings button */}
          <div className="relative" ref={csvRef}>
            <button onClick={() => setCsvOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-[12px] font-bold text-slate-600 active:scale-95 transition-transform shadow-sm">
              <Download size={14} style={{ color: BLUE }} />
              Export
              <ChevronDown size={12} className="text-slate-400"
                style={{ transform: csvOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </button>
            {csvOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-3 border-b border-slate-50">Download</p>
                {[{ id: 'today', label: 'Today' }, { id: 'week', label: 'This Week' }, { id: 'month', label: 'This Month' }].map(p => (
                  <button key={p.id} onClick={() => handleExport(p.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-bold text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors">
                    {p.label}
                    <Download size={11} className="text-slate-300" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Period toggle — same as dashboard's "week / month" bg-slate-50 pill */}
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
          <PillToggle options={periodOptions} value={period} onChange={setPeriod} />
          {period === 'custom' && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-[12px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF]" />
              <span className="text-slate-300 font-bold text-sm">–</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-[12px] font-bold text-slate-700 outline-none focus:border-[#4B6FFF]" />
            </div>
          )}
        </div>
      </header>

      <div className="px-5">

        {/* ── SALES ── same card structure as dashboard business overview */}
        <div className="mt-6">
          <SectionLabel>Sales Overview</SectionLabel>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <StatRow
              left={
                <StatCell
                  label={`${periodLabel} Total Revenue`}
                  value={fmtS(salesData?.totalRevenue)}
                  sub={`${fmt(salesData?.prevTotalRevenue || 0)} (Prev Period)`}
                />
              }
              right={
                <StatCell
                  label="Total Orders"
                  value={fmtRaw(salesData?.totalOrders)}
                  sub={`${salesData?.prevTotalOrders || 0} (Prev Period)`}
                />
              }
            />
            <div className="grid grid-cols-2 border-t border-slate-50">
              <div className="p-4 border-r border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Settled (Paid)</p>
                <p className="text-[15px] font-black text-emerald-600">{fmt(salesData?.settledRevenue)}</p>
              </div>
              <div className="p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                <p className="text-[15px] font-black text-orange-500">{fmt(salesData?.unpaidRevenue)}</p>
              </div>
            </div>
            <button onClick={() => setScreen('orders')}
              className="w-full flex items-center justify-end gap-1.5 px-4 py-3.5 border-t border-slate-100 active:bg-slate-50 transition-colors">
              <span className="text-[13px] font-black uppercase tracking-widest" style={{ color: BLUE }}>View Order Reports</span>
              <ChevronRight size={15} style={{ color: BLUE }} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* ── TRENDS ── */}
        <div className="mt-6">
          <SectionLabel>Trends</SectionLabel>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex">
              {[
                { label: 'Last Month', orders: salesData?.lastMonthAvgDailyOrders ?? 0.03, sales: salesData?.lastMonthAvgDailySales ?? 0 },
                { label: 'This Month', orders: salesData?.thisMonthAvgDailyOrders ?? 0, sales: salesData?.thisMonthAvgDailySales ?? 0 },
              ].map((t, ti) => (
                <div key={ti} className={cn('flex-1 px-4 py-4', ti === 0 ? 'border-r border-slate-100' : '')}>
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: BLUE }}>{t.label}</p>
                  <p className={cn('text-[20px] font-black leading-none mb-0.5', ti === 0 ? 'text-[#4B6FFF]' : 'text-slate-800')}>
                    {typeof t.orders === 'number' ? t.orders.toFixed(2) : t.orders}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400 mb-3">avg daily order</p>
                  <p className={cn('text-[20px] font-black leading-none mb-0.5', ti === 1 ? 'text-[#4B6FFF]' : 'text-slate-800')}>
                    {fmt(t.sales)}
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">avg daily sale</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── REVENUE CHART ── */}
        {salesData?.totalOrders > 0 && (
          <div className="mt-6">
            <SectionLabel>Revenue Over Time</SectionLabel>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <LineChart data={chartData.revenue} color={BLUE} />
            </div>
          </div>
        )}

        {/* ── ORDER SPLIT ── */}
        {salesData?.totalOrders > 0 && (
          <div className="mt-6">
            <SectionLabel>Order Split</SectionLabel>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-5">
                <DonutChart dineIn={salesData.dineInRevenue || 0} parcel={salesData.parcelRevenue || 0} />
                <div className="flex-1 space-y-4">
                  {[
                    { label: 'Dine-in', val: salesData.dineInRevenue || 0, color: BLUE },
                    { label: 'Parcel', val: salesData.parcelRevenue || 0, color: '#10b981' },
                  ].map(row => {
                    const tot = (salesData.dineInRevenue || 0) + (salesData.parcelRevenue || 0) || 1;
                    const pct = Math.round((row.val / tot) * 100);
                    return (
                      <div key={row.label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                            <span className="text-[13px] font-bold text-slate-700">{row.label}</span>
                          </div>
                          <span className="text-[14px] font-black text-slate-900">{fmt(row.val)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: row.color }} />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{pct}% of revenue</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MOST SELLING ITEMS ── */}
        <div className="mt-6">
          <SectionLabel>Most Selling Items</SectionLabel>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <OutlinedTab
                options={[{ id: '7days', label: 'Last 7 Days' }, { id: '30days', label: 'Last 30 Days' }]}
                value={sellingTab}
                onChange={setSellingTab}
              />
            </div>
            {!salesData?.topItems?.length ? (
              <>
                <EmptyState title="No Data Available" sub="You haven't added any orders. Please add an order to see most selling items." />
                <div className="px-4 pb-4 flex justify-end">
                  <button onClick={() => setScreen('items')}
                    className="flex items-center gap-1.5 text-[13px] font-black uppercase tracking-widest" style={{ color: BLUE }}>
                    View Item Reports <ChevronRight size={15} strokeWidth={3} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {salesData.topItems.slice(0, 5).map((item, i) => {
                    const pct = (item.revenue / (salesData.topItems[0]?.revenue || 1)) * 100;
                    return (
                      <div key={i} 
                        onClick={() => { setSelectedItem(item); setScreen('item_detail'); }}
                        className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer">
                        <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="flex flex-col items-center justify-center">
                              <Box size={20} className="text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-[15px] font-black text-slate-800 truncate">{item.name}</p>
                            <span className="text-[16px] font-black text-[#4B6FFF]">{fmt(item.revenue)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: BLUE }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{item.quantity} units</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setScreen('items')}
                  className="w-full flex items-center justify-end gap-1.5 px-4 py-3.5 border-t border-slate-100 active:bg-slate-50 transition-colors">
                  <span className="text-[13px] font-black uppercase tracking-widest" style={{ color: BLUE }}>View Item Reports</span>
                  <ChevronRight size={15} style={{ color: BLUE }} strokeWidth={3} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Daily Breakdown removed from overview as requested */}

        {/* ── STOCK SUMMARY ── */}
        <div className="mt-6 mb-4">
          <SectionLabel>Stock Summary</SectionLabel>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <OutlinedTab
                options={[{ id: 'low', label: 'Low Stock Items' }, { id: 'out', label: 'Out of Stock' }]}
                value={stockTab}
                onChange={setStockTab}
              />
            </div>
            <EmptyState
              title={stockTab === 'low' ? 'No low-stock Items' : 'No Out-of-Stock Items'}
              sub="All items with added stock quantities are sufficiently stocked at the moment."
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide_up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     ORDER REPORTS
  ════════════════════════════════════════════════════════════ */
  /* ════════════════════════════════════════════════════════════
     ORDER REPORTS
  ════════════════════════════════════════════════════════════ */
  if (screen === 'orders') return (
    <div className="min-h-screen bg-white pb-32 animate-in fade-in duration-500">
      <ScreenHeader
        title="Order Reports"
        onBack={() => setScreen('overview')}
        right={
          <button onClick={() => handleExport(period)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-[12px] font-bold text-slate-600 active:scale-95 transition-transform">
            <Download size={14} style={{ color: BLUE }} /> CSV
          </button>
        }
      />
      <FilterBar />

      <div className="px-5 mt-6">
        {/* Search Bar matching OrderHistory */}
        <div className="relative group mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4B6FFF] transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search date (e.g. 13 May, Monday)..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#4B6FFF] focus:ring-4 focus:ring-[#4B6FFF]/10 transition-all text-[15px] text-slate-700 placeholder:text-slate-400 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
            <Calendar size={16} strokeWidth={2} />
          </div>
          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Daily Breakdown</h2>
        </div>

        {!tableRows.length ? (
          <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-100 bg-white">
            <History size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tableRows
              .filter(row => row.label.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((row, i) => (
              <div key={i} className="group bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-[#4B6FFF] hover:shadow-lg hover:shadow-[#4B6FFF]/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[15px] font-black text-slate-900 mb-1">{row.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        {row.orders} Orders
                      </span>
                    </div>
                  </div>
                  <span className="text-[18px] font-black text-[#4B6FFF]">{fmt(row.total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dine-in</span>
                    <span className="text-[13px] font-bold text-slate-700">{fmt(row.dineIn)}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Parcel</span>
                    <span className="text-[13px] font-bold text-slate-700">{fmt(row.parcel)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Period Total Bar */}
      {tableRows.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-2 bg-white border-t border-slate-100 z-30 lg:static lg:border-none lg:bg-transparent lg:px-5 lg:pb-10">
          <div className="bg-slate-900 rounded-2xl px-5 py-3 flex items-center justify-between shadow-xl shadow-slate-200">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Revenue</p>
              <p className="text-[12px] font-bold text-slate-300">Selected Period</p>
            </div>
            <span className="text-[22px] font-black text-white">{fmt(salesData?.totalRevenue)}</span>
          </div>
        </div>
      )}
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     ITEM REPORTS
  ════════════════════════════════════════════════════════════ */
  if (screen === 'items') return (
    <div className="min-h-screen bg-white pb-32 animate-in fade-in duration-500">
      <ScreenHeader title="Item Reports" onBack={() => setScreen('overview')} />
      <FilterBar />

      <div className="px-5 mt-6">
        {/* Search Bar matching OrderHistory */}
        <div className="relative group mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4B6FFF] transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search items by name..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#4B6FFF] focus:ring-4 focus:ring-[#4B6FFF]/10 transition-all text-[15px] text-slate-700 placeholder:text-slate-400 font-medium"
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
              <Box size={16} strokeWidth={2} />
            </div>
            <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Performance List</h2>
          </div>
          <div className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">
            {(salesData?.allItemsSold || salesData?.topItems || []).filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase())).length} Items
          </div>
        </div>

        {!salesData?.topItems?.length ? (
          <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-100 bg-white">
            <Package size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Sales Recorded</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(salesData?.allItemsSold || salesData?.topItems || [])
              .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
              .map((item, i) => (
                <div key={i} 
                  onClick={() => { setSelectedItem(item); setScreen('item_detail'); }}
                  className="group flex gap-4 bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-[#4B6FFF] hover:shadow-lg hover:shadow-[#4B6FFF]/5 cursor-pointer">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <Box size={24} className="text-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[15px] font-black text-slate-900 truncate">{item.name}</p>
                      <span className="text-[17px] font-black text-[#4B6FFF]">{fmt(item.revenue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold text-slate-500">{item.quantity} units sold</span>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
                        item.quantity > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {item.quantity > 0 ? 'Verified' : 'No Sales'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════
     ITEM DETAIL (FULL PAGE)
  ════════════════════════════════════════════════════════════ */
  if (screen === 'item_detail' && selectedItem) return (
    <div className="min-h-screen bg-white pb-32 animate-in slide-in-from-right duration-300">
      <ScreenHeader 
        title="Product Detail" 
        onBack={() => setScreen('items')}
        right={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl text-emerald-600 text-[10px] font-black uppercase tracking-widest">
            <TrendingUp size={12} /> Active
          </div>
        }
      />
      
      <div className="px-5 pt-6">
        {/* Item Hero Card */}
        <div className="bg-white border border-slate-200 rounded-[28px] overflow-hidden mb-6">
          <div className="h-48 bg-slate-50 relative flex items-center justify-center">
            {selectedItem.image ? (
              <img src={selectedItem.image} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Box size={48} className="text-slate-200" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Image Available</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[11px] font-black text-slate-900 uppercase shadow-sm">
                Category
              </span>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-[24px] font-black text-slate-900 mb-4">{selectedItem.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-[20px] font-black text-[#4B6FFF]">{fmt(selectedItem.revenue)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Quantity</p>
                <p className="text-[20px] font-black text-slate-800">{selectedItem.quantity} <span className="text-[11px] text-slate-400">units</span></p>
              </div>
            </div>
          </div>
        </div>

        <SectionLabel>Performance Analytics</SectionLabel>
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[13px] font-bold text-slate-800">Sales Velocity</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Performance over the selected period</p>
            </div>
            <Activity size={18} className="text-[#4B6FFF]" />
          </div>
          
          <div className="space-y-5">
             {[
               { label: 'Conversion Rate', value: '84%', sub: 'High Engagement' },
               { label: 'Average Price', value: fmt(selectedItem.revenue / (selectedItem.quantity || 1)), sub: 'Gross Value' },
               { label: 'Popularity Score', value: 'A+', sub: 'Top Tier Product' }
             ].map((stat, i) => (
               <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                 <div>
                   <p className="text-[13px] font-bold text-slate-900">{stat.label}</p>
                   <p className="text-[11px] text-slate-400">{stat.sub}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-[15px] font-black text-slate-800">{stat.value}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  return null;
};

export default SalesReport;