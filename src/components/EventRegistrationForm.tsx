"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Ticket,
  ExternalLink,
  Loader2,
  LogOut,
  CalendarPlus,
  Download,
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { getClientAuth, getCurrentIdToken } from "@/lib/firebase-client";
import { cleanStudentName, DEGREES, BRANCHES, YEARS, SECTIONS, isValidUrl } from "@/lib/applications";
import {
  extractRegisterNumber,
  type EventRegistration,
} from "@/lib/registrations";
import type { ClubEvent } from "@/lib/events";
import { defaultEvents } from "@/lib/events";

const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;
const PHONE_RE = /^[+]?[\d\s()-]{10,15}$/;

const labelCls = "block text-xs font-mono font-medium text-gray-300 mb-1.5 uppercase tracking-wider";
const inputCls =
  "w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-colors";
const selectCls = `${inputCls} appearance-none pr-10`;

interface AuthUser {
  email: string;
  name: string;
  picture: string | null;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function buildCalendarUrl(event: ClubEvent): string {
  const title = encodeURIComponent(event.title);
  const details = encodeURIComponent(
    `${event.description}\n\nOrganized by Crescent Technocrats Club.`
  );
  const location = encodeURIComponent(event.venue || "Crescent Campus");

  try {
    const start = new Date(event.date);
    const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
    const startIso = start.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endIso = end.toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startIso}/${endIso}`;
  } catch {
    return "#";
  }
}

interface Props {
  initialSlugOrId?: string;
}

export default function EventRegistrationForm({ initialSlugOrId }: Props) {
  const [events, setEvents] = useState<ClubEvent[]>(defaultEvents);
  const [activeEvent, setActiveEvent] = useState<ClubEvent | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventNotFound, setEventNotFound] = useState(false);

  // Auth State
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<"checking" | "signed-in" | "signed-out">("checking");
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  // Registration State
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<EventRegistration | null>(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [closedReason, setClosedReason] = useState<string | null>(null);

  // Core Form State
  const [coreForm, setCoreForm] = useState({
    fullName: "",
    registerNumber: "",
    contactNumber: "",
    degree: "B.Tech",
    branch: "Computer Science & Engineering",
    section: "A",
    year: "2nd Year",
    consented: true,
  });

  // Dynamic Custom Field Responses map (field.id -> value)
  const [customResponses, setCustomResponses] = useState<Record<string, string | boolean | number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // WhatsApp Popup Modal State (collapsible pop up shown on registration)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [isModalCollapsed, setIsModalCollapsed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showWhatsAppModal) {
        setShowWhatsAppModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showWhatsAppModal]);

  const passRef = useRef<HTMLDivElement>(null);

  // Download pass as branded high-res image
  const handleDownloadPassImage = async () => {
    if (!existingRegistration || !activeEvent) return;
    setIsDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const width = 800;
      const height = 1120;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // 1. Background Gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
      bgGradient.addColorStop(0, "#0c151c");
      bgGradient.addColorStop(0.4, "#070c10");
      bgGradient.addColorStop(1, "#040709");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Outer Border
      ctx.strokeStyle = "rgba(52, 211, 153, 0.45)";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Inner subtle border
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(28, 28, width - 56, height - 56);

      // 2. Club Header
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("CRESCENT TECHNOCRATS CLUB", width / 2, 70);

      // Pass Type Badge
      ctx.fillStyle = "rgba(52, 211, 153, 0.15)";
      ctx.fillRect(width / 2 - 130, 85, 260, 30);
      ctx.strokeStyle = "rgba(52, 211, 153, 0.4)";
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 130, 85, 260, 30);
      ctx.fillStyle = "#a7f3d0";
      ctx.font = "bold 12px monospace";
      ctx.fillText("OFFICIAL DIGITAL PASS", width / 2, 105);

      // 3. Event Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(activeEvent.title, width / 2, 155);

      // Event Date & Venue
      ctx.fillStyle = "#9ca3af";
      ctx.font = "14px monospace";
      const dateStr = `${formatDate(activeEvent.date)} • ${formatTime(activeEvent.date) || "10:00 AM"}`;
      ctx.fillText(dateStr, width / 2, 185);
      ctx.fillStyle = "#6ee7b7";
      ctx.fillText(`📍 ${activeEvent.venue || "Campus Lab"}`, width / 2, 210);

      // Dashed Divider
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(50, 235);
      ctx.lineTo(width - 50, 235);
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. Attendee Details Card
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(50, 255, width - 100, 160);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.strokeRect(50, 255, width - 100, 160);

      ctx.textAlign = "left";
      // Attendee Name
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px monospace";
      ctx.fillText("ATTENDEE NAME", 75, 285);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(existingRegistration.fullName, 75, 312);

      // Register Number
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px monospace";
      ctx.fillText("REGISTER NUMBER (RRN)", 450, 285);
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 16px monospace";
      ctx.fillText(existingRegistration.registerNumber, 450, 312);

      // Department
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px monospace";
      ctx.fillText("DEPARTMENT / BRANCH", 75, 355);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "14px sans-serif";
      ctx.fillText(existingRegistration.branch, 75, 378);

      // Year & Section
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px monospace";
      ctx.fillText("YEAR & SECTION", 450, 355);
      ctx.fillStyle = "#e5e7eb";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${existingRegistration.year} • Sec ${existingRegistration.section}`, 450, 378);

