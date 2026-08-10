"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from "firebase/auth";
import {
  ArrowLeft,
  BadgeCheck,
  Info,
  Loader2,
  LogIn,
  LogOut,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { getClientAuth, getCurrentIdToken } from "@/lib/firebase-client";
import MemberCard from "@/components/MemberCard";

const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;

function authErrorCode(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return "";
}

interface CardData {
  code: string;
  name: string;
  roles: string[];
  issuedAt: string | null;
}

export default function MemberPage() {
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-out" | "ready">("loading");
  const [authUser, setAuthUser] = useState<{ email: string; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const [card, setCard] = useState<CardData | null>(null);
  const [cardState, setCardState] = useState<"loading" | "missing" | "ready">("loading");
  const [cardError, setCardError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setSigningIn(true);
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: "crescent.education" });
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = authErrorCode(err);
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code === "auth/unauthorized-domain") {
        setAuthError(
          "Google sign-in is not allowed on this domain yet. Add it in the Firebase Console (Authentication → Settings → Authorized domains)."
        );
      } else if (code === "auth/popup-closed-by-user") {
        setAuthError("The sign-in window was closed before you finished.");
      } else {
        setAuthError("Something went wrong while signing in. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const loadCard = useCallback(async (email: string) => {
    setCardState("loading");
    setCardError(null);
    const token = await getCurrentIdToken();
    if (!token) {
      setCardState("missing");
      return;
    }
    try {
      const res = await fetch("/api/member/code", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setAuthStatus("signed-out");
        setAuthUser(null);
        setCardState("loading");
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok && data?.code) {
        setCard({
          code: data.code,
          name: data.name || email,
          roles: Array.isArray(data.roles) ? data.roles : [],
          issuedAt: data.issuedAt ?? null,
        });
        setCardState("ready");
      } else {
        setCardState("missing");
      }
    } catch {
      setCardState("missing");
      setCardError("Could not load your member card. Please try again.");
    }
  }, []);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setCard(null);
      setCardState("loading");
      setCardError(null);
      if (!firebaseUser || !firebaseUser.email) {
        setAuthStatus("signed-out");
        setAuthUser(null);
        return;
      }
      const email = firebaseUser.email.toLowerCase();
      if (!COLLEGE_EMAIL_RE.test(email)) {
        setAuthUser(null);
        setAuthError("Please sign in with your @crescent.education Google account.");
        setAuthStatus("signed-out");
        firebaseSignOut(auth).catch(() => {});
        return;
      }
      setAuthError(null);
      setAuthUser({ email, name: firebaseUser.displayName || "" });
      setAuthStatus("ready");
      void loadCard(email);
    });
    return unsubscribe;
  }, [loadCard]);

  const handleSignOut = () => {
    firebaseSignOut(getClientAuth()).catch(() => {});
  };

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
            Member Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            My Member Card
          </h1>
          <p className="text-sm text-gray-400 mt-3 max-w-md leading-relaxed">
            Show this card at club events and sessions. Scan your QR code to verify your
            membership instantly.
          </p>
          <p className="text-xs text-gray-500 font-mono mt-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-mint" />
            Verified with your college Google account (@crescent.education).
          </p>
        </header>

        {authStatus === "loading" ? (
          <div className="rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-10">
            <div className="flex flex-col items-center text-center py-6">
              <Loader2 className="w-8 h-8 text-mint animate-spin" />
              <p className="text-sm text-gray-400 font-mono mt-4">Checking your session…</p>
            </div>
          </div>
        ) : authStatus === "signed-out" ? (
          <div className="rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-8 sm:p-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-mint/15 border border-mint/30 flex items-center justify-center mb-6">
                <QrCode className="w-8 h-8 text-mint" />
              </div>
              <h2 className="text-2xl font-bold text-white">College account required</h2>
              <p className="text-sm text-gray-400 mt-3 max-w-sm leading-relaxed">
                Sign in with your official college Google account to view your membership
                card. Only @crescent.education accounts are accepted.
              </p>
              {authError && (
                <div className="mt-5 w-full p-3.5 rounded-xl text-xs font-mono flex items-start gap-2 bg-amber-950/50 border border-amber-500/40 text-amber-300 text-left">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  {authError}
                </div>
              )}
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={signingIn}
                className="mt-7 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {signingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {signingIn ? "Signing in…" : "Sign in with College Google Account"}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-6 sm:p-10">
            {authUser && (
              <div className="flex items-center justify-between gap-3 mb-8 pb-6 border-b border-white/10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-mint/15 border border-mint/30 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-5 h-5 text-mint" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{authUser.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{authUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white text-xs font-mono uppercase tracking-wider transition-all shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            )}

            <div className="flex flex-col items-center">
              {cardState === "loading" ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <Loader2 className="w-8 h-8 text-mint animate-spin" />
                  <p className="text-sm text-gray-400 font-mono">Loading your card…</p>
                </div>
              ) : cardState === "missing" ? (
                <div className="flex flex-col items-center justify-center text-center py-16 space-y-5">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                    <Info className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="max-w-sm">
                    <h3 className="text-lg font-bold text-white">No card issued yet</h3>
                    <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">
                      Your membership QR code is generated once your application is approved
                      by the team. If you were just approved, sign out and back in — or check
                      again shortly.
                    </p>
                  </div>
                  {cardError && (
                    <p className="text-xs font-mono text-red-400">{cardError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (authUser) void loadCard(authUser.email);
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
                  >
                    <Loader2 className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </div>
              ) : (
                card && (
                  <MemberCard
                    name={card.name}
                    roles={card.roles}
                    code={card.code}
                    issuedAt={card.issuedAt}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
