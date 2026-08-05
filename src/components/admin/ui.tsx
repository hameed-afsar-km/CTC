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

export function DecisionModal({
  title,
  description,
  confirmLabel,
  confirmTone = "danger",
  busy,
  onCancel,
  onConfirm,
  children,
}: {
  title: string;
  description?: string;
  confirmLabel: string;
  confirmTone?: "danger" | "success";
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const confirmCls =
    confirmTone === "danger"
      ? "bg-rose-500 hover:bg-rose-400 text-white"
      : "bg-emerald-400 hover:bg-emerald-300 text-black";
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="absolute inset-0" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0d1317] shadow-[0_20px_80px_rgba(0,0,0,0.9)] overflow-hidden">
        <div className="p-6 pb-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {description && <p className="mt-1 text-xs text-gray-400 leading-relaxed">{description}</p>}
        </div>
        <div className="p-6">{children}</div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-0">
          <button
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-60 ${confirmCls}`}
          >
            {busy ? (
              <LoaderSpin />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoaderSpin() {
  return (
    <span className="w-4 h-4 inline-block border-2 border-current border-t-transparent rounded-full animate-spin" />
  );
}

export const inputCls =
  "w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-sm focus:outline-none focus:border-emerald-400 transition-colors";

export const labelCls = "block text-xs font-mono text-gray-400 mb-1";
