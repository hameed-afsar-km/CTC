"use client";

import type { ReactNode } from "react";

export type SubmissionStatus = "pending" | "approved" | "rejected";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-white/10 text-gray-300 border-white/20";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PanelCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-white/10 bg-[#0d1317] p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

export function PanelHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-white/10">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-10 text-center text-gray-400 font-mono text-sm">{message}</div>
  );
}

export function LoadingState() {
  return <div className="p-10 text-center text-gray-400 font-mono text-sm">Loading...</div>;
}

export const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors";

export const labelCls = "block text-xs font-mono text-gray-400 mb-1";
