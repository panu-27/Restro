import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  TrendingUp, ShoppingBag, IndianRupee, BarChart3,
  Download, Calendar, Trophy, ChevronDown, X,
  ArrowUpRight, Package, Utensils, Search, Activity, Users
} from 'lucide-react';

import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...inputs) => twMerge(clsx(inputs));

/* ─── formatters ─────────────────────────────────────────────── */
const fmt    = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtS   = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}k` : `₹${Math.round(n)}`;
const fmtRaw = (n) => n >= 100000 ? `${(n/100000).toFixed(1)}L` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : `${Math.round(n)}`;
const hourLabel = (h) => { const ampm = h < 12 ? 'am' : 'pm'; const hr = h % 12 || 12; return `${hr}${ampm}`; };

/* ─── helpers ─────────────────────────────────────────────────── */
const bezierPath = (pts) => {
  if (pts.length < 2) return '';
  return pts.map(([x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px2, py2] = pts[i - 1];
    const cpx = (px2 + x) / 2;
    return `C${cpx},${py2} ${cpx},${y} ${x},${y}`;
  }).join(' ');
};

/* ─── SVG Line Chart — Smooth Bezier ─────────────────────────── */
const LineChart = ({ data, color = '#10b981', label = 'chart', prefix = '₹' }) => {
  const [hover, setHover] = useState(null);
  const W = 900, H = 260;
  const padL = 54, padR = 24, padT = 28, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-48 text-slate-300 text-sm font-bold uppercase tracking-widest">No data for this period</div>
  );

  const vals = data.map(d => d.value);
  const minV = 0;
  const maxV = Math.max(...vals, 1);
  const px = (i) => padL + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
  const py = (v) => padT + chartH - ((v - minV) / (maxV - minV)) * chartH;

  const pts  = data.map((d, i) => [px(i), py(d.value)]);
  const linePath = bezierPath(pts);
  const areaPath = pts.length > 1
    ? `${linePath} L${pts[pts.length-1][0]},${padT+chartH} L${pts[0][0]},${padT+chartH} Z`
    : '';

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => minV + t * (maxV - minV));
  const peakIdx = vals.indexOf(Math.max(...vals));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}
        onMouseLeave={() => setHover(null)}>
        <defs>
          {/* Area gradient */}
          <linearGradient id={`area-${label}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
            <stop offset="75%"  stopColor={color} stopOpacity="0.04" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          {/* Line glow */}
          <filter id={`glow-${label}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Dot glow */}
          <filter id={`dotglow-${label}`}>
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={py(t)} y2={py(t)}
              stroke={i === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth={i === 0 ? '1.5' : '1'}
              strokeDasharray={i === 0 ? '' : '0'} />
            <text x={padL - 9} y={py(t) + 4} textAnchor="end"
              fontSize="10" fill="#cbd5e1" fontWeight="700">{fmtRaw(t)}</text>
          </g>
        ))}

        {/* Vertical hover line */}
        {hover && (
          <line x1={hover.x} y1={padT} x2={hover.x} y2={padT + chartH}
            stroke={color} strokeWidth="1" strokeDasharray="5 3" opacity="0.3" />
        )}

        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#area-${label})`} style={{ animation: 'fadeArea 1s ease-out forwards', opacity: 0 }} />}

        {/* Glow line (blurred, behind) */}
        {pts.length > 1 && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="5"
            strokeLinejoin="round" strokeLinecap="round" opacity="0.18"
            filter={`url(#glow-${label})`}
            pathLength="100" strokeDasharray="100" strokeDashoffset="100"
            style={{ animation: 'drawLine 1s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} />
        )}

        {/* Main line */}
        {pts.length > 1 && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" 
            pathLength="100" strokeDasharray="100" strokeDashoffset="100"
            style={{ animation: 'drawLine 1s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} />
        )}

        {/* Peak area highlight */}
        {peakIdx !== -1 && (
          <line x1={px(peakIdx)} y1={py(vals[peakIdx])} x2={px(peakIdx)} y2={padT + chartH}
            stroke={color} strokeWidth="1" strokeDasharray="3 2" opacity="0.2" />
        )}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const step = data.length > 14 ? Math.ceil(data.length / 10) : 1;
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={px(i)} y={H - 4} textAnchor="middle"
              fontSize="10" fill={hover?.i === i ? color : '#94a3b8'} fontWeight="700">
              {d.label}
            </text>
          );
        })}

        {/* Invisible hit areas */}
        {data.map((d, i) => (
          <rect key={`hit-${i}`}
            x={px(i) - (chartW / data.length / 2)} y={padT}
            width={chartW / data.length} height={chartH}
            fill="transparent"
            onMouseEnter={() => setHover({ i, ...d, x: px(i), y: py(d.value) })} />
        ))}

        {/* All dots — small */}
        {data.map((d, i) => (
          <circle key={`dot-${i}`} cx={px(i)} cy={py(d.value)}
            r={hover?.i === i || i === peakIdx ? 0 : 3}
            fill={color} stroke="white" strokeWidth="2"
            style={{ 
              transformOrigin: `${px(i)}px ${py(d.value)}px`,
              animation: `popDot 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${0.2 + (i * 0.05)}s both`,
              transition: 'fill 0.15s ease' 
            }} />
        ))}

        {/* Hover / Peak large dot with glow */}
        {data.map((d, i) => {
          const isHover = hover?.i === i;
          const isPeak  = i === peakIdx;
          if (!isHover && !isPeak) return null;
          return (
            <g key={`hl-${i}`}>
              {/* Outer glow ring */}
              <circle cx={px(i)} cy={py(d.value)} r={isHover ? 14 : 10}
                fill={color} opacity={isHover ? 0.12 : 0.08} />
              <circle cx={px(i)} cy={py(d.value)} r={isHover ? 9 : 6}
                fill={color} opacity={isHover ? 0.2 : 0.14} />
              {/* Core dot */}
              <circle cx={px(i)} cy={py(d.value)} r={isHover ? 5.5 : 4.5}
                fill={color} stroke="white" strokeWidth="2.5"
                filter={`url(#dotglow-${label})`} />
            </g>
          );
        })}

        {hover && (() => {
          const tipW = 108, tipH = 46;
          const tx = Math.min(Math.max(hover.x, padL + tipW / 2), W - padR - tipW / 2);
          const nearTop = hover.y < padT + tipH + 12;
          const ty = nearTop ? hover.y + 16 : hover.y - tipH - 12;
          return (
            <g style={{ animation: 'fadeSlideUp 0.15s ease-out forwards' }}>
              <rect x={tx - tipW / 2} y={ty} width={tipW} height={tipH} rx="10" fill="#0f172a" />
              <text x={tx} y={ty + 15} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="700">{hover.label}</text>
              <text x={tx} y={ty + 33} textAnchor="middle" fontSize="14" fill={color} fontWeight="900">
                {prefix}{fmtRaw(hover.value)}
              </text>
            </g>
          );
        })()}
      </svg>
      <style>{`
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes fadeArea { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popDot { 0% { opacity: 0; transform: scale(0); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

/* ─── Avg Order Value — Vertical Column Chart ─────────────────────── */
const AvgOrderChart = ({ data, color = '#f59e0b' }) => {
  const [hovered, setHovered] = useState(null);
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-48 text-slate-300 text-sm font-bold uppercase tracking-widest">No data for this period</div>
  );
  const maxV  = Math.max(...data.map(d => d.value), 1);
  const topIdx = data.reduce((best, d, i) => d.value > data[best].value ? i : best, 0);

  return (
    <div className="flex items-end justify-between h-[280px] pt-14 pb-2 px-2 relative w-full">
      {data.map((d, i) => {
        const pct = (d.value / maxV) * 100;
        const isPeak = i === topIdx;
        const isHov = hovered === i;
        const active = isPeak || isHov;
        // Strip year from label to save space if needed
        const labelParts = d.label.split(/,|\s/);
        const labelStr = labelParts.slice(0, 2).join(' ') || d.label; 
        
        return (
          <div 
            key={i} 
            className="relative flex flex-col items-center flex-1 h-full cursor-pointer group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Tooltip */}
            {(isHov || (isPeak && hovered === null)) && (
              <div 
                className="absolute -top-12 z-10 flex flex-col items-center pointer-events-none"
                style={{ animation: 'fadeSlideUp 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="bg-slate-900 text-white px-3 py-2 rounded-[1rem] shadow-xl flex flex-col items-center whitespace-nowrap min-w-[70px]">
                  <span className="text-[13px] font-black tracking-tight leading-none">{fmt(d.value)}</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{labelStr}</span>
                </div>
                <div className="w-3 h-3 bg-slate-900 rotate-45 -mt-1.5 rounded-sm"></div>
              </div>
            )}
            
            {/* Track (ghost bar) */}
            <div className="absolute bottom-8 w-10 md:w-14 top-0 rounded-2xl bg-slate-50 transition-colors group-hover:bg-slate-100/70"></div>
            
            {/* Active filled bar */}
            <div className="relative mt-auto w-10 md:w-14 rounded-2xl flex flex-col justify-end mb-8 z-0 isolate overflow-hidden"
                 style={{ height: `${Math.max(pct, 5)}%`, transition: 'height 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}>
               <div className="absolute inset-0 rounded-2xl transition-all duration-300 ease-out"
                    style={{
                      background: active 
                         ? `linear-gradient(180deg, ${color} 0%, ${color}cc 100%)` 
                         : `linear-gradient(180deg, ${color}44 0%, ${color}22 100%)`,
                      boxShadow: active ? `inset 0 4px 12px rgba(255,255,255,0.4)` : 'none',
                      animation: `growBar 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s both`
                    }} 
               />
               <div className="absolute top-1 left-1.5 right-1.5 h-2 rounded-full bg-white/30 mix-blend-overlay"></div>
            </div>
            
            {/* Value (Date label) */}
            <span className="absolute bottom-0 text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-colors duration-200 whitespace-nowrap text-center"
                  style={{ color: active ? '#0f172a' : '#94a3b8' }}>
               {labelStr}
            </span>
          </div>
        );
      })}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes growBar {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/* ─── Premium Donut Chart ──────────────────────────────────────── */
const DonutChart = ({ dineIn, parcel }) => {
  const total = (dineIn + parcel) || 1;
  const dineRatio = dineIn / total;
  const parcelRatio = parcel / total;
  const dineAngle = dineRatio * 360;
  const r = 62, cx = 80, cy = 80, strokeW = 14;
  const circumference = 2 * Math.PI * r;
  const dineDash = (dineAngle / 360) * circumference;
  const parcelDash = circumference - dineDash;
  const gapAngle = total > 0 && dineIn > 0 && parcel > 0 ? 4 : 0;
  const dineStroke = Math.max(dineDash - gapAngle, 0);
  const parcelStroke = Math.max(parcelDash - gapAngle, 0);
  return (
    <div className="relative flex items-center justify-center" style={{width:160, height:160, margin:'0 auto'}}>
      <svg viewBox="0 0 160 160" style={{width:160, height:160, transform:'rotate(-90deg)'}}>
        <defs>
          <linearGradient id="dine-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B3D" />
            <stop offset="100%" stopColor="#FF8C42" />
          </linearGradient>
          <linearGradient id="parcel-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
          <filter id="donut-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeW} />
        {/* Dine-in arc */}
        {dineIn > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#dine-grad)" strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            style={{ filter: 'drop-shadow(0 0 4px #FF6B3D55)', "--target-offset": circumference - dineStroke, animation: 'drawDonutArc 1s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          />
        )}
        {/* Parcel arc */}
        {parcel > 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#parcel-grad)" strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            transform={`rotate(${(dineDash / circumference) * 360} ${cx} ${cy})`}
            style={{ filter: 'drop-shadow(0 0 4px #6366f155)', "--target-offset": circumference - parcelStroke, animation: 'drawDonutArc 1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards' }}
          />
        )}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-stat-pop" style={{ animationFillMode: 'both', animationDelay: '0.4s' }}>
        <span className="text-2xl font-black text-slate-900 leading-none">{Math.round(dineRatio * 100)}%</span>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Dine-in</span>
      </div>
      <style>{`
        @keyframes drawDonutArc {
          from { stroke-dashoffset: ${circumference}; }
          to { stroke-dashoffset: var(--target-offset); }
        }
      `}</style>
    </div>
  );
};

/* ─── Main SalesReport ────────────────────────────────────────── */
const SalesReport = () => {
  const [period, setPeriod]         = useState('week');
  const [salesData, setSalesData]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [csvOpen, setCsvOpen]       = useState(false);
  const [csvStep, setCsvStep]       = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const csvRef = useRef(null);

  const periods = [
    { id: 'today',   label: 'Today' },
    { id: 'week',    label: 'This Week' },
    { id: 'month',   label: 'This Month' },
    { id: 'custom',  label: 'Custom Date' },
    { id: 'all',     label: 'All Time' },
  ];


  const csvPeriods = [
    { id: 'today',  label: 'Today' },
    { id: 'week',   label: 'This Week' },
    { id: 'month',  label: 'This Month' },
    { id: 'custom', label: 'Custom Date Range' },
  ];

  useEffect(() => {
    if (period === 'custom') {
      if (customFrom && customTo) fetchSales();
    } else {
      fetchSales();
    }
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleExport = async (csvPeriod, from, to) => {
    setCsvOpen(false);
    try {
      let url = `/api/analytics/export?period=${csvPeriod}`;
      if (csvPeriod === 'custom' && from && to) url += `&from=${from}&to=${to}`;
      const res = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `analytics-${csvPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err) { console.error(err); }
  };

  /* ─── Build chart data ─────────────────────────────────── */
  const chartData = useMemo(() => {
    if (!salesData) return { revenue: [], orders: [], dineIn: [], parcel: [], avg: [] };

    // For "today" use hourly data
    if (period === 'today' && salesData.hourlyBreakdown?.length > 0) {
      const hb = salesData.hourlyBreakdown;
      return {
        revenue: hb.map(d => ({ label: hourLabel(d.hour), value: d.total })),
        orders:  hb.map(d => ({ label: hourLabel(d.hour), value: d.orders })),
        dineIn:  hb.map(d => ({ label: hourLabel(d.hour), value: d.dineIn })),
        parcel:  hb.map(d => ({ label: hourLabel(d.hour), value: d.parcel })),
        avg:     hb.map(d => ({ label: hourLabel(d.hour), value: d.orders > 0 ? Math.round(d.total / d.orders) : 0 })),
      };
    }

    const days = [...(salesData.dailyBreakdown || [])].sort((a,b) => a.date.localeCompare(b.date));
    const lbl = (date) => new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    return {
      revenue: days.map(d => ({ label: lbl(d.date), value: d.total })),
      orders:  days.map(d => ({ label: lbl(d.date), value: d.orders })),
      dineIn:  days.map(d => ({ label: lbl(d.date), value: d.dineIn })),
      parcel:  days.map(d => ({ label: lbl(d.date), value: d.parcel })),
      avg:     days.map(d => ({ label: lbl(d.date), value: d.avgOrder || 0 })),
    };
  }, [salesData, period]);

  const statCards = useMemo(() => {
    if (!salesData) return [];
    return [
      {
        id: 'revenue', label: 'Total Revenue',
        value: fmt(salesData.totalRevenue), sub: `${salesData.totalOrders} orders`,
        icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100',
        accent: '#10b981', chartTitle: period === 'today' ? 'Revenue by Hour' : 'Revenue Over Time',
        chartKey: 'revenue', chartColor: '#10b981', chartType: 'line',
      },
      {
        id: 'dinein', label: 'Dine-in Revenue',
        value: fmt(salesData.dineInRevenue), sub: `${salesData.dineInOrders} orders`,
        icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100',
        accent: '#FF5A36', chartTitle: period === 'today' ? 'Dine-in Revenue by Hour' : 'Dine-in Revenue Over Time',
        chartKey: 'dineIn', chartColor: '#FF5A36', chartType: 'line',
      },
      {
        id: 'parcel', label: 'Parcel Revenue',
        value: fmt(salesData.parcelRevenue), sub: `${salesData.parcelOrders} orders`,
        icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-50', border: 'border-indigo-100',
        accent: '#6366f1', chartTitle: period === 'today' ? 'Parcel Revenue by Hour' : 'Parcel Revenue Over Time',
        chartKey: 'parcel', chartColor: '#6366f1', chartType: 'line',
      },
      {
        id: 'avg', label: 'Avg Order Value',
        value: `₹${salesData.avgOrderValue?.toFixed(0) || 0}`, sub: 'per order',
        icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100',
        accent: '#f59e0b', chartTitle: period === 'today' ? 'Avg Order Value by Hour' : 'Avg Order Value by Day',
        chartKey: 'avg', chartColor: '#f59e0b', chartType: 'hbar',
      },
      {
        id: 'guest', label: 'Guest Orders',
        value: fmt(salesData.guestOrdersValue || 0), sub: `${salesData.guestOrdersCount || 0} orders`,
        icon: Users, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100',
        accent: '#f97316', chartTitle: 'Guest Orders Over Time',
        chartKey: 'revenue', chartColor: '#f97316', chartType: 'line',
      },
    ];
  }, [salesData, period]);

  const activeCardData = statCards.find(c => c.id === activeCard);
  const activePeriodLabel = periods.find(p => p.id === period)?.label || 'Sales';

  /* ─── Summary stats for chart footer ─────────────────── */
  const chartSummary = useMemo(() => {
    if (!activeCardData || !chartData[activeCardData.chartKey]) return null;
    const d = chartData[activeCardData.chartKey].filter(p => p.value > 0);
    if (d.length === 0) return null;
    const peak = [...d].sort((a,b) => b.value - a.value)[0];
    const avg  = d.reduce((s,p) => s + p.value, 0) / d.length;
    return { peak, avg: Math.round(avg), count: chartData[activeCardData.chartKey].length };
  }, [activeCardData, chartData]);

  /* ─── Table data: hourly for today, daily otherwise ───── */
  const tableRows = useMemo(() => {
    if (!salesData) return [];
    if (period === 'today' && salesData.hourlyBreakdown?.length > 0) {
      return salesData.hourlyBreakdown.map(h => ({
        label: `${hourLabel(h.hour)} – ${hourLabel(h.hour + 1)}`,
        orders: h.orders, dineIn: h.dineIn, parcel: h.parcel, total: h.total,
      }));
    }
    return (salesData.dailyBreakdown || []).map(d => ({
      label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      orders: d.orders, dineIn: d.dineIn, parcel: d.parcel, total: d.total,
    }));
  }, [salesData, period]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 pb-24 lg:p-6 lg:pb-8 space-y-6 animate-in fade-in duration-700">

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-lg lg:text-[1.7rem] font-black text-slate-900 tracking-tight uppercase">Analytics</h1>
          <p className="text-[8px] lg:text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em] mt-1">Sales Intelligence Dashboard</p>
        </div>

        {/* Export CSV dropdown */}
        <div className="relative" ref={csvRef}>
          <button
            onClick={() => { setCsvOpen(o => !o); setCsvStep(null); }}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-black text-slate-700 shadow-sm hover:shadow-md hover:border-slate-200 transition-all active:scale-95"
          >
            <Download size={16} className="text-orange-500" />
            Export CSV
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${csvOpen ? 'rotate-180' : ''}`} />
          </button>

          {csvOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-3 border-b border-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Download Report</p>
              </div>
              {csvStep !== 'custom' ? (
                csvPeriods.map(p => (
                  <button key={p.id}
                    onClick={() => p.id === 'custom' ? setCsvStep('custom') : handleExport(p.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors text-left"
                  >
                    {p.label}
                    {p.id === 'custom'
                      ? <ChevronDown size={13} className="text-slate-400 -rotate-90" />
                      : <Download size={13} className="text-slate-300" />}
                  </button>
                ))
              ) : (
                <div className="p-4 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Custom Range</p>
                  {[['From', customFrom, setCustomFrom], ['To', customTo, setCustomTo]].map(([lbl, val, setter]) => (
                    <div key={lbl}>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">{lbl}</label>
                      <input type="date" value={val} onChange={e => setter(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                    </div>
                  ))}
                  <button onClick={() => handleExport('custom', customFrom, customTo)}
                    disabled={!customFrom || !customTo}
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-40 hover:bg-orange-500 transition-colors active:scale-95">
                    Download
                  </button>
                  <button onClick={() => setCsvStep(null)} className="w-full text-[10px] text-slate-400 font-black uppercase tracking-wider hover:text-slate-600 pt-1">← Back</button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Period Filter ───────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-nowrap overflow-x-auto gap-2 pb-2 hide-scrollbar w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          {periods.map(p => (
            <button key={p.id} onClick={() => { setPeriod(p.id); setActiveCard(null); }}
              className={`shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                period === p.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'
              }`}>
              {p.label}
            </button>
          ))}
        </div>
        
        {period === 'custom' && (
          <div className="flex items-center gap-3 w-full max-w-sm animate-in slide-in-from-top-2 duration-300">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              title="Start Date"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
            <span className="text-sm font-black text-slate-300">to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              title="End Date"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-[2rem] p-8 animate-pulse">
              <div className="h-3 bg-slate-100 rounded-full w-24 mb-5" />
              <div className="h-8 bg-slate-100 rounded-full w-32 mb-2" />
              <div className="h-3 bg-slate-50 rounded-full w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* ── Stat Cards & Expandable Chart ──────────────── */}
          <div className={`grid gap-5 transition-all duration-500 ease-in-out ${activeCard ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-5'}`}>
            {statCards.map((card, i) => {
              if (activeCard && activeCard !== card.id) return null;
              const isActive = activeCard === card.id;

              return (
                <div key={card.id} className={`flex flex-col animate-in fade-in duration-500 ${isActive ? 'col-span-1' : ''}`}>
                  <button
                    onClick={() => setActiveCard(isActive ? null : card.id)}
                    className={`relative w-full text-left outline-none transition-all duration-300 group ${card.bg} border ${card.border} ${
                      isActive 
                        ? 'rounded-t-[2.5rem] p-8 border-b-slate-100 ring-2'
                        : 'rounded-[2rem] p-7 hover:-translate-y-1 hover:shadow-xl active:scale-95'
                    }`}
                    style={isActive ? { '--tw-ring-color': card.accent, boxShadow: `0 20px 60px ${card.accent}15` } : {}}
                  >
                    <div className="flex items-center justify-between mb-4 pr-10">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{card.label}</span>
                    </div>
                    <div className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/70 border border-white/80 flex items-center justify-center">
                      <card.icon size={18} className={`${card.color} transform transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
                    </div>
                    <div className="text-3xl font-black text-slate-900 tracking-tight mb-2">{card.value}</div>
                    <div className="text-sm font-bold text-slate-500">{card.sub}</div>

                    {!isActive && (
                      <div className="absolute bottom-5 right-6 opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <ArrowUpRight size={16} className={card.color} />
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute top-5 right-16">
                        <div className="w-8 h-8 rounded-full bg-slate-900/5 hover:bg-slate-900/10 flex items-center justify-center transition-colors">
                          <X size={14} className="text-slate-600" />
                        </div>
                      </div>
                    )}
                  </button>

                  {/* Chart Panel - Shown below the active card */}
                  {isActive && activeCardData && (
                    <div className="bg-white rounded-b-[2.5rem] p-8 shadow-2xl border border-slate-100 border-t-0 animate-in slide-in-from-top-2 fade-in relative z-0 mt-0">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">{activeCardData.chartTitle}</h2>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {activePeriodLabel} · {salesData?.totalOrders || 0} total orders
                          </p>
                        </div>
                      </div>

                      {activeCardData.chartType === 'hbar'
                        ? <AvgOrderChart key={`chart-${activeCardData.id}-${period}`} data={chartData[activeCardData.chartKey]} color={activeCardData.chartColor} />
                        : <LineChart key={`chart-${activeCardData.id}-${period}`} data={chartData[activeCardData.chartKey]} color={activeCardData.chartColor} label={activeCardData.id} />
                      }

                      {/* Chart footer stats */}
                      {chartSummary && (
                        <div className="mt-8 rounded-2xl bg-slate-50 grid grid-cols-3 divide-x divide-slate-200 border border-slate-100 overflow-hidden">
                          <div className="flex flex-col items-start px-7 py-5 gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Peak</span>
                            <span className="text-xl font-black leading-tight" style={{ color: activeCardData.chartColor }}>
                              {fmtS(chartSummary.peak.value)}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{chartSummary.peak.label}</span>
                          </div>
                          <div className="flex flex-col items-start px-7 py-5 gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                              {period === 'today' ? 'Hourly Avg' : 'Daily Avg'}
                            </span>
                            <span className="text-xl font-black text-slate-800 leading-tight">{fmtS(chartSummary.avg)}</span>
                            <span className="text-[10px] font-bold text-slate-400">per {period === 'today' ? 'hour' : 'day'}</span>
                          </div>
                          <div className="flex flex-col items-start px-7 py-5 gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Data Pts</span>
                            <span className="text-xl font-black text-slate-800 leading-tight">{chartSummary.count}</span>
                            <span className="text-[10px] font-bold text-slate-400">tracked</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Dine-in vs Parcel + Top Items ──────────────── */}
          {salesData && salesData.totalOrders > 0 && (
            <div className="grid grid-cols-12 gap-6">

              {/* ── Order Split — Premium Card ── */}
              <div className="col-span-12 lg:col-span-4 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col animate-stagger-1">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Order Split</h3>
                <DonutChart dineIn={salesData.dineInRevenue} parcel={salesData.parcelRevenue} />
                {/* Legend */}
                <div className="mt-7 rounded-2xl overflow-hidden border border-slate-100" style={{background:'#fafafa'}}>
                  {[
                    { label: 'Dine-in', val: salesData.dineInRevenue, from:'#FF6B3D', to:'#FF8C42', pct: Math.round((salesData.dineInRevenue / ((salesData.dineInRevenue + salesData.parcelRevenue) || 1)) * 100) },
                    { label: 'Parcel',  val: salesData.parcelRevenue,  from:'#818cf8', to:'#6366f1', pct: Math.round((salesData.parcelRevenue  / ((salesData.dineInRevenue + salesData.parcelRevenue) || 1)) * 100) },
                  ].map((row, ri) => (
                    <div key={row.label} className={`flex items-center justify-between px-5 py-4 ${ri === 0 ? 'border-b border-slate-100' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:`linear-gradient(135deg, ${row.from}, ${row.to})`}} />
                        <div>
                          <span className="text-xs font-black text-slate-700 block">{row.label}</span>
                          <span className="text-[10px] font-bold text-slate-400">{row.pct}% of revenue</span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-slate-900">{fmt(row.val)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Top Selling Items — Premium Volumetric Leaderboard ── */}
              {salesData.topItems?.length > 0 && (
                <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col animate-stagger-2">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20 group hover:rotate-12 transition-transform duration-300">
                        <Trophy size={18} className="text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none">Top Selling Items</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Performance by Revenue</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowAllItems(true)}
                        className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all"
                      >
                        View All
                      </button>
                      <div className="px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{salesData.topItems.length} Ranked</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    {salesData.topItems.map((item, i) => {
                      const pct = (item.revenue / (salesData.topItems[0]?.revenue || 1)) * 100;
                      const isTop = i < 3;
                      const themes = [
                        { fill: 'linear-gradient(90deg, #fffbeb, #fef3c7)', border: '#fde68a', text: '#d97706', badgeBg: '#fff', crown: '👑' }, // 1st
                        { fill: 'linear-gradient(90deg, #f8fafc, #f1f5f9)', border: '#e2e8f0', text: '#64748b', badgeBg: '#fff', crown: '⭐' }, // 2nd
                        { fill: 'linear-gradient(90deg, #fff7ed, #ffedd5)', border: '#fed7aa', text: '#c2410c', badgeBg: '#fff', crown: '🔥' }, // 3rd
                      ];
                      const theme = isTop ? themes[i] : { fill: '#f8fafc', border: '#f1f5f9', text: '#94a3b8', badgeBg: '#ffffff', crown: null };

                      return (
                        <div key={i} className={`relative group rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-stagger-${Math.min(i + 1, 5)}`} style={{ borderColor: theme.border }}>
                          {/* Background fill acts as the progress bar */}
                          <div className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out"
                               style={{ width: `${pct}%`, background: theme.fill, opacity: isTop ? 0.9 : 0.6 }} />

                          {/* Content Overlay */}
                          <div className="relative flex items-center justify-between p-4 sm:px-5 sm:py-4 bg-white/30 backdrop-blur-[1px]">
                            <div className="flex items-center gap-4 sm:gap-5">
                              {/* Rank Badge */}
                              <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black shadow-sm border"
                                   style={{ background: theme.badgeBg, color: theme.text, borderColor: theme.border }}>
                                <span className={theme.crown ? "text-sm leading-none" : "text-lg leading-none"}>
                                  {theme.crown ? theme.crown : `#${i + 1}`}
                                </span>
                                {theme.crown && <span className="text-[9px] mt-0.5 leading-none">#{i + 1}</span>}
                              </div>

                              {/* Item Details */}
                              <div className="flex flex-col">
                                <span className="text-sm sm:text-base font-bold text-slate-800 drop-shadow-sm truncate max-w-[120px] sm:max-w-[200px]">
                                  {item.name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: theme.text, opacity: 0.5 }}></span>
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.quantity} units</span>
                                </div>
                              </div>
                            </div>

                            {/* Revenue Stats */}
                            <div className="flex flex-col items-end">
                              <span className="text-lg sm:text-xl font-black text-slate-900 drop-shadow-sm tracking-tight">{fmt(item.revenue)}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{Math.round(pct)}% volume</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Breakdown Table ─────────────────────────────── */}
          {tableRows.length > 0 && (
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-slate-100 animate-slide-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <div className="px-8 py-6 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {period === 'today' ? 'Hourly Breakdown' : 'Daily Breakdown'}
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">{tableRows.length} slots</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-4">{period === 'today' ? 'Hour' : 'Date'}</th>
                      <th className="px-4 py-4 text-center">Orders</th>
                      <th className="px-4 py-4 text-right">Dine-in</th>
                      <th className="px-4 py-4 text-right">Parcel</th>
                      <th className="px-8 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {tableRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                        <td className="px-8 py-4 font-bold text-sm text-slate-700">{row.label}</td>
                        <td className="px-4 py-4 text-center">
                          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-black">{row.orders}</span>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-sm text-slate-500">{fmt(row.dineIn)}</td>
                        <td className="px-4 py-4 text-right font-bold text-sm text-slate-500">{fmt(row.parcel)}</td>
                        <td className="px-8 py-4 text-right font-black text-slate-900">{fmt(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="p-0 m-0">
                        <div className="px-8 py-5 bg-slate-900 flex justify-between items-center">
                          <span className="text-xs font-black text-white uppercase tracking-widest">Period Total</span>
                          <span className="text-xl font-black text-white">{fmt(salesData?.totalRevenue || 0)}</span>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* No data */}
          {tableRows.length === 0 && (
            <div className="bg-white rounded-[2.5rem] p-20 text-center shadow-sm border border-slate-100">
              <BarChart3 size={56} className="mx-auto text-slate-100 mb-4" />
              <p className="text-xl font-black text-slate-200">No data for this period</p>
              <p className="text-sm text-slate-300 font-bold mt-2">Complete some orders to see analytics here.</p>
            </div>
          )}
        </>
      )}

      {/* ── View All Items Modal ─────────────────────────────── */}
      {showAllItems && salesData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col border border-white/20">
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50 shrink-0">
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">Sales Inventory</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{activePeriodLabel} · {salesData.allItemsSold?.length || salesData.topItems?.length || 0} unique items</p>
              </div>
              <button onClick={() => { setShowAllItems(false); setItemSearch(''); }} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-500"/>
              </button>
            </div>
            
            <div className="px-10 py-4 border-b border-slate-50 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search items..." 
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold text-slate-700 focus:bg-white focus:border-orange-500/30 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 px-10 py-6 no-scrollbar">
              {!salesData.allItemsSold && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <Activity size={18} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-amber-800 uppercase tracking-tight">Full Inventory Loading...</p>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-0.5">Please restart your backend server to see all menu items.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-12 px-6 py-4 bg-slate-900 rounded-2xl mb-4 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
                <span className="col-span-6">Item Name</span>
                <span className="col-span-3 text-center">Qty Sold</span>
                <span className="col-span-3 text-right">Revenue</span>
              </div>
              <div className="space-y-1.5 pb-8">
                {(salesData.allItemsSold || salesData.topItems || [])
                  .filter(item => item.name.toLowerCase().includes(itemSearch.toLowerCase()))
                  .map((item, idx) => {
                    const hasSales = item.quantity > 0;
                    return (
                      <div key={idx} className={cn(
                        "grid grid-cols-12 px-6 py-5 items-center rounded-[1.5rem] transition-all group",
                        hasSales ? "hover:bg-slate-50" : "opacity-40 grayscale"
                      )}>
                        <div className="col-span-6 flex flex-col">
                          <span className={cn("text-[15px] font-bold transition-colors", hasSales ? "text-slate-800 group-hover:text-orange-500" : "text-slate-500")}>
                            {item.name}
                          </span>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">
                            {hasSales ? 'Verified Sale' : 'No Sales Yet'}
                          </span>
                        </div>
                        <span className={cn(
                          "col-span-3 text-center text-[15px] font-black py-1 rounded-xl transition-colors",
                          hasSales ? "text-slate-500 bg-slate-50 group-hover:bg-white" : "text-slate-400 bg-transparent"
                        )}>
                          {item.quantity}
                        </span>
                        <span className={cn(
                          "col-span-3 text-right text-[17px] font-black tracking-tight",
                          hasSales ? "text-slate-900" : "text-slate-300"
                        )}>
                          {fmtM(item.revenue)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const fmtM = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

export default SalesReport;
