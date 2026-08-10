"use client";

import { useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BadgeCheck, Download, ShieldCheck } from "lucide-react";
import { displayJoinRole } from "@/lib/join-roles";

// Digital membership card shown to members and admins. Encodes the verification
// URL into a QR code so gate staff can scan it and get a verdict instantly.
export default function MemberCard({
  name,
  roles,
  code,
  issuedAt,
}: {
  name: string;
  roles: string[];
  code: string;
  issuedAt?: string | null;
}) {
  const qrRef = useRef<HTMLDivElement>(null);

  const verifyUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/member/verify?code=${encodeURIComponent(code)}`;
  }, [code]);

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ctc-member-${name.replace(/\s+/g, "-").toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayRoles = roles.length > 0 ? roles : ["member"];

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-[#0d1317] shadow-2xl">
      {/* Card header */}
      <div className="relative bg-gradient-to-r from-mint/25 via-emerald-500/15 to-transparent px-6 py-5 border-b border-white/10">
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-mint">
          Technocrats Club
        </p>
        <p className="text-xs text-gray-400 font-mono mt-1">Crescent Membership Card</p>
        <BadgeCheck className="absolute top-5 right-5 w-5 h-5 text-mint" />
      </div>

      {/* QR */}
      <div className="px-6 py-6 flex flex-col items-center">
        <div
          ref={qrRef}
          className="rounded-2xl bg-white p-4"
          title="Scan to verify membership"
        >
          {verifyUrl ? (
            <QRCodeSVG value={verifyUrl} size={188} level="M" marginSize={0} />
          ) : (
            <div className="w-[188px] h-[188px] bg-gray-100 animate-pulse" />
          )}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-gray-300 text-xs font-bold uppercase tracking-wider transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Save QR
        </button>
      </div>

      {/* Member identity */}
      <div className="px-6 pb-6">
        <p className="text-lg font-bold text-white truncate">{name}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {displayRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-full bg-mint/10 border border-mint/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-mint"
            >
              <ShieldCheck className="w-3 h-3" />
              {displayJoinRole(role)}
            </span>
          ))}
        </div>
        {issuedAt && (
          <p className="mt-3 text-[10px] font-mono text-gray-500">
            Issued{" "}
            {new Date(issuedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
