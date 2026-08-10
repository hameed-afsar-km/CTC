"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle,
  Loader2,
  QrCode,
  XCircle,
} from "lucide-react";
import { displayJoinRole } from "@/lib/join-roles";

interface VerifyResult {
  valid: boolean;
  name?: string;
  roles?: string[];
  memberSince?: string | null;
  version?: number;
  error?: string;
}

function VerifyPageContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!code) {
      const t = window.setTimeout(() => {
        setChecking(false);
        setError("No membership code provided. Scan the QR on a member's card.");
      }, 0);
      return () => window.clearTimeout(t);
    }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/member/verify?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as VerifyResult | null;
        if (cancelled) return;
        if (data?.valid) {
          setResult(data);
        } else {
          setResult({ valid: false, error: data?.error ?? undefined });
        }
      } catch {
        if (!cancelled) {
          setError("Could not reach the verification service. Check your connection.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="min-h-screen bg-[#06090c] text-white font-syne relative">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#34d399]/10 blur-[160px]" />
        <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-[#059669]/10 blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-mint hover:text-mint-light mb-10 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Homepage
        </Link>

        <header className="mb-10">
          <div className="text-shine text-[10px] font-mono uppercase tracking-widest font-medium mb-4">
            Membership Check
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Verify Member
          </h1>
          <p className="text-sm text-gray-400 mt-3 max-w-md leading-relaxed">
            Scan a member&apos;s QR code to confirm their membership with Crescent
            Technocrats Club.
          </p>
        </header>

        <div className="rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-8 sm:p-10">
          {checking ? (
            <div className="flex flex-col items-center text-center py-10">
              <Loader2 className="w-8 h-8 text-mint animate-spin" />
              <p className="text-sm text-gray-400 font-mono mt-4">Verifying code…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-5">
                <QrCode className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white">No code to verify</h2>
              <p className="text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">{error}</p>
            </div>
          ) : result?.valid ? (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-mint/15 border border-mint/30 flex items-center justify-center mb-5">
                <CheckCircle className="w-8 h-8 text-mint" />
              </div>
              <h2 className="text-2xl font-bold text-white">Membership Verified</h2>
              <div className="mt-4 flex items-center gap-2 rounded-full bg-mint/10 border border-mint/30 px-4 py-1.5">
                <BadgeCheck className="w-4 h-4 text-mint" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-mint">
                  Valid member of CTC
                </span>
              </div>
              <p className="text-lg font-bold text-white mt-6">{result.name}</p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
                {(result.roles ?? []).map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-full bg-mint/10 border border-mint/30 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-mint"
                  >
                    {displayJoinRole(role)}
                  </span>
                ))}
              </div>
              {result.memberSince && (
                <p className="text-xs text-gray-500 font-mono mt-4">
                  Member since{" "}
                  {new Date(result.memberSince).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                  })}
                </p>
              )}
              <p className="text-[10px] text-gray-600 font-mono mt-6">
                Card v{result.version} · verified live
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mb-5">
                <XCircle className="w-8 h-8 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Invalid or Revoked Code</h2>
              <p className="text-sm text-gray-400 mt-2 max-w-sm leading-relaxed">
                {result?.error ||
                  "This code is not a valid CTC membership card, or it has been revoked."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageContent />
    </Suspense>
  );
}
