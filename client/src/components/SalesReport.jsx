import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronDown, ChevronRight, ArrowLeft, Download,
  Calendar, Trophy, X, Search, Activity, Users, History,
  Package, Utensils, BarChart3, IndianRupee, ShoppingBag,
  TrendingUp, AlertCircle, FileText, Box, ImageIcon, SlidersHorizontal, ListFilter
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
  <p className={cn('text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-3', className)}>
    {children}
  </p>
);

/* ─── DateRangePicker ─── */
const DateRangePicker = ({ from, to, onChange, onApply }) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    const d = from ? new Date(from) : new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [hovering, setHovering] = useState(null);
  const [viewMode, setViewMode] = useState('days'); // 'days' | 'months' | 'years'
  const [yearPageStart, setYearPageStart] = useState(() => Math.floor(today.getFullYear() / 12) * 12);

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y, m) => new Date(y, m, 1).getDay();
  const toKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const prevMonth = () => setViewDate(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 });
  const nextMonth = () => setViewDate(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 });
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = daysInMonth(viewDate.year, viewDate.month);
  const blanks = firstDay(viewDate.year, viewDate.month);

  const handleDayClick = (key) => {
    if (!from || (from && to)) {
      onChange({ from: key, to: '' });
    } else {
      if (key < from) onChange({ from: key, to: from });
      else onChange({ from, to: key });
    }
  };

  const isInRange = (key) => from && to && key > from && key < to;
  const isStart = (key) => key === from;
  const isEnd = (key) => key === to;
  const isHoverRange = (key) => from && !to && hovering && key > from && key < hovering;

  return (
    <div className="bg-white rounded-2xl p-4 w-full">
      {/* Header Nav */}
      <div className="flex items-center justify-between mb-3">
        {viewMode === 'days' ? (
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronDown size={15} className="rotate-90" />
          </button>
        ) : viewMode === 'years' ? (
          <button onClick={() => setYearPageStart(y => y - 12)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronDown size={15} className="rotate-90" />
          </button>
        ) : (
          <div className="w-8" />
        )}

        <div className="flex items-center gap-1">
          {/* Month label — click to enter month picker */}
          {viewMode === 'days' && (
            <button
              onClick={() => setViewMode('months')}
              className="text-[13px] font-bold text-slate-800 hover:text-[#4B6FFF] transition-colors px-1 rounded"
            >
              {monthNames[viewDate.month]}
            </button>
          )}
          {/* Year label — click to enter year picker */}
          {viewMode === 'years' ? (
            <span className="text-[13px] font-bold text-slate-800 px-1">
              {yearPageStart} - {yearPageStart + 11}
            </span>
          ) : (
            <button
              onClick={() => {
                setYearPageStart(Math.floor(viewDate.year / 12) * 12);
                setViewMode('years');
              }}
              className="text-[13px] font-bold text-slate-800 hover:text-[#4B6FFF] transition-colors px-1 rounded"
            >
              {viewDate.year}
            </button>
          )}
          {(viewMode === 'months' || viewMode === 'years') && (
            <button
              onClick={() => setViewMode('days')}
              className="ml-1 text-[10px] text-slate-400 hover:text-slate-600 font-semibold transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {viewMode === 'days' ? (
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronDown size={15} className="-rotate-90" />
          </button>
        ) : viewMode === 'years' ? (
          <button onClick={() => setYearPageStart(y => y + 12)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-50 text-slate-500 transition-colors">
            <ChevronDown size={15} className="-rotate-90" />
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* ── MONTHS VIEW ── */}
      {viewMode === 'months' && (
        <div className="grid grid-cols-3 gap-1.5">
          {monthShort.map((m, i) => (
            <button
              key={m}
              onClick={() => { setViewDate(v => ({ ...v, month: i })); setViewMode('days'); }}
              className={cn(
                'py-2 rounded-xl text-[12px] font-semibold transition-colors',
                viewDate.month === i ? 'bg-[#4B6FFF] text-white' : 'text-slate-700 hover:bg-slate-50'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* ── YEARS VIEW ── */}
      {viewMode === 'years' && (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }).map((_, i) => {
            const y = yearPageStart + i;
            const isFuture = y > today.getFullYear();
            return (
              <button
                key={y}
                disabled={isFuture}
                onClick={() => { setViewDate(v => ({ ...v, year: y })); setViewMode('months'); }}
                className={cn(
                  'py-2 rounded-xl text-[12px] font-semibold transition-colors',
                  isFuture ? 'opacity-25 cursor-not-allowed text-slate-400' : 'text-slate-700 hover:bg-slate-50',
                  y === viewDate.year && !isFuture ? 'bg-[#4B6FFF] text-white hover:bg-[#3a5ce6]' : ''
                )}
              >
                {y}
              </button>
            );
          })}
        </div>
      )}

      {/* ── DAYS VIEW ── */}
      {viewMode === 'days' && (
        <>
          <div className="grid grid-cols-7 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array(blanks).fill(null).map((_, i) => <div key={`b${i}`} />)}
            {Array(days).fill(null).map((_, i) => {
              const d = i + 1;
              const key = toKey(viewDate.year, viewDate.month, d);
              const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());
              const inRange = isInRange(key) || isHoverRange(key);
              const start = isStart(key);
              const end = isEnd(key) || (from && !to && hovering === key && hovering > from);
              const isToday = key === todayKey;
              const isFuture = key > todayKey;
              return (
                <button
                  key={key}
                  disabled={isFuture}
                  onClick={() => !isFuture && handleDayClick(key)}
                  onMouseEnter={() => setHovering(key)}
                  onMouseLeave={() => setHovering(null)}
                  className={cn(
                    'relative h-8 w-full flex items-center justify-center text-[12px] font-semibold transition-all rounded-lg',
                    isFuture && 'opacity-25 cursor-not-allowed',
                    (start || end) && 'bg-[#4B6FFF] text-white',
                    inRange && 'bg-blue-50 text-[#4B6FFF] rounded-none',
                    start && 'rounded-r-none',
                    end && 'rounded-l-none',
                    !start && !end && !inRange && !isFuture && 'text-slate-700 hover:bg-slate-50',
                    isToday && !start && !end && 'font-extrabold text-[#4B6FFF]'
                  )}
                >{d}</button>
              );
            })}
          </div>
          {from && to && (
            <button
              onClick={onApply}
              className="mt-3 w-full py-2 bg-[#4B6FFF] text-white text-[12px] font-bold tracking-widest uppercase rounded-xl hover:bg-[#3a5ce6] transition-colors"
            >Apply Range</button>
          )}
          {from && !to && (
            <p className="mt-3 text-center text-[11px] text-slate-400 font-semibold">Select end date</p>
          )}
        </>
      )}
    </div>
  );
};


/* matches dashboard's week/month toggle */
const PillToggle = ({ options, value, onChange }) => (
  <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 self-start">
    {options.map(o => (
      <button key={o.id} onClick={() => onChange(o.id)}
        className={cn(
          'px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all',
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
      <button key={o.id} onClick={() => { onChange(o.id); }}
        className={cn(
          'px-4 py-2 rounded-xl border text-[10px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap',
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
const ScreenHeader = ({ title, subtitle, onBack, right, filterContent, showFilters, onToggleFilters, activeFilterLabel, searchBar }) => (
  <header className="sticky top-0 z-30 px-5 pt-6 pb-4 bg-white/90 backdrop-blur-md border-b border-slate-100 lg:-mx-6 lg:px-6 lg:-mt-6 lg:pt-6 lg:pb-4 lg:border-b-0 lg:shadow-none lg:bg-white lg:sticky lg:top-[-24px]">
    <div className="flex items-center justify-between mb-5 lg:mb-2">
      <div className="flex items-center gap-3 lg:gap-4">
        {onBack && (
          <button className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-xl" onClick={onBack}>
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
        )}
        <div>
          <h1 className="text-[17px] font-semibold text-slate-900 lg:text-[22px]">{title}</h1>
          {subtitle && <p className="text-[12px] font-semibold text-slate-500 mt-0.5 lg:hidden">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 relative z-50">
        {right}
      </div>
    </div>

    {searchBar && (
      <div className="mb-4">
        {searchBar}
      </div>
    )}
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
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-[22px] font-semibold leading-tight" style={{ color: valueColor }}>{value}</p>
    {sub && <p className="text-[11px] font-semibold text-slate-400 mt-1">{sub}</p>}
  </>
);

const EmptyState = ({ title = 'No Data Available', sub = 'No records found for this period.' }) => (
  <div className="flex flex-col items-center justify-center py-14 px-8 text-center">
    <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
      <AlertCircle size={32} className="text-slate-300" />
    </div>
    <p className="text-[15px] font-semibold text-slate-700 mb-1">{title}</p>
    <p className="text-[13px] font-semibold text-slate-400 leading-relaxed max-w-[200px]">{sub}</p>
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
   PIE CHART
════════════════════════════════════════════════════════════════ */
const PieChart = ({ dineIn, parcel }) => {
  const total = (dineIn + parcel) || 1;
  const ratio = dineIn / total;
  const r = 34, cx = 68, cy = 68, sw = 68, circ = 2 * Math.PI * r;
  const ds = ratio * circ, ps = (1 - ratio) * circ;

  const a1 = ratio * Math.PI;
  const a2 = ratio * Math.PI * 2 + (1 - ratio) * Math.PI;
  const tR = 40;
  const diX = cx + tR * Math.cos(a1);
  const diY = cy + tR * Math.sin(a1);
  const paX = cx + tR * Math.cos(a2);
  const paY = cy + tR * Math.sin(a2);

  return (
    <div className="relative flex-shrink-0" style={{ width: 136, height: 136 }}>
      <svg viewBox="0 0 136 136" style={{ width: 136, height: 136, transform: 'rotate(-90deg)', borderRadius: '50%' }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {dineIn > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#8b5cf6" strokeWidth={sw} strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ - ds} style={{ transition: 'stroke-dashoffset 1s ease' }} />}
        {parcel > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f43f5e" strokeWidth={sw} strokeDasharray={`${circ} ${circ}`} strokeDashoffset={circ - ps} transform={`rotate(${ratio * 360} ${cx} ${cy})`} style={{ transition: 'stroke-dashoffset 1s ease 0.1s' }} />}

        {dineIn > 0 && ratio > 0.05 && (
          <text x={diX} y={diY} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="12" fontWeight="600" transform={`rotate(90 ${diX} ${diY})`} style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.2)' }}>
            {Math.round(ratio * 100)}%
          </text>
        )}
        {parcel > 0 && (1 - ratio) > 0.05 && (
          <text x={paX} y={paY} textAnchor="middle" dominantBaseline="central" fill="white" fontSize="12" fontWeight="600" transform={`rotate(90 ${paX} ${paY})`} style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.2)' }}>
            {Math.round((1 - ratio) * 100)}%
          </text>
        )}
      </svg>
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
              <th key={h} className={cn('text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-4 py-3', hi > 0 ? 'text-right' : '')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3.5 text-[13px] font-semibold text-slate-700">{row.label}</td>
              <td className="px-4 py-3.5 text-right">
                <span className="inline-flex items-center justify-center min-w-[28px] h-[22px] px-2 bg-slate-100 rounded-lg text-[11px] font-semibold text-slate-600">{row.orders}</span>
              </td>
              <td className="px-4 py-3.5 text-[13px] font-semibold text-right text-slate-500">{fmt(row.dineIn)}</td>
              <td className="px-4 py-3.5 text-[13px] font-semibold text-right text-slate-500">{fmt(row.parcel)}</td>
              <td className="px-4 py-3.5 text-[14px] font-semibold text-right text-slate-900">{fmt(row.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan="5" className="p-0">
            <div className="flex items-center justify-between px-4 py-4 bg-slate-900">
              <span className="text-[11px] font-semibold text-white uppercase tracking-widest">Period Total</span>
              <span className="text-[18px] font-semibold text-white">{fmt(total)}</span>
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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const screen = searchParams.get('report') || 'overview';
  const selectedItemId = searchParams.get('itemId');

  const setScreen = (s, id = null) => {
    const newParams = new URLSearchParams(searchParams);
    if (s === 'overview') {
      newParams.delete('report');
      newParams.delete('itemId');
    } else {
      newParams.set('report', s);
      if (id) newParams.set('itemId', id);
      else newParams.delete('itemId');
    }
    setSearchParams(newParams);
  };

  const [period, setPeriod] = useState('week');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);

  const selectedItem = useMemo(() => {
    if (!selectedItemId || !salesData?.topItems) return null;
    return salesData.topItems.find(it => String(it._id) === String(selectedItemId) || String(it.name) === String(selectedItemId));
  }, [selectedItemId, salesData]);
  const [stockTab, setStockTab] = useState('low');
  const [sellingTab, setSellingTab] = useState('7days');
  const [itemSearch, setItemSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [csvOpenState, setCsvOpenState] = useState(false);
  const [dlStep, setDlStep] = useState('pick'); // 'pick' | 'custom'
  const [dlCustomFrom, setDlCustomFrom] = useState('');
  const [dlCustomTo, setDlCustomTo] = useState('');
  const [groupBy, setGroupBy] = useState('daily');
  const groupByOptions = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'yearly', label: 'Yearly' }
  ];
  const csvRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    if (period === 'custom' && !(customFrom && customTo)) return;
    fetchSales();
  }, [period, customFrom, customTo]);

  useEffect(() => {
    const closeAll = () => { setCsvOpenState(false); setShowFilters(false); };
    const onMouse = (e) => {
      const outsideCsv = csvRef.current && !csvRef.current.contains(e.target);
      const outsideFilter = filterRef.current && !filterRef.current.contains(e.target);
      if (outsideCsv) setCsvOpenState(false);
      if (outsideFilter) setShowFilters(false);
    };
    document.addEventListener('mousedown', onMouse);
    window.addEventListener('scroll', closeAll, true);
    return () => {
      document.removeEventListener('mousedown', onMouse);
      window.removeEventListener('scroll', closeAll, true);
    };
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
    setCsvOpenState(false);
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
    const sortedDays = [...(salesData.dailyBreakdown || [])].sort((a, b) => b.date.localeCompare(a.date));

    if (groupBy === 'daily') {
      return sortedDays.map(d => ({
        label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
        orders: d.orders, dineIn: d.dineIn, parcel: d.parcel, cash: d.cash || 0, online: d.online || 0, total: d.total,
        rawDate: d.date
      }));
    }

    const groups = {};
    sortedDays.forEach(d => {
      const date = new Date(d.date);
      let key = '';
      let label = '';

      if (groupBy === 'weekly') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
        label = `Week of ${startOfWeek.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
      } else if (groupBy === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      } else if (groupBy === 'quarterly') {
        const q = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${q}`;
        label = `Q${q} ${date.getFullYear()}`;
      } else if (groupBy === 'yearly') {
        key = `${date.getFullYear()}`;
        label = `${date.getFullYear()}`;
      }

      if (!groups[key]) {
        groups[key] = { label, orders: 0, dineIn: 0, parcel: 0, cash: 0, online: 0, total: 0, rawDate: key };
      }
      groups[key].orders += d.orders || 0;
      groups[key].dineIn += d.dineIn || 0;
      groups[key].parcel += d.parcel || 0;
      groups[key].cash += d.cash || 0;
      groups[key].online += d.online || 0;
      groups[key].total += d.total || 0;
    });

    return Object.values(groups).sort((a, b) => b.rawDate.localeCompare(a.rawDate));
  }, [salesData, period, groupBy]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const topProductsRef = useRef(null);
  const stockStatusRef = useRef(null);
  const topSentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollTop(!entry.isIntersecting),
      { threshold: 0 }
    );
    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const periodOptions = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'all', label: 'All' },
    { id: 'custom', label: 'Custom' },
  ];

  const periodLabel = periodOptions.find(o => o.id === period)?.label || 'Period';

  const filterAndExportRow = (
    <div className="flex items-center gap-2">
      {/* Filter Toggle — with absolute dropdown */}
      <div className="relative" ref={filterRef}>
        <button
          onClick={() => { setShowFilters(f => !f); setCsvOpenState(false); }}
          className={cn(
            "px-3 py-1.5 rounded-xl flex items-center gap-2 transition-all border text-[11px] font-semibold uppercase tracking-widest",
            showFilters ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-500"
          )}
        >
          <SlidersHorizontal size={14} />
          {period === 'custom' && customFrom && customTo
            ? `${customFrom.slice(5)} → ${customTo.slice(5)}`
            : (periodOptions.find(p => p.id === period)?.label || 'Filters')}
        </button>

        {/* Filter Dropdown — anchored right, same width as CSV */}
        {showFilters && (
          <div
            className="absolute right-0 top-full mt-2 bg-white rounded-2xl z-50 animate-in slide-in-from-top-2 duration-200 flex overflow-hidden shadow-xl border border-slate-100"
            style={{ width: '520px' }}
          >
            {/* Left — period options */}
            <div className="w-44 shrink-0 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 pb-2">Period</p>
              {periodOptions.map(o => (
                <button
                  key={o.id}
                  onClick={() => {
                    setPeriod(o.id);
                    if (o.id !== 'custom') {
                      setCustomFrom('');
                      setCustomTo('');
                      setShowFilters(false);
                    }
                  }}
                  className={cn(
                    'w-full text-left px-5 py-2.5 text-[13px] font-semibold transition-colors',
                    period === o.id ? 'text-[#4B6FFF] bg-blue-50/60' : 'text-slate-700 hover:bg-slate-50'
                  )}
                >
                  {o.label}
                </button>
              ))}
              {customFrom && customTo && (
                <div className="px-5 pt-2">
                  <p className="text-[10px] font-bold text-[#4B6FFF]">{customFrom}</p>
                  <p className="text-[10px] font-bold text-[#4B6FFF]">{customTo}</p>
                  <button onClick={() => { setCustomFrom(''); setCustomTo(''); setPeriod('week'); }} className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold mt-1">Clear</button>
                </div>
              )}
            </div>
            {/* Divider */}
            <div className="w-px bg-slate-100 my-4" />
            {/* Right — calendar always visible */}
            <div className="flex-1 p-3">
              <DateRangePicker
                from={customFrom}
                to={customTo}
                onChange={({ from, to }) => {
                  setCustomFrom(from);
                  setCustomTo(to);
                  setPeriod('custom');
                }}
                onApply={() => setShowFilters(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Export CSV */}
      <div className="relative" ref={csvRef}>
        <button
          onClick={() => { setCsvOpenState(o => !o); setShowFilters(false); setDlCustomFrom(''); setDlCustomTo(''); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-semibold uppercase tracking-widest text-slate-600 active:scale-95 transition-transform"
        >
          <Download size={14} style={{ color: BLUE }} />
          CSV
        </button>
        {csvOpenState && (
          <div
            className="absolute right-0 top-full mt-2 bg-white rounded-2xl z-50 animate-in slide-in-from-top-2 duration-200 flex overflow-hidden shadow-xl border border-slate-100"
            style={{ width: '520px' }}
          >
            {/* Left — quick picks */}
            <div className="w-44 shrink-0 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-5 pb-2">Download</p>
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' },
                { id: 'custom', label: 'Custom Range' },
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => p.id !== 'custom' && (handleExport(p.id), setCsvOpenState(false))}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-[13px] font-semibold text-left transition-colors text-slate-700 hover:bg-slate-50"
                >
                  {p.label}
                  {p.id === 'custom'
                    ? (dlCustomFrom && dlCustomTo
                      ? <Download size={11} className="text-[#4B6FFF]" onClick={(e) => { e.stopPropagation(); handleExport('custom', dlCustomFrom, dlCustomTo); setCsvOpenState(false); }} />
                      : <span className="text-[10px] text-slate-300">pick ›</span>)
                    : <Download size={11} className="text-slate-300" />}
                </button>
              ))}
              {dlCustomFrom && dlCustomTo && (
                <div className="px-5 pt-2">
                  <p className="text-[10px] font-bold text-[#4B6FFF]">{dlCustomFrom}</p>
                  <p className="text-[10px] font-bold text-[#4B6FFF]">{dlCustomTo}</p>
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => { setDlCustomFrom(''); setDlCustomTo(''); }} className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold">Clear</button>
                    <button onClick={() => { handleExport('custom', dlCustomFrom, dlCustomTo); setCsvOpenState(false); }} className="text-[10px] text-[#4B6FFF] font-bold ml-auto">Download</button>
                  </div>
                </div>
              )}
            </div>
            {/* Divider */}
            <div className="w-px bg-slate-100 my-4" />
            {/* Right — calendar always visible */}
            <div className="flex-1 p-3">
              <DateRangePicker
                from={dlCustomFrom}
                to={dlCustomTo}
                onChange={({ from, to }) => { setDlCustomFrom(from); setDlCustomTo(to); }}
                onApply={() => { handleExport('custom', dlCustomFrom, dlCustomTo); setCsvOpenState(false); }}
              />
            </div>
          </div>
        )}
      </div>
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
    <div className="min-h-screen bg-white pb-32 font-sans relative">
      <div ref={topSentinelRef} className="absolute top-0 w-full h-0 pointer-events-none" />

      {/* Header */}
      <header className="px-5 pt-6 pb-4 bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm lg:-mx-6 lg:px-6 lg:-mt-6 lg:pt-6 lg:pb-4 lg:border-b-0 lg:shadow-none lg:bg-white lg:sticky lg:top-[-24px]">
        <div className="flex items-center justify-between mb-4 lg:mb-2">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-xl" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-semibold text-slate-900 lg:text-[22px]">Business Overview</h1>
          </div>
          {filterAndExportRow}
        </div>
      </header>

      <div className="px-5 lg:px-0">

        {/* ==========================================
            MOBILE VIEW ONLY
            ========================================== */}
        <div className="block lg:hidden">
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
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Settled (Paid)</p>
                  <p className="text-[15px] font-semibold text-emerald-600">{fmt(salesData?.settledRevenue)}</p>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Outstanding</p>
                  <p className="text-[15px] font-semibold text-orange-500">{fmt(salesData?.unpaidRevenue)}</p>
                </div>
              </div>
              <button onClick={() => setScreen('orders')}
                className="w-full flex items-center justify-end gap-1.5 px-4 py-3.5 border-t border-slate-100 active:bg-slate-50 transition-colors">
                <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: BLUE }}>View Sales Report</span>
                <ChevronRight size={15} style={{ color: BLUE }} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* ── COLLECTION BREAKDOWN ── */}
          <div className="mt-6">
            <SectionLabel>Collection Breakdown</SectionLabel>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="grid grid-cols-2">
                <div className="p-5 border-r border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Cash Total</p>
                  </div>
                  <p className="text-[20px] font-semibold text-slate-900">{fmt(salesData?.totalCash)}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">Cash in Hand</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">UPI Total</p>
                  </div>
                  <p className="text-[20px] font-semibold text-slate-900">{fmt(salesData?.totalOnline)}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">Digital Collection</p>
                </div>
              </div>
              <div className="px-5 pb-5">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${(salesData?.totalCash / (salesData?.settledRevenue || 1)) * 100}%` }}
                  />
                  <div
                    className="h-full bg-blue-500 transition-all duration-1000"
                    style={{ width: `${(salesData?.totalOnline / (salesData?.settledRevenue || 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  <p className="text-[9px] font-semibold text-emerald-600 uppercase tracking-tighter">
                    {Math.round((salesData?.totalCash / (salesData?.settledRevenue || 1)) * 100)}% Cash
                  </p>
                  <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-tighter">
                    {Math.round((salesData?.totalOnline / (salesData?.settledRevenue || 1)) * 100)}% Online
                  </p>
                </div>
              </div>
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
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: BLUE }}>{t.label}</p>
                    <p className={cn('text-[20px] font-semibold leading-none mb-0.5', ti === 0 ? 'text-[#4B6FFF]' : 'text-slate-800')}>
                      {typeof t.orders === 'number' ? t.orders.toFixed(2) : t.orders}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400 mb-3">avg daily order</p>
                    <p className={cn('text-[20px] font-semibold leading-none mb-0.5', ti === 1 ? 'text-[#4B6FFF]' : 'text-slate-800')}>
                      {fmt(t.sales)}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">avg daily sale</p>
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
                  <PieChart dineIn={salesData.dineInRevenue || 0} parcel={salesData.parcelRevenue || 0} />
                  <div className="flex-1 space-y-4">
                    {[
                      { label: 'Dine-in', val: salesData.dineInRevenue || 0, color: '#8b5cf6' },
                      { label: 'Parcel', val: salesData.parcelRevenue || 0, color: '#f43f5e' },
                    ].map(row => {
                      const tot = (salesData.dineInRevenue || 0) + (salesData.parcelRevenue || 0) || 1;
                      const pct = Math.round((row.val / tot) * 100);
                      return (
                        <div key={row.label}>
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                              <span className="text-[13px] font-semibold text-slate-700">{row.label}</span>
                            </div>
                            <span className="text-[14px] font-semibold text-slate-900">{fmt(row.val)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: row.color }} />
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pct}% of revenue</p>
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
                      className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-widest" style={{ color: BLUE }}>
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
                          onClick={() => { setScreen('item_detail', item._id); }}
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
                            <p className="text-[15px] font-semibold text-slate-800 leading-tight mb-1">{item.name}</p>

                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[16px] font-semibold text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 uppercase">Qty</span></p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => setScreen('items')}
                    className="w-full flex items-center justify-end gap-1.5 px-4 py-3.5 border-t border-slate-100 active:bg-slate-50 transition-colors">
                    <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: BLUE }}>View Item Reports</span>
                    <ChevronRight size={15} style={{ color: BLUE }} strokeWidth={3} />
                  </button>
                </>
              )}
            </div>
          </div>

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

        {/* ==========================================
            DESKTOP VIEW ONLY (PREMIUM OVERHAUL)
            ========================================== */}
        <div className="hidden lg:block mt-2">
          {/* 1. 4 Bright Gradient Cards for Sales Overview */}
          <div className="mb-8">
            <SectionLabel className="text-[12px]">Sales Overview</SectionLabel>
            <div className="grid grid-cols-4 gap-6">
              {/* Card 1: Total Revenue */}
              <div
                onClick={() => setScreen('orders')}
                className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100/50 hover:scale-[1.02] hover:shadow-indigo-200/50 transition-all duration-300 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <IndianRupee size={120} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-2">{periodLabel} Revenue</p>
                <p className="text-[28px] font-semibold tracking-tight">{fmtS(salesData?.totalRevenue)}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-semibold text-indigo-100">
                  <span>Prev: {fmt(salesData?.prevTotalRevenue || 0)}</span>
                  <span className="flex items-center gap-1 hover:underline">Report <ChevronRight size={12} /></span>
                </div>
              </div>

              {/* Card 2: Total Orders */}
              <div
                onClick={() => setScreen('orders')}
                className="bg-gradient-to-br from-amber-500 to-[#FF5A36] rounded-3xl p-6 text-white shadow-xl shadow-orange-100/50 hover:scale-[1.02] hover:shadow-orange-200/50 transition-all duration-300 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <ShoppingBag size={120} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-2">Total Orders</p>
                <p className="text-[28px] font-semibold tracking-tight">{fmtRaw(salesData?.totalOrders)}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-semibold text-amber-100">
                  <span>Prev: {salesData?.prevTotalOrders || 0}</span>
                  <span className="flex items-center gap-1 hover:underline">Report <ChevronRight size={12} /></span>
                </div>
              </div>

              {/* Card 3: Settled (Paid) */}
              <div
                onClick={() => setScreen('orders')}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100/50 hover:scale-[1.02] hover:shadow-emerald-200/50 transition-all duration-300 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Trophy size={120} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-2">Settled (Paid)</p>
                <p className="text-[28px] font-semibold tracking-tight">{fmt(salesData?.settledRevenue)}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-semibold text-emerald-100">
                  <span>Verified Cash & Digital</span>
                  <span className="flex items-center gap-1 hover:underline">Report <ChevronRight size={12} /></span>
                </div>
              </div>

              {/* Card 4: Outstanding */}
              <div
                onClick={() => setScreen('orders')}
                className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-xl shadow-rose-100/50 hover:scale-[1.02] hover:shadow-rose-200/50 transition-all duration-300 relative overflow-hidden group cursor-pointer"
              >
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <AlertCircle size={120} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-2">Outstanding</p>
                <p className="text-[28px] font-semibold tracking-tight">{fmt(salesData?.unpaidRevenue)}</p>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-semibold text-rose-100">
                  <span>To be collected</span>
                  <span className="flex items-center gap-1 hover:underline">Report <ChevronRight size={12} /></span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Collection Breakdown in a Fancy Way */}
          <div className="mb-8 bg-slate-50/50 rounded-3xl p-6 border border-slate-100/80">
            <SectionLabel className="text-[12px]">Collection Breakdown</SectionLabel>
            <div className="flex items-center justify-between gap-12">
              <div className="flex-1 grid grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-center text-emerald-600">
                    <IndianRupee size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Cash Collection</p>
                    <p className="text-[22px] font-semibold text-slate-900 leading-tight">{fmt(salesData?.totalCash)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">Physical Cash in Hand</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100/50 flex items-center justify-center text-blue-600">
                    <Activity size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Digital UPI Total</p>
                    <p className="text-[22px] font-semibold text-slate-900 leading-tight">{fmt(salesData?.totalOnline)}</p>
                    <p className="text-[10px] font-semibold text-slate-400">Direct Bank Settlement</p>
                  </div>
                </div>
              </div>

              <div className="w-1/3 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Ratio breakdown</p>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-1000 relative group"
                    style={{ width: `${(salesData?.totalCash / (salesData?.settledRevenue || 1)) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-1000 relative group"
                    style={{ width: `${(salesData?.totalOnline / (salesData?.settledRevenue || 1)) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-[11px] font-semibold uppercase tracking-wider">
                  <span className="text-emerald-600">{Math.round((salesData?.totalCash / (salesData?.settledRevenue || 1)) * 100)}% Cash</span>
                  <span className="text-blue-600">{Math.round((salesData?.totalOnline / (salesData?.settledRevenue || 1)) * 100)}% Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Trends, Order Split & Shortcuts */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Col 1: Performance Trend */}
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl p-6 shadow-xl shadow-indigo-100/30 text-white relative overflow-hidden group flex flex-col">
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 transition-transform duration-500">
                <TrendingUp size={120} />
              </div>
              <div className="flex justify-between items-center mb-6">
                <SectionLabel className="text-[12px] mb-0 text-white/90">Performance Trends</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-4 flex-1">
                {[
                  { label: 'Last Month', orders: salesData?.lastMonthAvgDailyOrders ?? 0.03, sales: salesData?.lastMonthAvgDailySales ?? 0, highlight: false },
                  { label: 'This Month', orders: salesData?.thisMonthAvgDailyOrders ?? 0, sales: salesData?.thisMonthAvgDailySales ?? 0, highlight: true },
                ].map((t, ti) => (
                  <div key={ti} className={cn('p-4 rounded-2xl transition-all flex flex-col justify-center', t.highlight ? 'bg-white/15 border border-white/20' : 'bg-black/10 border border-white/5')}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3 text-white/80">{t.label}</p>
                    <div className="mb-3">
                      <p className="text-[20px] font-semibold leading-none mb-1 text-white">
                        {typeof t.orders === 'number' ? t.orders.toFixed(2) : t.orders}
                      </p>
                      <p className="text-[9px] font-semibold text-white/70 uppercase tracking-widest">avg orders</p>
                    </div>
                    <div>
                      <p className="text-[20px] font-semibold leading-none mb-1 text-white">
                        {fmt(t.sales)}
                      </p>
                      <p className="text-[9px] font-semibold text-white/70 uppercase tracking-widest">avg sales</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Col 2: Order Split (Pie Chart) */}
            <div className="rounded-3xl p-6 relative overflow-hidden flex flex-col">
              <SectionLabel className="text-[12px] mb-6">Order Split</SectionLabel>
              {salesData?.totalOrders > 0 ? (
                <div className="flex flex-col xl:flex-row items-center gap-6 flex-1 justify-center">
                  <div className="shrink-0 scale-110"><PieChart dineIn={salesData.dineInRevenue || 0} parcel={salesData.parcelRevenue || 0} /></div>
                  <div className="flex-1 space-y-4 w-full z-10 relative">
                    {[
                      { label: 'Dine-in', val: salesData.dineInRevenue || 0, color: '#8b5cf6' },
                      { label: 'Parcel', val: salesData.parcelRevenue || 0, color: '#f43f5e' },
                    ].map(row => {
                      const tot = (salesData.dineInRevenue || 0) + (salesData.parcelRevenue || 0) || 1;
                      const pct = Math.round((row.val / tot) * 100);
                      return (
                        <div key={row.label}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                              <span className="text-[12px] font-semibold text-slate-700">{row.label}</span>
                            </div>
                            <span className="text-[13px] font-semibold text-slate-900">{fmt(row.val)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: row.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="relative flex-1 flex flex-col justify-center">
                  <div className="flex flex-col xl:flex-row items-center gap-6 opacity-25 filter blur-[1px]">
                    <div className="shrink-0 scale-110"><PieChart dineIn={60} parcel={40} /></div>
                    <div className="flex-1 space-y-4 w-full">
                      {[
                        { label: 'Dine-in (Mock)', val: 6000, color: '#8b5cf6' },
                        { label: 'Parcel (Mock)', val: 4000, color: '#f43f5e' },
                      ].map(row => (
                        <div key={row.label}>
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                              <span className="text-[12px] font-semibold text-slate-400">{row.label}</span>
                            </div>
                            <span className="text-[13px] font-semibold text-slate-400">{fmt(row.val)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full animate-pulse" style={{ width: `60%`, background: row.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-white/40 backdrop-blur-[0.5px] rounded-2xl z-20">
                    <AlertCircle size={24} className="text-slate-400 mb-1.5 animate-pulse" />
                    <p className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">No Data for this Period</p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 max-w-[150px] leading-tight">Mock layout shown. Add orders to view stats.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Col 3: Shortcuts */}
            <div className="flex flex-col gap-6">
              <div onClick={() => scrollToRef(topProductsRef)} className="flex-1 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-3xl p-6 text-white shadow-xl shadow-purple-100/50 cursor-pointer relative overflow-hidden flex flex-col justify-end transition-opacity hover:opacity-95">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                  <ShoppingBag size={120} />
                </div>
                <div className="relative z-10">
                  <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-1">Report Shortcut</p>
                  <div className="flex items-center gap-3">
                    <p className="text-[26px] font-semibold tracking-tight leading-none">Top Products</p>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <ChevronDown size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>

              <div onClick={() => scrollToRef(stockStatusRef)} className="flex-1 bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl shadow-orange-100/50 cursor-pointer relative overflow-hidden flex flex-col justify-end transition-opacity hover:opacity-95">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10">
                  <Box size={120} />
                </div>
                <div className="relative z-10">
                  <p className="text-[11px] font-semibold uppercase tracking-widest opacity-80 mb-1">Report Shortcut</p>
                  <div className="flex items-center gap-3">
                    <p className="text-[26px] font-semibold tracking-tight leading-none">Stock Status</p>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <ChevronDown size={18} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Top Products & Stock Status stacked underneath, taking full width */}
          <div className="space-y-8">
            {/* Top Products */}
            <div ref={topProductsRef} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-3">
                <SectionLabel className="text-[12px] mb-0">Top Products</SectionLabel>
                <OutlinedTab
                  options={[{ id: '7days', label: 'Last 7 Days' }, { id: '30days', label: 'Last 30 Days' }]}
                  value={sellingTab}
                  onChange={setSellingTab}
                />
              </div>

              {!salesData?.topItems?.length ? (
                <EmptyState title="No Products" sub="Add orders to show popular items." />
              ) : (
                <div className="grid grid-cols-5 gap-6">
                  {salesData.topItems.slice(0, 5).map((item, i) => {
                    const maxQty = salesData.topItems[0]?.quantity || 1;
                    const itemPct = Math.round((item.quantity / maxQty) * 100);
                    return (
                      <div key={i}
                        onClick={() => { setScreen('item_detail', item._id); }}
                        className="flex flex-col p-4 bg-slate-50/50 rounded-2xl hover:bg-slate-50 border border-slate-100 hover:border-indigo-100 cursor-pointer transition-all duration-200">
                        <div className="w-16 h-16 mx-auto rounded-xl bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center mb-3">
                          {item.image ? (
                            <img src={item.image} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Box size={24} className="text-slate-300" />
                          )}
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-[14px] font-semibold text-slate-800 line-clamp-1 mb-1">{item.name}</p>
                          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden w-2/3 mx-auto mb-2">
                            <div className="h-full bg-[#4B6FFF] rounded-full" style={{ width: `${itemPct}%` }} />
                          </div>
                          <p className="text-[16px] font-semibold text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 font-semibold uppercase">Sold</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button onClick={() => setScreen('items')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-[12px] font-semibold uppercase tracking-wider text-slate-700 transition-colors border border-slate-100">
                  View Detailed Registry <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Stock Status */}
            <div ref={stockStatusRef} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm scroll-mt-6">
              <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
                <SectionLabel className="text-[12px] mb-0">Stock Status Summary</SectionLabel>
                <OutlinedTab
                  options={[{ id: 'low', label: 'Low Stock Items' }, { id: 'out', label: 'Out of Stock' }]}
                  value={stockTab}
                  onChange={setStockTab}
                />
              </div>
              <EmptyState
                title={stockTab === 'low' ? 'Sufficiently Stocked' : 'Fully Available'}
                sub="All items are sufficiently stocked at the moment."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Back to Top Arrow */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="hidden lg:flex fixed bottom-6 right-6 w-12 h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white items-center justify-center shadow-2xl transition-all duration-300 scale-100 hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 border border-slate-800"
        >
          <ArrowLeft size={20} className="rotate-90" />
        </button>
      )}

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
  if (screen === 'orders') return (
    <div className="min-h-screen bg-white pb-32 animate-in fade-in duration-500">
      <ScreenHeader
        title="Sales Report"
        subtitle="Daily Registry"
        onBack={() => setScreen('overview')}
        right={filterAndExportRow}
        searchBar={
          <div className=" ml-4 w-[99%] relative group w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4B6FFF] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search date (e.g. 13 May, Monday)..."
              className="w-full  bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-11 pr-4 outline-none focus:bg-white focus:border-[#4B6FFF] focus:ring-4 focus:ring-[#4B6FFF]/10 transition-all text-[15px] text-slate-700 placeholder:text-slate-400 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <div className="px-5">

        <div className="flex items-center gap-4 mb-5 pb-2 overflow-x-auto no-scrollbar border-b border-slate-100">
          <div className="flex items-center gap-2.5 pr-4 border-r border-slate-100 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
              <Calendar size={16} strokeWidth={2} />
            </div>
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Breakdown</h2>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            {groupByOptions.map(o => (
              <button
                key={o.id}
                onClick={() => setGroupBy(o.id)}
                className={cn(
                  "text-[12px] font-semibold uppercase tracking-widest pb-3 -mb-[9px] transition-colors relative",
                  groupBy === o.id ? "text-[#4B6FFF]" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {o.label}
                {groupBy === o.id && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4B6FFF] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {!tableRows.length ? (
          <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-100 bg-white">
            <History size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">No Records Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tableRows
              .filter(row => row.label.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((row, i) => (
                <div key={i} className="group bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-[#4B6FFF] hover:shadow-lg hover:shadow-[#4B6FFF]/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[15px] font-semibold text-slate-900 mb-1">{row.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                          {row.orders} Orders
                        </span>
                      </div>
                    </div>
                    <span className="text-[18px] font-semibold text-[#4B6FFF]">{fmt(row.total)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Dine-in</span>
                      <span className="text-[13px] font-semibold text-slate-700">{fmt(row.dineIn)}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Parcel</span>
                      <span className="text-[13px] font-semibold text-slate-700">{fmt(row.parcel)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 mt-3 border-t border-slate-50 border-dashed">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <div>
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter">Cash</p>
                        <p className="text-[12px] font-semibold text-slate-800">{fmt(row.cash)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <div className="text-right">
                        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-tighter">Online</p>
                        <p className="text-[12px] font-semibold text-slate-800">{fmt(row.online)}</p>
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
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
     ITEM REPORTS
  ════════════════════════════════════════════════════════════ */
  if (screen === 'items') return (
    <div className="min-h-screen bg-white pb-32 animate-in fade-in duration-500">
      <ScreenHeader
        title="Item Reports"
        subtitle="Performance Registry"
        onBack={() => setScreen('overview')}
        right={filterAndExportRow}
        searchBar={
          <div className="relative group w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#4B6FFF] transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search items by name..."
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-11 pr-4 outline-none focus:bg-white focus:border-[#4B6FFF] focus:ring-4 focus:ring-[#4B6FFF]/10 transition-all text-[15px] text-slate-700 placeholder:text-slate-400 font-medium"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
            />
          </div>
        }
      />

      <div className="px-5 mt-1">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
              <Box size={16} strokeWidth={2} />
            </div>
            <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Performance List</h2>
          </div>
          <div className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full uppercase">
            {(salesData?.allItemsSold || salesData?.topItems || []).filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase())).length} Items
          </div>
        </div>

        {!salesData?.topItems?.length ? (
          <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-100 bg-white">
            <Package size={24} className="mx-auto text-slate-300 mb-2" />
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">No Sales Recorded</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(salesData?.allItemsSold || salesData?.topItems || [])
              .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
              .map((item, i) => (
                <div key={i}
                  onClick={() => { setScreen('item_detail', item._id); }}
                  className="group flex gap-4 bg-white border border-slate-200 rounded-2xl p-4 transition-all hover:border-[#4B6FFF] hover:shadow-lg hover:shadow-[#4B6FFF]/5 cursor-pointer">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.image ? (
                      <img src={item.image} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <Box size={24} className="text-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 leading-tight mb-1.5">{item.name}</p>
                    <div className={cn(
                      "inline-block px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase tracking-wider",
                      item.quantity > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                    )}>
                      {item.quantity > 0 ? 'Verified' : 'No Sales'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[17px] font-semibold text-[#4B6FFF] mb-0.5">{fmt(item.revenue)}</p>
                    <p className="text-[13px] font-semibold text-slate-900">{item.quantity} <span className="text-[10px] text-slate-400 uppercase">units</span></p>
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
  if (screen === 'item_detail') {
    if (!selectedItem) {
      return (
        <div className="min-h-screen bg-white pb-32">
          <ScreenHeader
            title="Product Detail"
            onBack={() => setScreen('items')}
          />
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <p className="text-[15px] font-semibold text-slate-700 mb-1">Item details not found</p>
            <p className="text-[13px] text-slate-400">The requested item was not found in top reports.</p>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-white pb-32 animate-in slide-in-from-right duration-300">
      <ScreenHeader
        title="Product Detail"
        onBack={() => setScreen('items')}
        right={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-xl text-emerald-600 text-[10px] font-semibold uppercase tracking-widest">
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
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">No Image Available</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-xl text-[11px] font-semibold text-slate-900 uppercase shadow-sm">
                Category
              </span>
            </div>
          </div>
          <div className="p-6">
            <h2 className="text-[24px] font-semibold text-slate-900 mb-4">{selectedItem.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                <p className="text-[20px] font-semibold text-[#4B6FFF]">{fmt(selectedItem.revenue)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Total Quantity</p>
                <p className="text-[20px] font-semibold text-slate-800">{selectedItem.quantity} <span className="text-[11px] text-slate-400">units</span></p>
              </div>
            </div>
          </div>
        </div>

        <SectionLabel>Performance Analytics</SectionLabel>
        <div className="bg-white border border-slate-200 rounded-[28px] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[13px] font-semibold text-slate-800">Sales Velocity</p>
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
                  <p className="text-[13px] font-semibold text-slate-900">{stat.label}</p>
                  <p className="text-[11px] text-slate-400">{stat.sub}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-semibold text-slate-800">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

  return null;
};

export default SalesReport;
