"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import {
  ArrowLeft,
  Calendar,
  Users,
  CalendarClock,
  Shield,
  Image as ImageIcon,
  LogOut,
  Loader2,
  Lock,
  LogIn,
  History,
  Crosshair,
} from "lucide-react";
import { AdminProvider, useAdmin } from "@/components/admin/admin-context";
import { scopesForRole, ROLE_LABELS } from "@/lib/roles";
import type { AdminScope } from "@/lib/roles";
import EventsPanel from "@/components/admin/events-panel";
import ApplicationsPanel from "@/components/admin/applications-panel";
import HostitPanel from "@/components/admin/hostit-panel";
import UsersPanel from "@/components/admin/users-panel";
import GalleryPanel from "@/components/admin/gallery-panel";
import LogsPanel from "@/components/admin/logs-panel";
import FocusPanel from "@/components/admin/focus-panel";

type Tab = AdminScope;

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: "events", label: "Events", icon: Calendar },
  { id: "applications", label: "Join Applications", icon: Users },
  { id: "hostit", label: "Host'It", icon: CalendarClock },
  { id: "users", label: "Users & Roles", icon: Shield },
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  { id: "focus", label: "Focus Ticker", icon: Crosshair },
  { id: "logs", label: "Activity Logs", icon: History },
];

function CursorOverlay() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const macHoverRef = useRef(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [macHover, setMacHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const t = window.setTimeout(() => setIsTouchDevice(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener("change", handler);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorVisible(true);
      if (cursorRef.current) {
        gsap.to(cursorRef.current, {
          x: e.clientX,
          y: e.clientY,
          xPercent: -50,
          yPercent: -50,
          duration: 0.08,
          ease: "power2.out",
        });
      }
      const targetEl = e.target as Element | null;
      const overInteractive =
        !!targetEl &&
        typeof targetEl.closest === "function" &&
        !!targetEl.closest("a[href], button, [role='button'], input, textarea, select");
      if (overInteractive !== macHoverRef.current) {
        macHoverRef.current = overInteractive;
        setMacHover(overInteractive);
      }
    };
    const handleMouseLeave = () => setCursorVisible(false);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    if (!cursorRef.current) return;
    gsap.to(cursorRef.current, {
      rotation: macHover ? -40 : 0,
      duration: 0.3,
      ease: "power2.out",
    });
  }, [macHover]);

  if (isTouchDevice) return null;

  return (
    <div
      ref={cursorRef}
      className="fixed top-0 left-0 w-12 h-12 pointer-events-none z-[999] transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2"
      style={{ opacity: cursorVisible ? 1 : 0 }}
    >
      <Image
        src="/assets/cursor.png"
        alt=""
        width={48}
        height={48}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}

function DashboardShell() {
  const { status, user, signIn, signOut } = useAdmin();
  const [tab, setTab] = useState<Tab>("events");
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const visibleTabs = useMemo(
    () => TABS.filter((t) => scopesForRole(user?.role).includes(t.id)),
    [user?.role]
  );

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === tab)) {
      setTab(visibleTabs[0].id);
    }
  }, [visibleTabs, tab]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#06090c] text-white">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span className="text-xs font-mono text-gray-400">Verifying session...</span>
      </div>
    );
  }

  if (status === "signed-out") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#06090c] text-white px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 border border-emerald-500/30">
            <Lock className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">CTC Admin Dashboard</h1>
          <p className="text-sm text-gray-400 max-w-sm">
            Restricted area. Sign in with your authorized Google account to continue.
          </p>
        </div>
        <button
          onClick={async () => {
            setSigningIn(true);
            setSignInError(null);
            try {
              await signIn();
            } catch (err) {
              setSignInError(
                err instanceof Error && err.message
                  ? err.message
                  : "Sign in failed. Please try again."
              );
            } finally {
              setSigningIn(false);
            }
          }}
          disabled={signingIn}
          className="inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-black font-bold text-sm shadow-[0_0_30px_rgba(52,211,153,0.2)] hover:shadow-[0_0_40px_rgba(52,211,153,0.4)] transition-all disabled:opacity-60"
        >
          {signingIn ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          Sign in with Google
        </button>
        {signInError && (
          <p className="max-w-sm text-center text-xs font-mono text-rose-300 leading-relaxed">
            {signInError}
          </p>
        )}
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Homepage
        </Link>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#06090c] text-white px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/15 border border-rose-500/30">
          <Lock className="w-7 h-7 text-rose-400" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-extrabold">Access Denied</h1>
          <p className="mt-2 text-sm text-gray-400 max-w-sm">
            Your account is not authorized to access the dashboard.
          </p>
        </div>
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06090c] text-white font-syne">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06090c]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate">
                CTC Admin Dashboard
              </h1>
              <p className="hidden sm:block text-[10px] font-mono text-gray-500 truncate">
                {user?.email}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            {user?.role && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-300">
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user?.picture ? (
              <img
                src={user.picture}
                alt=""
                className="h-9 w-9 rounded-full border border-white/20 object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {(user?.name ?? "A")[0]}
              </div>
            )}
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                tab === id
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {tab === "events" && <EventsPanel />}
        {tab === "applications" && <ApplicationsPanel />}
        {tab === "hostit" && <HostitPanel />}
        {tab === "users" && <UsersPanel />}
        {tab === "gallery" && <GalleryPanel />}
        {tab === "focus" && <FocusPanel />}
        {tab === "logs" && <LogsPanel />}
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminProvider>
      <CursorOverlay />
      <DashboardShell />
    </AdminProvider>
  );
}