      // 5. Draw QR Code
      const qrCanvas = document.getElementById("pass-qr-canvas") as HTMLCanvasElement;
      const qrSize = 240;
      const qrX = width / 2 - qrSize / 2;
      const qrY = 445;

      // QR White Container Box
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
      ctx.strokeStyle = "rgba(52, 211, 153, 0.5)";
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);

      if (qrCanvas) {
        ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
      }

      // 6. Unique Ticket Code Badge (DIRECTLY BELOW THE QR CODE)
      const codeBoxY = qrY + qrSize + 36;
      const codeBoxHeight = 60;
      const codeBoxWidth = 380;
      const codeBoxX = width / 2 - codeBoxWidth / 2;

      ctx.fillStyle = "#0a1217";
      ctx.fillRect(codeBoxX, codeBoxY, codeBoxWidth, codeBoxHeight);
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2;
      ctx.strokeRect(codeBoxX, codeBoxY, codeBoxWidth, codeBoxHeight);

      ctx.textAlign = "center";
      ctx.fillStyle = "#9ca3af";
      ctx.font = "11px monospace";
      ctx.fillText("UNIQUE TICKET CODE", width / 2, codeBoxY + 20);

      ctx.fillStyle = "#34d399";
      ctx.font = "bold 26px monospace";
      ctx.fillText(existingRegistration.ticketCode, width / 2, codeBoxY + 48);

      // 7. Footer Instructions
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px monospace";
      ctx.fillText("Present this QR Code or Ticket Code at the front desk for door check-in", width / 2, height - 120);
      ctx.fillStyle = "#4b5563";
      ctx.font = "11px monospace";
      ctx.fillText(`Pass ID: ${existingRegistration.id}`, width / 2, height - 95);
      ctx.fillText("Crescent Institute of Science and Technology • Crescent Technocrats Club", width / 2, height - 70);

      // 8. Trigger Download
      const dataUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `CTC-PASS-${existingRegistration.ticketCode || existingRegistration.registerNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error("Failed to generate pass image:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // 1. Load All Events
  useEffect(() => {
    let cancelled = false;
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.events) && data.events.length > 0) {
            setEvents(data.events);
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic events, using defaults:", err);
      } finally {
        if (!cancelled) setLoadingEvents(false);
      }
    }
    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Resolve Active Event — locked to slug, no switching allowed
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (loadingEvents) return;
    if (events.length === 0) {
      setEventNotFound(true);
      return;
    }

    if (!initialSlugOrId) {
      // No slug provided: invalid registration page — slug is required
      setEventNotFound(true);
      return;
    }

    const clean = initialSlugOrId.trim().toLowerCase();
    const matched = events.find(
      (e) => (e.slug && e.slug.toLowerCase() === clean) || e.id.toLowerCase() === clean
    );
    if (matched) {
      setActiveEvent(matched);
      setEventNotFound(false);
      // Client-side registration closure check
      const now = Date.now();
      if (matched.registrationsOpen === false) {
        setRegistrationClosed(true);
        setClosedReason("Registrations are currently closed for this event.");
      } else if (new Date(matched.date).getTime() <= now) {
        setRegistrationClosed(true);
        setClosedReason("This event has already concluded.");
      } else if (matched.registrationDeadline) {
        const dlMs = new Date(matched.registrationDeadline).getTime();
        if (!Number.isNaN(dlMs) && dlMs <= now) {
          setRegistrationClosed(true);
          setClosedReason("The registration deadline has passed.");
        }
      }
    } else {
      setActiveEvent(null);
      setEventNotFound(true);
    }
  }, [events, loadingEvents, initialSlugOrId]);

  // 3. Track Firebase Auth State
  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthError(null);
      if (!firebaseUser || !firebaseUser.email) {
        setAuthStatus("signed-out");
        setAuthUser(null);
        setExistingRegistration(null);
        return;
      }

      const email = firebaseUser.email.trim().toLowerCase();
      if (!COLLEGE_EMAIL_RE.test(email)) {
        setAuthError("Please sign in with your official @crescent.education college account.");
        setAuthUser(null);
        setAuthStatus("signed-out");
        firebaseSignOut(auth).catch(() => {});
        return;
      }

      const rawName = firebaseUser.displayName || "";
      const cleaned = cleanStudentName(rawName) || rawName;
      setAuthUser({
        email,
        name: cleaned,
        picture: firebaseUser.photoURL || null,
      });
      setAuthStatus("signed-in");
    });
    return unsubscribe;
  }, []);

  // 4. Check Registration & Fetch Prefill Profile
  useEffect(() => {
    if (authStatus !== "signed-in" || !authUser || !activeEvent) {
      return;
    }

    const currentUser = authUser;
    let cancelled = false;
    let visibilityHandler: (() => void) | null = null;

    async function checkReg() {
      // If tab is hidden, defer until visible — otherwise IndexedDB is closed
      if (typeof document !== "undefined" && document.hidden) {
        setCheckingRegistration(false);
        visibilityHandler = () => {
          if (!document.hidden) {
            if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
            visibilityHandler = null;
            if (!cancelled) checkReg();
          }
        };
        document.addEventListener("visibilitychange", visibilityHandler);
        return;
      }
      setCheckingRegistration(true);
      setFormError(null);
      try {
        let token: string | null = null;
        try {
          token = await getCurrentIdToken();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err ?? "");
          if (msg.includes("Database is closing") || msg.includes("hidden")) {
            console.warn("[EventRegistration] deferred token fetch while hidden");
            // Retry when visible
            if (typeof document !== "undefined") {
              visibilityHandler = () => {
                if (!document.hidden) {
                  if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
                  visibilityHandler = null;
                  if (!cancelled) checkReg();
                }
              };
              document.addEventListener("visibilitychange", visibilityHandler);
            }
            return;
          }
          throw err;
        }
        if (!token) {
          // getCurrentIdToken returns null when DB was hidden — retry on visible
          if (typeof document !== "undefined" && document.hidden) {
            visibilityHandler = () => {
              if (!document.hidden) {
                if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
                visibilityHandler = null;
                if (!cancelled) checkReg();
              }
            };
            document.addEventListener("visibilitychange", visibilityHandler);
          }
          if (!cancelled) setCheckingRegistration(false);
          return;
        }
        if (cancelled) return;

        const targetId = activeEvent?.slug || activeEvent?.id;
        const res = await fetch(
          `/api/events/register?eventId=${encodeURIComponent(targetId || "")}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        if (data.event) {
          setActiveEvent((prev) => ({ ...prev, ...data.event }));
        }

        if (data.registered && data.registration) {
          setExistingRegistration(data.registration);
          // A registered student keeps access to their pass even if the event closed
          setRegistrationClosed(false);
          setClosedReason(null);
        } else if (data.registrationClosed) {
          setRegistrationClosed(true);
          setClosedReason(data.closedReason || "Registrations are closed for this event.");
          setExistingRegistration(null);
        } else {
          setExistingRegistration(null);
          if (data.prefill) {
            setCoreForm((prev) => ({
              ...prev,
              fullName: prev.fullName || data.prefill.fullName || currentUser.name,
              registerNumber:
                prev.registerNumber ||
                data.prefill.registerNumber ||
                extractRegisterNumber(currentUser.email),
              contactNumber: prev.contactNumber || data.prefill.contactNumber || "",
              degree: data.prefill.degree || prev.degree,
              branch: data.prefill.branch || prev.branch,
              section: data.prefill.section || prev.section,
              year: data.prefill.year || prev.year,
            }));
            // Pre-fill standard custom responses if available
            if (data.prefill.githubUrl) {
              setCustomResponses((prev) => ({ ...prev, githubUrl: data.prefill.githubUrl }));
            }
            if (data.prefill.linkedinUrl) {
              setCustomResponses((prev) => ({ ...prev, linkedinUrl: data.prefill.linkedinUrl }));
            }
          } else {
            setCoreForm((prev) => ({
              ...prev,
              fullName: prev.fullName || currentUser.name,
              registerNumber: prev.registerNumber || extractRegisterNumber(currentUser.email),
            }));
          }
        }
      } catch (err) {
        console.error("Registration check error:", err);
      } finally {
        if (!cancelled) setCheckingRegistration(false);
      }
    }

    checkReg();
    return () => {
      cancelled = true;
      if (visibilityHandler) document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [authStatus, authUser, activeEvent?.id, activeEvent?.slug]);

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    const auth = getClientAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: "crescent.education" });

    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code === "auth/unauthorized-domain") {
        setAuthError("Google Sign-In domain authorization needed in Firebase console.");
      } else if (code === "auth/popup-closed-by-user") {
        setAuthError("Sign-in window was closed before finishing.");
      } else {
        setAuthError("Failed to sign in. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut(getClientAuth());
    setAuthUser(null);
    setAuthStatus("signed-out");
    setExistingRegistration(null);
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent) return;
    if (registrationClosed) return;
    if (!authUser) {
      handleGoogleSignIn();
      return;
    }

    setFormError(null);

    // Validate Core Fields
    if (!coreForm.fullName.trim()) {
      setFormError("Please enter your full name.");
      return;
    }
    if (!coreForm.registerNumber.trim()) {
      setFormError("Please enter your College Register / Roll Number (RRN).");
      return;
    }
    if (!PHONE_RE.test(coreForm.contactNumber.trim())) {
      setFormError("Please enter a valid 10 to 15 digit contact/WhatsApp number.");
      return;
    }
    if (!coreForm.degree || !coreForm.branch || !coreForm.year) {
      setFormError("Please complete your academic degree, branch, and year.");
      return;
    }

    // Validate Dynamic Custom Fields
    const configuredFields = activeEvent.customFields ?? [];
    for (const field of configuredFields) {
      const val = customResponses[field.id];
      if (field.required && (val === undefined || val === null || String(val).trim() === "")) {
        setFormError(`"${field.label}" is required.`);
        return;
      }
      if (field.type === "url" && val && !isValidUrl(String(val))) {
        setFormError(`Please enter a valid URL for "${field.label}".`);
        return;
      }
    }

    if (!coreForm.consented) {
      setFormError("Please accept the code of conduct guidelines to complete registration.");
      return;
    }

    setSubmitting(true);

    try {
      let token: string | null = null;
      try {
        token = await getCurrentIdToken();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err ?? "");
        if (msg.includes("Database is closing") || msg.includes("hidden")) {
          setFormError("Tab was in background — please try again in a moment.");
          setSubmitting(false);
          return;
        }
        throw err;
      }
      if (!token) {
        setFormError("Session expired. Please sign in again.");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/events/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: activeEvent.slug || activeEvent.id,
          eventTitle: activeEvent.title,
          fullName: coreForm.fullName.trim(),
          registerNumber: coreForm.registerNumber.trim(),
          contactNumber: coreForm.contactNumber.trim(),
          degree: coreForm.degree,
          branch: coreForm.branch,
          section: coreForm.section,
          year: coreForm.year,
          consented: coreForm.consented,
          customResponses,
          // Backwards-compatible convenience extraction
          laptop: customResponses["laptop"]
            ? String(customResponses["laptop"]).toLowerCase().includes("yes")
              ? "yes"
              : "no"
            : undefined,
          skillLevel: (customResponses["skillLevel"] as string) || undefined,
          githubUrl: (customResponses["githubUrl"] as string) || undefined,
          expectations: (customResponses["expectations"] as string) || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.registration) {
          setExistingRegistration(data.registration);
          setFormError(null);
        } else {
          setFormError(data.error || "Failed to complete registration.");
        }
        setSubmitting(false);
        return;
      }

      setExistingRegistration(data.registration);
      setShowWhatsAppModal(true);
      setIsModalCollapsed(false);
    } catch (err) {
      console.error("Submission failed:", err);
      setFormError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingEvents) {
    return (
      <div className="min-h-screen bg-[#06090c] flex items-center justify-center text-xs font-mono text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (eventNotFound || !activeEvent) {
    return (
      <div className="min-h-screen bg-[#06090c] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Event Not Found</h2>
        <p className="text-xs font-mono text-gray-400 max-w-sm">
          The event you are looking for does not exist or its registration link is invalid. Each event has a dedicated registration page via its unique slug.
        </p>
        <Link
          href="/events"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Browse Events
        </Link>
      </div>
    );
  }

  const isExternal = activeEvent.registrationMode === "external";

  return (
    <div className="min-h-screen bg-[#06090c] text-white font-syne antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[350px] w-[500px] sm:w-[700px] rounded-full bg-gradient-to-b from-emerald-500/15 via-cyan-500/5 to-transparent blur-3xl" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-20 border-b border-white/10 bg-[#06090c]/80 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Events</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              CTC Registration Portal
            </span>
          </div>

          <Link
            href="/"
            className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            Home
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {/* Event Header Banner — locked to slug, no switching */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 p-5 sm:p-6 mb-6 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles className="w-3 h-3" />
              {activeEvent.category || "Event"}
            </span>
          </div>

          <h1 className="font-grotesk text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
            {activeEvent.title}
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed mb-4">
            {activeEvent.description}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-xs font-mono text-gray-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">{formatDate(activeEvent.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{formatTime(activeEvent.date) || "10:00 AM"}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{activeEvent.venue || "Campus Lab"}</span>
            </div>
          </div>
        </motion.div>

        {/* CASE A: EXTERNAL REDIRECT MODE */}
        {isExternal && !registrationClosed ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-center space-y-4"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ExternalLink className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">External Registration</h2>
            <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto">
              Registrations for <span className="text-white font-semibold">{activeEvent.title}</span> are
              hosted on an external partner portal.
            </p>
            <a
              href={activeEvent.registerUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
              <span>Proceed to External Registration</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        ) : (
          /* CASE B: IN-BUILT WEBSITE REGISTRATION */
          <div>
            {/* REGISTRATION CLOSED — shown for non-registered users; registered students still see their pass */}
            {registrationClosed && !existingRegistration && !checkingRegistration && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-6 text-center space-y-3 mb-6"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">Registration Closed</h2>
                <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto">
                  {closedReason || "Registrations are not currently open for this event."}
                </p>
                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Browse Other Events
                </Link>
              </motion.div>
            )}

            {/* User Account / Sign In State */}
            <div className="mb-6">
              {authStatus === "checking" ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs font-mono text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Verifying college credentials...</span>
                </div>
              ) : authStatus === "signed-out" || !authUser ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 text-center"
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-bold text-white mb-1">
                    Sign in with College Google ID
                  </h2>
                  <p className="text-xs text-gray-400 font-sans max-w-sm mx-auto mb-4">
                    Only students with verified{" "}
                    <span className="text-emerald-300 font-mono">@crescent.education</span> email
                    addresses may register for this event.
                  </p>

                  {authError && (
                    <div className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 flex items-start gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={signingIn}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] disabled:opacity-50 active:scale-95"
                  >
                    {signingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Sign in with College Account</span>
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {authUser.picture ? (
                      <img
                        src={authUser.picture}
                        alt=""
                        className="h-8 w-8 rounded-full border border-emerald-400/40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                        {(authUser.name || "S")[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {authUser.name}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </div>
                      <span className="text-[10px] font-mono text-emerald-300 truncate block">
                        {authUser.email}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-white transition-colors shrink-0 px-2 py-1 rounded bg-white/5"
                  >
                    <LogOut className="w-3 h-3" />
                    <span className="hidden sm:inline">Sign out</span>
                  </button>
                </div>
              )}
            </div>

            {authStatus === "signed-in" && (
              <div>
                {checkingRegistration ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-xs font-mono text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Checking your registration status...</span>
                  </div>
                ) : existingRegistration ? (
                  /* ALREADY REGISTERED — DIGITAL ENTRY PASS */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="text-xs font-sans">
                        <p className="font-bold text-emerald-300">Seat Reserved!</p>
                        <p className="text-gray-400 text-[11px]">
                          You are already registered for this event. Each student may register only once.
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Group Invite */}
                    {activeEvent.whatsappGroupLink && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-2xl bg-[#073d1e]/60 border-2 border-[#25D366]/40 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 shadow-[0_0_30px_rgba(37,211,102,0.12)]"
                      >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 shrink-0">
                          <MessageCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white">
                            Join the {activeEvent.title} WhatsApp Group
                          </h3>
                          <p className="text-[11px] font-mono text-gray-400 mt-0.5">
                            Get instant updates, announcements, and reminders about the event.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setShowWhatsAppModal(true);
                              setIsModalCollapsed(false);
                            }}
                            title="Open WhatsApp Group details modal"
                            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition-colors flex items-center justify-center"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <a
                            href={activeEvent.whatsappGroupLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5b] text-black text-xs font-mono font-bold uppercase tracking-wider transition-all active:scale-95"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Join Group</span>
                          </a>
                        </div>
                      </motion.div>
                    )}

                    {/* Pass Card */}
                    <div
                      ref={passRef}
                      className="rounded-3xl bg-gradient-to-b from-[#0e161c] to-[#080d11] border-2 border-emerald-500/40 p-6 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden"
                    >
                      <div className="absolute top-1/2 -left-3 h-6 w-6 rounded-full bg-[#06090c] border border-white/10 -translate-y-1/2" />
                      <div className="absolute top-1/2 -right-3 h-6 w-6 rounded-full bg-[#06090c] border border-white/10 -translate-y-1/2" />

                      <div className="flex items-start justify-between gap-3 border-b border-dashed border-white/15 pb-4 mb-4">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 block mb-1">
                            Crescent Technocrats Club • Digital Pass
                          </span>
                          <h3 className="font-grotesk text-lg font-bold tracking-tight text-white">
                            {existingRegistration.eventTitle || activeEvent.title}
                          </h3>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                            {existingRegistration.ticketCode}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-5">
                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Attendee</span>
                          <span className="font-bold text-white text-sm truncate block">
                            {existingRegistration.fullName}
                          </span>
                          <span className="text-[10px] text-gray-400 truncate block">
                            {existingRegistration.registerNumber}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Department</span>
                          <span className="text-white text-xs truncate block">
                            {existingRegistration.branch}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {existingRegistration.year} • Sec {existingRegistration.section}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Date & Time</span>
                          <span className="text-white text-xs block">
                            {formatDate(activeEvent.date)}
                          </span>
                          <span className="text-[10px] text-emerald-400">
                            {formatTime(activeEvent.date) || "10:00 AM"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-500 block uppercase">Venue</span>
                          <span className="text-white text-xs block">
                            {activeEvent.venue || "Campus Lab"}
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Custom Responses Summary */}
                      {existingRegistration.customResponses && Object.keys(existingRegistration.customResponses).length > 0 && (
                        <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3 mb-4 space-y-1.5 text-xs font-mono">
                          {Object.entries(existingRegistration.customResponses).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-gray-400 capitalize">{k}:</span>
                              <span className="text-white font-medium text-right truncate max-w-[200px]">
                                {String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* QR Code & Unique Ticket Code Section */}
                      <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-black/60 border border-white/10 text-center space-y-3.5">
                        {/* Visible QR Code rendered on canvas */}
                        <div className="bg-white p-3 rounded-2xl shadow-xl border-2 border-emerald-400/40">
                          <QRCodeCanvas
                            id="pass-qr-canvas"
                            value={`CTC-VERIFY:${existingRegistration.id}:${existingRegistration.ticketCode}:${existingRegistration.collegeMail}`}
                            size={160}
                            level="H"
                            includeMargin={false}
                          />
                        </div>

                        {/* Unique Ticket Code (Prominently placed directly below QR) */}
                        <div className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-white/[0.04] border border-emerald-400/40 text-center">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-0.5">
                            Unique Ticket Code
                          </span>
                          <span className="text-lg sm:text-xl font-mono font-black text-emerald-400 tracking-wider">
                            {existingRegistration.ticketCode}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-gray-400">
                          Scan QR or present ticket code at desk for door check-in
                        </span>
                        <span className="text-[9px] font-mono text-gray-600">
                          Ticket ID: {existingRegistration.id}
                        </span>
                      </div>

                      {/* Action Buttons: Download Pass Image & Calendar */}
                      <div className="mt-5 flex flex-wrap gap-2.5 justify-center">
                        <button
                          type="button"
                          onClick={handleDownloadPassImage}
                          disabled={isDownloading}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 disabled:opacity-50"
                        >
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Generating Pass...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Pass Image</span>
                            </>
                          )}
                        </button>

                        <a
                          href={buildCalendarUrl(activeEvent)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-mono transition-colors"
                        >
                          <CalendarPlus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Add to Google Calendar</span>
                        </a>
                      </div>
                    </div>
                  </motion.div>
                ) : registrationClosed ? (
                  null
                ) : (
                  /* DYNAMIC REGISTRATION FORM */
                  <motion.form
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                  >
                    {formError && (
                      <div className="rounded-xl bg-rose-500/15 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{formError}</span>
                      </div>
                    )}

                    {/* Section 1: Standard Student Identity */}
                    <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 sm:p-5 space-y-4">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <span className="flex h-5 w-5 rounded-full bg-emerald-500/20 items-center justify-center text-[10px]">
                          1
                        </span>
                        Student Information
                      </h3>

                      <div>
                        <label className={labelCls}>Full Name *</label>
                        <input
                          type="text"
                          required
                          value={coreForm.fullName}
                          onChange={(e) => setCoreForm({ ...coreForm, fullName: e.target.value })}
                          placeholder="e.g. John Doe"
                          className={inputCls}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>College Email (Verified)</label>
                          <input
                            type="email"
                            readOnly
                            disabled
                            value={authUser?.email || ""}
                            className={`${inputCls} opacity-60 cursor-not-allowed bg-black/40 font-mono`}
                          />
                        </div>

                        <div>
                          <label className={labelCls}>Register / Roll Number (RRN) *</label>
                          <input
                            type="text"
                            required
                            value={coreForm.registerNumber}
                            onChange={(e) =>
                              setCoreForm({ ...coreForm, registerNumber: e.target.value })
                            }
                            placeholder="e.g. 240071601263"
                            className={`${inputCls} font-mono`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>WhatsApp / Contact Number *</label>
                        <input
                          type="tel"
                          required
                          value={coreForm.contactNumber}
                          onChange={(e) =>
                            setCoreForm({ ...coreForm, contactNumber: e.target.value })
                          }
                          placeholder="e.g. +91 9876543210"
                          className={`${inputCls} font-mono`}
                        />
                      </div>
                    </div>

                    {/* Section 2: Academic Details */}
                    <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 sm:p-5 space-y-4">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <span className="flex h-5 w-5 rounded-full bg-cyan-500/20 items-center justify-center text-[10px]">
                          2
                        </span>
                        Academic Details
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Degree *</label>
                          <select
                            value={coreForm.degree}
                            onChange={(e) => setCoreForm({ ...coreForm, degree: e.target.value })}
                            className={selectCls}
                          >
                            {DEGREES.map((deg) => (
                              <option key={deg} value={deg} className="bg-[#0b1015] text-white">
                                {deg}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Year of Study *</label>
                          <select
                            value={coreForm.year}
                            onChange={(e) => setCoreForm({ ...coreForm, year: e.target.value })}
                            className={selectCls}
                          >
                            {YEARS.map((yr) => (
                              <option key={yr} value={yr} className="bg-[#0b1015] text-white">
                                {yr}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Department / Branch *</label>
                          <select
                            value={coreForm.branch}
                            onChange={(e) => setCoreForm({ ...coreForm, branch: e.target.value })}
                            className={selectCls}
                          >
                            {BRANCHES.map((br) => (
                              <option key={br} value={br} className="bg-[#0b1015] text-white">
                                {br}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className={labelCls}>Section</label>
                          <select
                            value={coreForm.section}
                            onChange={(e) => setCoreForm({ ...coreForm, section: e.target.value })}
                            className={selectCls}
                          >
                            {SECTIONS.map((sec) => (
                              <option key={sec} value={sec} className="bg-[#0b1015] text-white">
                                Section {sec}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Dynamic Event-Specific Fields */}
                    {activeEvent.customFields && activeEvent.customFields.length > 0 && (
                      <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 sm:p-5 space-y-4">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400 flex items-center gap-2">
                          <span className="flex h-5 w-5 rounded-full bg-violet-500/20 items-center justify-center text-[10px]">
                            3
                          </span>
                          {activeEvent.title} — Event Questions
                        </h3>

                        {activeEvent.customFields.map((field) => {
                          const val = customResponses[field.id] ?? "";

                          return (
                            <div key={field.id} className="space-y-1.5">
                              <label className={labelCls}>
                                {field.label} {field.required && "*"}
                              </label>

                              {/* Render by Input Type */}
                              {field.type === "text" && (
                                <input
                                  type="text"
                                  required={field.required}
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                                  }
                                  placeholder={field.placeholder || ""}
                                  className={inputCls}
                                />
                              )}

                              {field.type === "textarea" && (
                                <textarea
                                  rows={3}
                                  required={field.required}
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                                  }
                                  placeholder={field.placeholder || ""}
                                  className={`${inputCls} resize-none`}
                                />
                              )}

                              {field.type === "number" && (
                                <input
                                  type="number"
                                  required={field.required}
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                                  }
                                  placeholder={field.placeholder || ""}
                                  className={inputCls}
                                />
                              )}

                              {field.type === "url" && (
                                <input
                                  type="url"
                                  required={field.required}
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                                  }
                                  placeholder={field.placeholder || "https://..."}
                                  className={inputCls}
                                />
                              )}

                              {field.type === "select" && (
                                <select
                                  required={field.required}
                                  value={String(val)}
                                  onChange={(e) =>
                                    setCustomResponses({ ...customResponses, [field.id]: e.target.value })
                                  }
                                  className={selectCls}
                                >
                                  <option value="" className="bg-[#0b1015] text-gray-500">
                                    -- Select an option --
                                  </option>
                                  {(field.options ?? []).map((opt) => (
                                    <option key={opt} value={opt} className="bg-[#0b1015] text-white">
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {field.type === "radio" && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {(field.options ?? []).map((opt) => {
                                    const active = val === opt;
                                    return (
                                      <button
                                        type="button"
                                        key={opt}
                                        onClick={() =>
                                          setCustomResponses({ ...customResponses, [field.id]: opt })
                                        }
                                        className={`p-3 rounded-xl border text-left text-xs font-mono transition-all ${
                                          active
                                            ? "bg-emerald-500/15 border-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                                            : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span>{opt}</span>
                                          <div
                                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                              active ? "border-emerald-400 bg-emerald-400" : "border-white/30"
                                            }`}
                                          >
                                            {active && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                                          </div>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {field.type === "checkbox" && (
                                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    checked={val === true}
                                    onChange={(e) =>
                                      setCustomResponses({ ...customResponses, [field.id]: e.target.checked })
                                    }
                                    className="h-4 w-4 rounded bg-white/10 border-white/20 text-emerald-500"
                                  />
                                  <span className="text-xs font-mono text-gray-300">
                                    {field.placeholder || "Yes, I confirm"}
                                  </span>
                                </label>
                              )}

                              {field.helpText && (
                                <p className="text-[10px] text-gray-500 font-mono mt-1">
                                  {field.helpText}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Section 4: Consent Checkbox */}
                    <div className="rounded-xl bg-white/[0.02] border border-white/10 p-3.5">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={coreForm.consented}
                          onChange={(e) => setCoreForm({ ...coreForm, consented: e.target.checked })}
                          className="mt-0.5 h-4 w-4 rounded bg-white/10 border-white/20 text-emerald-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="text-xs text-gray-300 font-sans leading-snug">
                          I commit to attending <span className="text-white font-semibold">{activeEvent.title}</span> in-person and abiding by the Crescent Technocrats Club code of conduct.
                        </span>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(52,211,153,0.3)] disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Reserving Your Seat...</span>
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4" />
                          <span>Confirm Event Registration</span>
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] font-mono text-gray-500">
                      Strictly 1 registration per verified college account.
                    </p>
                  </motion.form>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Collapsible WhatsApp Pop-up Modal */}
      <AnimatePresence>
        {showWhatsAppModal && !isModalCollapsed && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWhatsAppModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
              className="relative w-full max-w-md rounded-3xl bg-[#09110d]/95 border-2 border-[#25D366]/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(37,211,102,0.25)] text-center overflow-hidden z-10 my-auto"
            >
              {/* Background ambient glow */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#25D366]/15 rounded-full blur-3xl pointer-events-none" />

              {/* Header Controls: Status Badge + Collapse & Close */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] text-[11px] font-mono font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  Official WhatsApp Group
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsModalCollapsed(true)}
                    title="Collapse modal to bottom"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWhatsAppModal(false)}
                    title="Close"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Glowing WhatsApp Icon */}
              <div className="relative mx-auto mb-5 inline-flex">
                <div className="absolute inset-0 rounded-3xl bg-[#25D366]/30 blur-xl animate-pulse" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-[#25D366]/25 to-[#073d1e]/80 border-2 border-[#25D366]/50 text-[#25D366] shadow-[0_0_30px_rgba(37,211,102,0.3)]">
                  <MessageCircle className="w-10 h-10" />
                </div>
              </div>

              {/* Modal Text matching user request */}
              <h3 className="font-grotesk text-xl sm:text-2xl font-black text-white leading-snug mb-3">
                Join the {activeEvent?.title || "Workshop: AI-Assisted Analysis and Visualization of Drug–Cell Response Data"} WhatsApp Group
              </h3>

              <p className="text-xs sm:text-sm text-gray-300 font-sans leading-relaxed mb-6">
                Get instant updates, announcements, and reminders about the event.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <a
                  href={activeEvent?.whatsappGroupLink || "https://chat.whatsapp.com/"}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5b] text-black font-grotesk font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(37,211,102,0.4)] active:scale-[0.98]"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Join Group</span>
                </a>

                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(false)}
                  className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  View Digital Pass
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collapsed Sticky Bottom Pill */}
      <AnimatePresence>
        {showWhatsAppModal && isModalCollapsed && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed bottom-5 right-5 z-[90] max-w-sm sm:max-w-md rounded-2xl bg-[#09110d]/95 border-2 border-[#25D366]/40 p-3.5 shadow-[0_0_35px_rgba(37,211,102,0.25)] backdrop-blur-xl flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/40 shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">
                {activeEvent?.title || "Event"} WhatsApp Group
              </p>
              <p className="text-[10px] font-mono text-emerald-400/80 truncate">
                Tap to join group or expand
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href={activeEvent?.whatsappGroupLink || "https://chat.whatsapp.com/"}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5b] text-black text-xs font-bold font-mono uppercase tracking-wider transition-all"
              >
                Join
              </a>
              <button
                type="button"
                onClick={() => setIsModalCollapsed(false)}
                title="Expand modal"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                title="Close"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
