"use client";

import React from "react";

export function SkeletonCardGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-20" />
            <div className="h-4 bg-slate-100 rounded-full w-16" />
          </div>
          <div className="h-5 bg-slate-200 rounded w-3/4" />
          <div className="h-3.5 bg-slate-100 rounded w-1/2" />
          <div className="h-16 bg-slate-50 rounded-lg border border-slate-100" />
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div className="h-4 bg-slate-100 rounded w-24" />
            <div className="h-6 bg-slate-200 rounded-lg w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs animate-pulse">
      <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-slate-200 rounded flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 rounded ${c === 0 ? "bg-slate-200 flex-2" : "bg-slate-100 flex-1"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetricsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
          <div className="h-3 bg-slate-200 rounded w-20" />
          <div className="h-6 bg-slate-300 rounded w-12" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="space-y-2 animate-pulse pb-4 border-b border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-6 bg-slate-200 rounded-lg w-48" />
          <div className="h-4 bg-slate-100 rounded w-72" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 bg-slate-100 rounded-xl w-24" />
          <div className="h-9 bg-slate-200 rounded-xl w-32" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonKanban({ columns = 5 }: { columns?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3.5 overflow-x-auto pb-4">
        {Array.from({ length: columns }).map((_, colIdx) => (
          <div
            key={colIdx}
            className="w-[260px] xl:w-full shrink-0 xl:shrink rounded-xl p-3 bg-slate-100/70 border border-slate-200/80 min-h-[480px] flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="h-4 bg-slate-200 rounded w-24" />
              <div className="h-4 bg-slate-200 rounded-full w-6" />
            </div>
            {Array.from({ length: colIdx % 2 === 0 ? 2 : 3 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-2xs space-y-3 h-[180px] flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 bg-slate-200 rounded w-16" />
                    <div className="h-3.5 bg-slate-100 rounded w-12" />
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="h-5 bg-slate-100 rounded-full w-20" />
                  <div className="h-4 bg-slate-100 rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonWorkspace() {
  return (
    <div className="space-y-6 animate-pulse">
      <SkeletonPageHeader />
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-slate-100 rounded-lg w-24 shrink-0" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-6 min-h-[360px] space-y-4 shadow-2xs">
        <div className="h-5 bg-slate-200 rounded w-1/3" />
        <div className="h-4 bg-slate-100 rounded w-2/3" />
        <div className="h-32 bg-slate-50 rounded-xl border border-slate-100 mt-4" />
      </div>
    </div>
  );
}

