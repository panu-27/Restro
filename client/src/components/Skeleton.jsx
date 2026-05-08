/**
 * Skeleton – Reusable shimmer placeholder blocks.
 *
 * Usage:
 *   <Sk className="h-4 w-32 rounded-lg" />           // basic block
 *   <Sk.Card>…</Sk.Card>                              // white card wrapper
 *
 * The shimmer CSS is injected once via a <style> tag on first render.
 */
import React from 'react';

// ── Core shimmer block ────────────────────────────────────────────────────────
export function Sk({ className = '', style = {} }) {
  return (
    <div
      className={`sk-shimmer rounded-lg bg-slate-100 ${className}`}
      style={style}
    />
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
Sk.Card = function SkCard({ className = '', children }) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-100 p-4 ${className}`}>
      {children}
    </div>
  );
};

// ── Global shimmer keyframe (injected once) ───────────────────────────────────
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes sk-wave {
        0%   { background-position: -400px 0; }
        100% { background-position:  400px 0; }
      }
      .sk-shimmer {
        background: linear-gradient(
          90deg,
          #f1f5f9 25%,
          #e8edf3 50%,
          #f1f5f9 75%
        );
        background-size: 800px 100%;
        animation: sk-wave 1.4s ease-in-out infinite;
      }
    `}</style>
  );
}

// ── Pre-built skeleton layouts ────────────────────────────────────────────────

/** 3 metric stat cards */
export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {[...Array(3)].map((_, i) => (
        <Sk.Card key={i} className="min-h-[140px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Sk className="w-11 h-11 rounded-2xl" />
              <div className="space-y-2">
                <Sk className="h-2.5 w-20" />
                <Sk className="h-3.5 w-28" />
              </div>
            </div>
            <Sk className="h-6 w-16 rounded-xl" />
          </div>
          <div className="flex items-baseline gap-3 mt-4">
            <Sk className="h-10 w-20" />
            <Sk className="h-3 w-16" />
          </div>
        </Sk.Card>
      ))}
    </div>
  );
}

/** Revenue bar chart placeholder */
export function ChartSkeleton() {
  const barHeights = [55, 75, 40, 90, 65, 30, 80];
  return (
    <Sk.Card className="min-h-[360px] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-8 w-32" />
          <Sk className="h-3 w-24" />
        </div>
        <Sk className="h-8 w-28 rounded-xl" />
      </div>
      {/* Fake bars */}
      <div className="flex items-end gap-2 flex-1 px-4 pb-6">
        {barHeights.map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <Sk className="w-full rounded-lg" style={{ height: `${h}%` }} />
            <Sk className="h-2.5 w-6" />
          </div>
        ))}
      </div>
    </Sk.Card>
  );
}

/** Two small financial metric cards stacked */
export function FinancialCardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[...Array(2)].map((_, i) => (
        <Sk.Card key={i} className="flex-1 min-h-[165px] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <Sk className="w-10 h-10 rounded-xl" />
            <Sk className="h-6 w-14 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Sk className="h-2.5 w-28" />
            <Sk className="h-8 w-36" />
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
            <Sk className="h-2 w-full rounded-full" />
          </div>
        </Sk.Card>
      ))}
    </div>
  );
}

/** Recent orders table rows */
export function OrderTableSkeleton({ rows = 5 }) {
  return (
    <Sk.Card className="overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-2">
          <Sk className="h-5 w-36" />
          <Sk className="h-2.5 w-52" />
        </div>
        <Sk className="h-9 w-24 rounded-2xl" />
      </div>
      <div className="space-y-0 divide-y divide-slate-50">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-4 px-2">
            <Sk className="h-4 w-12" />
            <Sk className="h-4 w-20" />
            <Sk className="h-5 w-16 rounded-lg" />
            <Sk className="h-4 w-14" />
            <Sk className="h-4 w-10 ml-auto" />
            <Sk className="h-5 w-16" />
          </div>
        ))}
      </div>
    </Sk.Card>
  );
}

/** Full dashboard skeleton */
export function DashboardSkeleton() {
  return (
    <div className="flex-1 px-2 lg:px-3 py-2 w-full max-w-[1800px] mx-auto space-y-3">
      <SkeletonStyles />
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2">
          <Sk className="h-8 w-36" />
          <Sk className="h-2.5 w-52" />
        </div>
        <Sk className="h-9 w-28 rounded-2xl" />
      </div>
      <StatCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-1">
        <div className="col-span-1 lg:col-span-8">
          <ChartSkeleton />
        </div>
        <div className="col-span-1 lg:col-span-4">
          <FinancialCardsSkeleton />
        </div>
      </div>
      <OrderTableSkeleton rows={5} />
    </div>
  );
}

/** TableGrid skeleton — mimics the card grid */
export function TableGridSkeleton() {
  return (
    <section className="p-4 lg:p-6">
      <SkeletonStyles />
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <Sk className="h-7 w-24" />
          <Sk className="h-2.5 w-32" />
        </div>
        <div className="flex gap-3">
          <Sk className="h-10 w-36 rounded-xl" />
          <Sk className="h-10 w-36 rounded-xl" />
          <Sk className="h-10 w-28 rounded-2xl" />
        </div>
      </div>
      {/* Table cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2.5 lg:gap-4">
        {[...Array(16)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-[1rem] lg:rounded-xl border border-slate-100 shadow-sm h-[96px] lg:h-[150px] p-3 flex flex-col justify-between"
          >
            <div className="flex justify-end">
              <Sk className="h-4 w-14 rounded-full" />
            </div>
            <div className="flex justify-center flex-1 items-center">
              <Sk className="w-[40px] h-[40px] lg:w-[62px] lg:h-[62px] rounded-xl" />
            </div>
            <div className="flex justify-between items-center">
              <Sk className="h-3 w-10" />
              <Sk className="h-3 w-8" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** OrderHistory skeleton — list rows */
export function OrderHistorySkeleton() {
  return (
    <div className="min-h-screen bg-white p-4 lg:p-6 space-y-4">
      <SkeletonStyles />
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Sk className="h-7 w-36" />
          <Sk className="h-3 w-24" />
        </div>
        <Sk className="h-7 w-28 rounded-md" />
      </div>
      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Sk className="h-8 w-16 rounded-md" />
        <Sk className="h-8 w-20 rounded-md" />
        <Sk className="h-8 w-20 rounded-md" />
        <Sk className="h-8 w-28 rounded-md ml-auto" />
      </div>
      {/* Rows */}
      {[...Array(2)].map((_, s) => (
        <div key={s} className="space-y-1">
          <div className="flex items-center gap-2 py-3 border-b border-slate-100 mb-2">
            <Sk className="h-4 w-4 rounded" />
            <Sk className="h-4 w-28" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-50 px-1">
              <Sk className="h-4 w-14" />
              <Sk className="h-4 w-24" />
              <Sk className="h-5 w-20 rounded" />
              <Sk className="h-4 w-16" />
              <Sk className="h-4 w-12 ml-auto" />
              <Sk className="h-5 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
