"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
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
  ArrowRight,
  AtSign,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Home,
  Info,
  Layers,
  Link2,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  User,
  X,
} from "lucide-react";
import { getClientAuth, getCurrentIdToken } from "@/lib/firebase-client";
import {
  BRANCHES,
  DEGREES,
  INTEREST_SUGGESTIONS,
  SECTIONS,
  SKILL_SUGGESTIONS,
  YEARS,
  cleanStudentName,
  isValidUrl,
} from "@/lib/applications";
import { displayJoinRole, normalizeCustomRole, type RoleRules } from "@/lib/join-roles";
import { useSmoothScroll } from "@/components/SmoothScroll";

const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;
const PHONE_RE = /^[+]?[\d\s()-]{10,15}$/;
const CSE_BRANCH = "Computer Science & Engineering";
const CSE_ALLOWED_ROLES = new Set(["member", "event-volunteer"]);

function authErrorCode(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    return String((err as { code?: unknown }).code ?? "");
  }
  return "";
}

const labelClass =
  "block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2";
const inputClass =
  "w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-mint/60 focus:ring-2 focus:ring-mint/20 transition-all";
const selectClass = inputClass + " appearance-none pr-10";
const textareaClass = inputClass + " resize-none";

interface FormState {
  fullName: string;
  role: string;
  collegeMail: string;
  contactNumber: string;
  degree: string;
  branch: string;
  section: string;
  year: string;
  interests: string[];
  skills: string[];
  reason: string;
  experience: string;
  linkedinUrl: string;
  githubUrl: string;
  socialMediaUrl: string;
  portfolioUrl: string;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  role: "",
  collegeMail: "",
  contactNumber: "",
  degree: "",
  branch: "",
  section: "",
  year: "",
  interests: [],
  skills: [],
  reason: "",
  experience: "",
  linkedinUrl: "",
  githubUrl: "",
  socialMediaUrl: "",
  portfolioUrl: "",
};

interface TagInputProps {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  error?: string;
  hint?: string;
}

function TagInput({ id, label, placeholder, values, onChange, suggestions, error, hint }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<number | null>(null);

  const trimmed = query.trim();
  const filtered = useMemo(() => {
    const q = trimmed.toLowerCase();
    return suggestions
      .filter(
        (s) =>
          !values.some((v) => v.toLowerCase() === s.toLowerCase()) &&
          (!q || s.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [suggestions, values, trimmed]);

  const showCustomOption =
    trimmed.length > 0 &&
    !values.some((v) => v.toLowerCase() === trimmed.toLowerCase()) &&
    !suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...values, value]);
    setQuery("");
    inputRef.current?.focus();
    setOpen(true);
  };

  const remove = (index: number) => onChange(values.filter((_, i) => i !== index));

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div
        className={`relative flex flex-wrap items-center gap-2 rounded-xl bg-black/40 border px-3 py-2.5 transition-all focus-within:border-mint/60 focus-within:ring-2 focus-within:ring-mint/20 ${
          error ? "border-red-500/50" : "border-white/10"
        }`}
      >
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-mint/15 border border-mint/30 text-mint-light text-xs font-mono px-2.5 py-1"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${v}`}
              className="text-mint-light/70 hover:text-white transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          ref={inputRef}
          type="text"
          value={query}
          placeholder={values.length === 0 ? placeholder : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(query);
            } else if (e.key === "Backspace" && !query && values.length > 0) {
              remove(values.length - 1);
            }
          }}
          onBlur={() => {
            if (blurTimer.current) window.clearTimeout(blurTimer.current);
            blurTimer.current = window.setTimeout(() => setOpen(false), 120);
          }}
          className="flex-1 min-w-[140px] bg-transparent text-white text-sm placeholder:text-gray-600 focus:outline-none py-1"
        />
        {open && (filtered.length > 0 || showCustomOption) && (
          <div className="absolute z-20 left-0 right-0 top-full mt-2 rounded-xl bg-[#101820] border border-white/10 shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
            {showCustomOption && (
              <>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(trimmed)}
                  className="w-full text-left px-4 py-2.5 text-sm text-mint hover:bg-mint/10 hover:text-white font-mono transition-colors flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add &ldquo;{trimmed}&rdquo;</span>
                </button>
                {filtered.length > 0 && (
                  <div className="h-px bg-white/10" />
                )}
              </>
            )}
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-mint/10 hover:text-white font-mono transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-400 font-mono">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500 font-mono">{hint}</p>
      ) : null}
    </div>
  );
}

interface UrlFieldProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function UrlField({ id, label, icon, value, onChange, error }: UrlFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label} <span className="text-gray-600 normal-case">(optional)</span>
      </label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
          {icon}
        </span>
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://"
          className={`${inputClass} pl-10 ${error ? "border-red-500/50" : ""}`}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}

const OPTIONAL_URL_FIELDS: {
  key: "linkedinUrl" | "githubUrl" | "socialMediaUrl" | "portfolioUrl";
  label: string;
}[] = [
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "githubUrl", label: "GitHub URL" },
  { key: "socialMediaUrl", label: "Social Media URL" },
  { key: "portfolioUrl", label: "Portfolio URL" },
];

interface RoleInfoPanelProps {
  role: string;
  description: string;
  rules: string[];
  roleLabels?: Record<string, string>;
  accepted: boolean;
  onToggle: () => void;
  error?: string;
}

// The role info panel displays the description and any specific rules that
// the applicant must accept before the application can be submitted.
function RoleInfoPanel({ role, description, rules, roleLabels, accepted, onToggle, error }: RoleInfoPanelProps) {
  const hasRules = rules.length > 0;
  if (!description && !hasRules) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-mint/20 bg-mint/5 p-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-mint mb-2">
          About the {displayJoinRole(role, roleLabels)} role
        </p>
        {description && <p className="text-xs text-gray-300 leading-relaxed">{description}</p>}
        {hasRules && (
          <>
            <p className="text-[10px] font-mono uppercase tracking-widest text-mint mt-3 mb-2">
              Rules
            </p>
            <ul className="space-y-1.5">
              {rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed">
                  <ShieldCheck className="w-3.5 h-3.5 text-mint shrink-0 mt-0.5" />
                  {rule}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className={`flex items-start gap-3 w-full text-left p-4 rounded-2xl border transition-colors ${
          error ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-black/30 hover:border-mint/40"
        }`}
      >
        <span
          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
            accepted ? "bg-mint border-mint text-black" : "bg-black/40 border-white/20"
          }`}
        >
          {accepted && <Check className="w-3.5 h-3.5" />}
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">
            I have read and accept the role description{hasRules && " and rules"}
          </span>
          <span className="block text-xs text-gray-500 font-mono mt-0.5">
            {hasRules
              ? `You must accept all ${rules.length} rule${rules.length === 1 ? "" : "s"} before applying`
              : "Confirm you understand the role before applying"}
          </span>
        </span>
      </button>
      {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
    </div>
  );
}

export default function JoinPage() {
  const lenis = useSmoothScroll();
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorPngRef = useRef<HTMLDivElement>(null);
  const macHoverRef = useRef(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [macHover, setMacHover] = useState(false);

  const scrollToTop = (behavior: ScrollBehavior = "smooth") => {
    if (lenis) lenis.scrollTo(0);
    else window.scrollTo({ top: 0, behavior });
  };

  // Detect touch/pointer-coarse devices — skip the custom cursor there
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

  // Custom cursor — follows the mouse, rotates over interactive elements
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorVisible(true);
      if (cursorPngRef.current) {
        gsap.to(cursorPngRef.current, {
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
    if (!cursorPngRef.current) return;
    gsap.to(cursorPngRef.current, {
      rotation: macHover ? -40 : 0,
      duration: 0.3,
      ease: "power2.out",
    });
  }, [macHover]);

  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentOpen, setConsentOpen] = useState(false);
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedRole, setSubmittedRole] = useState("");
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [memberMode, setMemberMode] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [memberBranch, setMemberBranch] = useState("");
  const [hasPending, setHasPending] = useState(false);
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-out" | "ready">("loading");
  const [authUser, setAuthUser] = useState<{
    email: string;
    name: string;
    picture: string | null;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [openRoles, setOpenRoles] = useState<string[]>([]);
  const [roleDetails, setRoleDetails] = useState<Record<string, RoleRules>>({});
  const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
  const [roleLinks, setRoleLinks] = useState<Record<string, string>>({});
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [acceptedRoleRules, setAcceptedRoleRules] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawMsg, setWithdrawMsg] = useState<string | null>(null);

  const handleWithdrawApplication = async () => {
    if (!withdrawReason.trim()) {
      setWithdrawError("Please enter a reason for deleting your application.");
      return;
    }
    const token = await getCurrentIdToken();
    if (!token) {
      setWithdrawError("Session expired. Please sign in again.");
      return;
    }
    setWithdrawBusy(true);
    setWithdrawError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: withdrawReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete application");
      }
      setAlreadyApplied(false);
      setHasPending(false);
      setWithdrawOpen(false);
      setWithdrawReason("");
      setSubmitError(null);
      setWithdrawMsg(
        "Your application has been deleted successfully. You may now submit a fresh application if desired."
      );
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : "Failed to delete application");
    } finally {
      setWithdrawBusy(false);
    }
  };

  // Load the roles the admins have opened for applications.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/join-roles", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const roles = Array.isArray(d?.roles) ? d.roles.filter((x: unknown): x is string => typeof x === "string") : [];
        setOpenRoles(roles.length > 0 ? roles : ["member"]);
        if (d?.roleDetails && typeof d.roleDetails === "object") {
          setRoleDetails(d.roleDetails as Record<string, RoleRules>);
        }
        if (d?.roleLabels && typeof d.roleLabels === "object") {
          setRoleLabels(d.roleLabels as Record<string, string>);
        }
        if (d?.roleLinks && typeof d.roleLinks === "object") {
          setRoleLinks(d.roleLinks as Record<string, string>);
        }
      })
      .catch(() => {
        if (!cancelled) setOpenRoles(["member"]);
      })
      .finally(() => {
        if (!cancelled) setRolesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const roleRulesFor = (role: string): string[] => {
    const detail = roleDetails[role];
    return Array.isArray(detail?.rules)
      ? detail.rules.filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      : [];
  };

  const roleDescriptionFor = (role: string): string =>
    typeof roleDetails[role]?.description === "string"
      ? (roleDetails[role]?.description ?? "").trim()
      : "";

  const setRole = (value: string) => {
    set("role", value);
    setAcceptedRoleRules(false);
  };

  const effectiveBranch = form.branch || memberBranch;
  const isCse = effectiveBranch === CSE_BRANCH;

  const visibleRoles = useMemo(() => {
    let roles = openRoles;
    if (isCse) {
      roles = roles.filter((r) => CSE_ALLOWED_ROLES.has(normalizeCustomRole(r)));
    }
    if (memberMode && currentRoles.length > 0) {
      const owned = new Set(currentRoles.map(normalizeCustomRole));
      roles = roles.filter((r) => !owned.has(normalizeCustomRole(r)));
    }
    return roles;
  }, [openRoles, isCse, memberMode, currentRoles]);

  useEffect(() => {
    if (form.role && rolesLoaded && visibleRoles.length > 0 && !visibleRoles.includes(form.role)) {
      setRole("");
    }
  }, [visibleRoles, form.role, rolesLoaded]);

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

  // Require a verified @crescent.education Google account to apply.
  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setAlreadyApplied(false);
      setMemberMode(false);
      setCurrentRoles([]);
      setHasPending(false);
      setAcceptedRoleRules(false);
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
      const rawName = firebaseUser.displayName || "";
      const cleanedName = cleanStudentName(rawName);
      setAuthUser({
        email,
        name: cleanedName || rawName,
        picture: firebaseUser.photoURL || null,
      });
      setForm((prev) => ({
        ...prev,
        collegeMail: email,
        fullName: prev.fullName.trim() ? prev.fullName : cleanedName || rawName,
      }));
      setAuthStatus("ready");
    });
    return unsubscribe;
  }, []);

  // A person may only apply once with the same email address — check the
  // verified college mail after sign-in and surface an early "contact the
  // team" notice before submission.
  useEffect(() => {
    if (!authUser || !COLLEGE_EMAIL_RE.test(authUser.email)) return;
    let cancelled = false;
    const check = async () => {
      const token = await getCurrentIdToken();
      if (cancelled || !token) return;
      try {
        const res = await fetch(
          `/api/applications/status?email=${encodeURIComponent(authUser.email)}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
        );
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        setAlreadyApplied(!!data?.hasApplied);
        setMemberMode(data?.mode === "role");
        setCurrentRoles(
          Array.isArray(data?.roles)
            ? data.roles.filter((r: unknown): r is string => typeof r === "string")
            : []
        );
        setMemberBranch(typeof data?.branch === "string" ? data.branch : "");
        setHasPending(!!data?.hasPending);
      } catch {
        if (!cancelled) setAlreadyApplied(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const validateStep1 = (): boolean => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (!form.degree) e.degree = "Select your degree";
    if (!form.branch) e.branch = "Select your branch";
    if (!form.section) e.section = "Select your section";
    if (!form.year) e.year = "Select your year";
    if (!authUser) {
      e.collegeMail = "Please sign in with your college Google account first";
    }
    if (!PHONE_RE.test(form.contactNumber.trim())) e.contactNumber = "Enter a valid contact number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (rolesLoaded && !form.role) e.role = "Select the role you're applying for";
    else if (rolesLoaded && !visibleRoles.includes(form.role)) {
      e.role = "The selected role is no longer open for applications";
    }
    if (rolesLoaded && form.role && roleRulesFor(form.role).length > 0 && !acceptedRoleRules) {
      e.rules = "You must accept the role description and rules to apply";
    }
    if (form.interests.length === 0) e.interests = "Add at least one interest";
    if (form.skills.length === 0) e.skills = "Add at least one skill";
    if (!form.reason.trim()) e.reason = "Tell us why you want to join";
    for (const field of OPTIONAL_URL_FIELDS) {
      if (!isValidUrl(form[field.key])) e[field.key] = `${field.label} is not a valid link`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep1()) return;
    if (alreadyApplied) {
      setErrors((prev) => ({
        ...prev,
        collegeMail:
          "An application has already been submitted with this email. Please contact the team directly for any follow-ups or updates.",
      }));
      return;
    }
    setErrors({});
    setStep(2);
    scrollToTop();
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (!authUser) {
      setSubmitError("Please sign in with your college Google account to apply.");
      return;
    }
    if (alreadyApplied) {
      setSubmitError(
        "An application has already been submitted with this email. Please contact the team directly for any follow-ups or updates."
      );
      return;
    }
    if (!validateStep2()) return;
    if (!consented) {
      setConsentOpen(true);
      return;
    }
    const idToken = await getCurrentIdToken();
    if (!idToken) {
      setSubmitError("Your session expired. Please sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ ...form, consented, acceptedRoleRules }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const errMsg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error
            : `Your application could not be submitted (${res.status}). Please try again.`;
        throw new Error(errMsg);
      }
      setSubmitted(true);
      setSubmittedName(form.fullName);
      setSubmittedRole(form.role);
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const validateRoleForm = (): boolean => {
    const e: Record<string, string> = {};
    if (form.fullName.trim().length < 2) e.fullName = "Enter your full name";
    if (rolesLoaded && !form.role) e.role = "Select the role you're applying for";
    else if (rolesLoaded && !visibleRoles.includes(form.role)) {
      e.role = "The selected role is no longer open for applications";
    }
    if (rolesLoaded && form.role && roleRulesFor(form.role).length > 0 && !acceptedRoleRules) {
      e.rules = "You must accept the role description and rules to apply";
    }
    if (!authUser) {
      e.collegeMail = "Please sign in with your college Google account first";
    }
    if (!form.reason.trim()) e.reason = "Tell us why you're interested in this role";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRoleSubmit = async () => {
    setSubmitError(null);
    if (!authUser) {
      setSubmitError("Please sign in with your college Google account to apply.");
      return;
    }
    if (hasPending) {
      setSubmitError(
        "You already have a pending application. The team will review it before you can apply again."
      );
      return;
    }
    if (!validateRoleForm()) return;
    const idToken = await getCurrentIdToken();
    if (!idToken) {
      setSubmitError("Your session expired. Please sign in again.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ ...form, consented: false, acceptedRoleRules }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const errMsg =
          typeof data?.error === "string" && data.error.trim()
            ? data.error
            : `Your application could not be submitted (${res.status}). Please try again.`;
        throw new Error(errMsg);
      }
      setSubmitted(true);
      setSubmittedName(form.fullName);
      setSubmittedRole(form.role);
      setHasPending(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { n: 1, label: "Basic Details", icon: User },
    { n: 2, label: "Academics & Profile", icon: GraduationCap },
  ];

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

        {submitted ? (
          <div className="rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-8 sm:p-12">
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-16 h-16 rounded-full bg-mint/15 border border-mint/30 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-mint" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white">
                Application Received!
              </h1>
              {submittedRole &&
              !submittedRole.toLowerCase().includes("volunteer") &&
              submittedRole.toLowerCase() !== "member" ? (
                <>
                  <p className="text-sm text-gray-400 mt-4 max-w-sm leading-relaxed">
                    Thanks {submittedName || "for applying"}! You will be interviewed soon.
                  </p>
                  {roleLinks[submittedRole] && (
                    <a
                      href={roleLinks[submittedRole]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-mint/15 hover:bg-mint/25 border border-mint/30 text-mint text-xs font-mono uppercase tracking-wider transition-all"
                    >
                      Join the Group
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 mt-4 max-w-sm leading-relaxed">
                  Thanks {submittedName || "for applying"}! Your application is with the team — we&apos;ll
                  reach out at your college email or phone number with the next steps.
                </p>
              )}
              <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                >
                  Back to Homepage
                </Link>
                {!memberMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(INITIAL_FORM);
                      setSubmitted(false);
                      setSubmittedRole("");
                      setConsented(false);
                      setAcceptedRoleRules(false);
                      setErrors({});
                      setStep(1);
                      scrollToTop("auto");
                    }}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    Submit Another
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="mb-10">
              <div className="text-shine text-[10px] font-mono uppercase tracking-widest font-medium mb-4">
                {memberMode ? "Role Applications Open" : "Applications Open"}
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                {memberMode ? "Apply for a Role" : "Join the Club"}
              </h1>
              <p className="text-sm text-gray-400 mt-3 max-w-md leading-relaxed">
                {memberMode ? (
                  <>
                    You&apos;re already a CTC member — take on a new team role. Pick an open role and
                    tell us why you&apos;re the right fit. Your current roles stay untouched until an
                    admin reviews your application.
                  </>
                ) : (
                  <>
                    Become part of Crescent Technocrats Club — build, ship, and grow with a community
                    of student engineers, designers, and innovators.
                  </>
                )}
              </p>
              <p className="text-xs text-gray-500 font-mono mt-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-mint" />
                Applications are verified with your college Google account (@crescent.education).
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
                    <ShieldCheck className="w-8 h-8 text-mint" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">College account required</h2>
                  <p className="text-sm text-gray-400 mt-3 max-w-sm leading-relaxed">
                    Sign in with your official college Google account to verify your identity and
                    submit an application. Only @crescent.education accounts are accepted.
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
                    {signingIn ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <LogIn className="w-4 h-4" />
                    )}
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
                    onClick={() => {
                      setForm(INITIAL_FORM);
                      setConsented(false);
                      setAcceptedRoleRules(false);
                      setErrors({});
                      setStep(1);
                      firebaseSignOut(getClientAuth()).catch(() => {});
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white text-xs font-mono uppercase tracking-wider transition-all shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                  </button>
                </div>
              )}
              {memberMode ? (
                <div className="space-y-6">
                  {hasPending ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 space-y-5">
                      <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                        <Clock className="w-7 h-7 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">
                          Application Under Review
                        </h3>
                        <p className="text-sm text-gray-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                          You already have a pending application. The team will review it before
                          you can apply for another role.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link
                          href="/"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white text-xs font-mono uppercase tracking-wider transition-all"
                        >
                          <Home className="w-4 h-4" />
                          Back to Home
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setWithdrawOpen(true);
                            setWithdrawReason("");
                            setWithdrawError(null);
                          }}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-mono uppercase tracking-wider transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Withdraw / Delete Application
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
                        <p className="text-xs font-mono uppercase tracking-wider text-gray-500 mb-2.5">
                          Your current roles
                        </p>
                        {currentRoles.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {currentRoles.map((r) => (
                              <span
                                key={r}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-mint/10 border border-mint/30 text-xs font-mono text-mint"
                              >
                                <BadgeCheck className="w-3.5 h-3.5" />
                                {displayJoinRole(r, roleLabels)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 font-mono">
                            No active roles — this will be your first one.
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="fullName" className={labelClass}>
                          Full Name *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <User className="w-4 h-4" />
                          </span>
                          <input
                            id="fullName"
                            type="text"
                            value={form.fullName}
                            onChange={(e) => set("fullName", e.target.value)}
                            placeholder="e.g. John Doe"
                            className={`${inputClass} pl-10 ${errors.fullName ? "border-red-500/50" : ""}`}
                          />
                        </div>
                        {errors.fullName && (
                          <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.fullName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="collegeMail" className={labelClass}>
                          College Mail *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <Mail className="w-4 h-4" />
                          </span>
                          <input
                            id="collegeMail"
                            type="email"
                            value={form.collegeMail}
                            readOnly
                            placeholder="you@crescent.education"
                            className={`${inputClass} pl-10 pr-24 opacity-80 cursor-not-allowed`}
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-mono text-mint pointer-events-none">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500 font-mono">
                          Verified via your college Google account
                        </p>
                      </div>

                      <div>
                        <label htmlFor="role" className={labelClass}>
                          Role Applying For *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                            <BadgeCheck className="w-4 h-4" />
                          </span>
                          <select
                            id="role"
                            value={form.role}
                            onChange={(e) => setRole(e.target.value)}
                            disabled={!rolesLoaded}
                            className={`${selectClass} pl-10 ${errors.role ? "border-red-500/50" : ""}`}
                          >
                            <option value="" disabled>
                              {rolesLoaded ? "Select a role" : "Loading roles…"}
                            </option>
                            {visibleRoles.map((r) => (
                              <option key={r} value={r} className="bg-[#0d1317]">
                                {displayJoinRole(r, roleLabels)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                        {errors.role ? (
                          <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.role}</p>
                        ) : (
                          <p className="mt-1.5 text-xs text-gray-500 font-mono">
                            Pick the team role you&apos;d like to take on. Roles listed here are
                            currently open.
                          </p>
                        )}

                        {form.role && (
                          <div className="mt-4">
                            <RoleInfoPanel
                              role={form.role}
                              description={roleDescriptionFor(form.role)}
                              rules={roleRulesFor(form.role)}
                              roleLabels={roleLabels}
                              accepted={acceptedRoleRules}
                              onToggle={() => {
                                setAcceptedRoleRules((v) => !v);
                                setErrors((prev) => {
                                  if (!("rules" in prev)) return prev;
                                  const next = { ...prev };
                                  delete next.rules;
                                  return next;
                                });
                              }}
                              error={errors.rules}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label htmlFor="roleReason" className={labelClass}>
                          Why do you want this role? *
                        </label>
                        <textarea
                          id="roleReason"
                          rows={4}
                          value={form.reason}
                          onChange={(e) => set("reason", e.target.value)}
                          placeholder="Tell us what you'll bring to the team and why you're the right fit…"
                          className={`${textareaClass} ${errors.reason ? "border-red-500/50" : ""}`}
                        />
                        {errors.reason && (
                          <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.reason}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="experience" className={labelClass}>
                          Relevant Experience{" "}
                          <span className="text-gray-600">(optional)</span>
                        </label>
                        <textarea
                          id="experience"
                          rows={3}
                          value={form.experience}
                          onChange={(e) => set("experience", e.target.value)}
                          placeholder="Past roles, projects, or contributions that back up your application…"
                          className={textareaClass}
                        />
                      </div>

                      {submitError && (
                        <div className="p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 bg-red-950/60 border border-red-500/40 text-red-400">
                          <X className="w-4 h-4 shrink-0" />
                          {submitError}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-gray-600 font-mono">
                          {visibleRoles.length} role{visibleRoles.length === 1 ? "" : "s"} open
                        </p>
                        <button
                          type="button"
                          onClick={handleRoleSubmit}
                          disabled={submitting || !rolesLoaded}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <Send className="w-4 h-4" />
                          {submitting ? "Submitting…" : "Submit Application"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
              {/* Progress */}
              <div className="flex items-center gap-3 mb-10">
                {steps.map((s, i) => (
                  <div key={s.n} className="flex items-center gap-3 flex-1 last:flex-none">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                          step === s.n
                            ? "bg-mint/15 border-mint/50 text-mint"
                            : step > s.n
                              ? "bg-mint/15 border-mint/50 text-mint"
                              : "bg-black/40 border-white/15 text-gray-500"
                        }`}
                      >
                        {step > s.n ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
                      </div>
                      <span
                        className={`hidden sm:block text-xs font-mono uppercase tracking-wider ${
                          step >= s.n ? "text-white" : "text-gray-500"
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className="flex-1 h-px bg-white/10 overflow-hidden rounded-full">
                        <div
                          className={`h-full bg-mint/60 transition-all duration-500 ${
                            step > s.n ? "w-full" : "w-0"
                          }`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {step === 1 ? (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="fullName" className={labelClass}>
                      Full Name *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        <User className="w-4 h-4" />
                      </span>
                      <input
                        id="fullName"
                        type="text"
                        value={form.fullName}
                        onChange={(e) => set("fullName", e.target.value)}
                        placeholder="e.g. John Doe"
                        className={`${inputClass} pl-10 ${errors.fullName ? "border-red-500/50" : ""}`}
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.fullName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="degree" className={labelClass}>
                        Degree *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <GraduationCap className="w-4 h-4" />
                        </span>
                        <select
                          id="degree"
                          value={form.degree}
                          onChange={(e) => set("degree", e.target.value)}
                          className={`${selectClass} pl-10 ${errors.degree ? "border-red-500/50" : ""}`}
                        >
                          <option value="" disabled>
                            Select degree
                          </option>
                          {DEGREES.map((d) => (
                            <option key={d} value={d} className="bg-[#0d1317]">
                              {d}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      {errors.degree && (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.degree}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="branch" className={labelClass}>
                        Branch *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <Building2 className="w-4 h-4" />
                        </span>
                        <select
                          id="branch"
                          value={form.branch}
                          onChange={(e) => set("branch", e.target.value)}
                          className={`${selectClass} pl-10 ${errors.branch ? "border-red-500/50" : ""}`}
                        >
                          <option value="" disabled>
                            Select branch
                          </option>
                          {BRANCHES.map((b) => (
                            <option key={b} value={b} className="bg-[#0d1317]">
                              {b}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      {errors.branch && (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.branch}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="section" className={labelClass}>
                        Section *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <Layers className="w-4 h-4" />
                        </span>
                        <select
                          id="section"
                          value={form.section}
                          onChange={(e) => set("section", e.target.value)}
                          className={`${selectClass} pl-10 ${errors.section ? "border-red-500/50" : ""}`}
                        >
                          <option value="" disabled>
                            Select section
                          </option>
                          {SECTIONS.map((s) => (
                            <option key={s} value={s} className="bg-[#0d1317]">
                              {s}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      {errors.section && (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.section}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="year" className={labelClass}>
                        Year *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <Calendar className="w-4 h-4" />
                        </span>
                        <select
                          id="year"
                          value={form.year}
                          onChange={(e) => set("year", e.target.value)}
                          className={`${selectClass} pl-10 ${errors.year ? "border-red-500/50" : ""}`}
                        >
                          <option value="" disabled>
                            Select year
                          </option>
                          {YEARS.map((y) => (
                            <option key={y} value={y} className="bg-[#0d1317]">
                              {y}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                      </div>
                      {errors.year && (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.year}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="collegeMail" className={labelClass}>
                        College Mail *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <Mail className="w-4 h-4" />
                        </span>
                        <input
                          id="collegeMail"
                          type="email"
                          value={form.collegeMail}
                          readOnly
                          placeholder="you@crescent.education"
                          className={`${inputClass} pl-10 pr-24 opacity-80 cursor-not-allowed ${errors.collegeMail ? "border-red-500/50" : ""}`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-xs font-mono text-mint pointer-events-none">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      </div>
                      {errors.collegeMail ? (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.collegeMail}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-gray-500 font-mono">
                          Verified via your college Google account · one application per email address
                        </p>
                      )}
                      {alreadyApplied && (
                        <div className="mt-3 flex flex-col gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs font-mono text-amber-300">
                          <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>
                              An application has already been submitted with this email. Please contact
                              the team directly for any follow-ups or updates.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setWithdrawOpen(true);
                              setWithdrawReason("");
                              setWithdrawError(null);
                            }}
                            className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Withdraw / Delete Application
                          </button>
                        </div>
                      )}
                      {withdrawMsg && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 text-xs font-mono text-emerald-300">
                          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                          <span>{withdrawMsg}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label htmlFor="contactNumber" className={labelClass}>
                        Contact Number *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                          <Phone className="w-4 h-4" />
                        </span>
                        <input
                          id="contactNumber"
                          type="tel"
                          value={form.contactNumber}
                          onChange={(e) => set("contactNumber", e.target.value)}
                          placeholder="+91 98765 43210"
                          className={`${inputClass} pl-10 ${errors.contactNumber ? "border-red-500/50" : ""}`}
                        />
                      </div>
                      {errors.contactNumber && (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.contactNumber}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-gray-600 font-mono">Step 1 of 2</p>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="role" className={labelClass}>
                      Role Applying For *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                        <BadgeCheck className="w-4 h-4" />
                      </span>
                      <select
                        id="role"
                        value={form.role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={!rolesLoaded}
                        className={`${selectClass} pl-10 ${errors.role ? "border-red-500/50" : ""}`}
                      >
                        <option value="" disabled>
                          {rolesLoaded ? "Select a role" : "Loading roles…"}
                        </option>
                        {visibleRoles.map((r) => (
                          <option key={r} value={r} className="bg-[#0d1317]">
                            {displayJoinRole(r, roleLabels)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                    {errors.role ? (
                      <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.role}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-gray-500 font-mono">
                        Pick the team you&apos;d like to join. Roles listed here are currently open.
                      </p>
                    )}

                    {form.role && (
                      <div className="mt-4">
                        <RoleInfoPanel
                          role={form.role}
                          description={roleDescriptionFor(form.role)}
                          rules={roleRulesFor(form.role)}
                          roleLabels={roleLabels}
                          accepted={acceptedRoleRules}
                          onToggle={() => {
                            setAcceptedRoleRules((v) => !v);
                            setErrors((prev) => {
                              if (!("rules" in prev)) return prev;
                              const next = { ...prev };
                              delete next.rules;
                              return next;
                            });
                          }}
                          error={errors.rules}
                        />
                      </div>
                    )}
                  </div>

                  <TagInput
                    id="interests"
                    label="Interests *"
                    placeholder="Type & press Enter, or pick from the dropdown…"
                    values={form.interests}
                    onChange={(v) => set("interests", v)}
                    suggestions={INTEREST_SUGGESTIONS}
                    error={errors.interests}
                    hint="Type your own or choose from suggestions"
                  />

                  <TagInput
                    id="skills"
                    label="Skills *"
                    placeholder="Type & press Enter, or pick from the dropdown…"
                    values={form.skills}
                    onChange={(v) => set("skills", v)}
                    suggestions={SKILL_SUGGESTIONS}
                    error={errors.skills}
                    hint="Type your own or choose from suggestions"
                  />

                  <div>
                    <label htmlFor="reason" className={labelClass}>
                      Why do you want to join? *
                    </label>
                    <textarea
                      id="reason"
                      rows={4}
                      value={form.reason}
                      onChange={(e) => set("reason", e.target.value)}
                      placeholder="Tell us what you're passionate about and what you hope to contribute…"
                      className={`${textareaClass} ${errors.reason ? "border-red-500/50" : ""}`}
                    />
                    {errors.reason && (
                      <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.reason}</p>
                    )}
                  </div>

                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <UrlField
                      id="linkedinUrl"
                      label="LinkedIn"
                      icon={<AtSign className="w-4 h-4" />}
                      value={form.linkedinUrl}
                      onChange={(v) => set("linkedinUrl", v)}
                      error={errors.linkedinUrl}
                    />
                    <UrlField
                      id="githubUrl"
                      label="GitHub"
                      icon={<Link2 className="w-4 h-4" />}
                      value={form.githubUrl}
                      onChange={(v) => set("githubUrl", v)}
                      error={errors.githubUrl}
                    />
                    <UrlField
                      id="socialMediaUrl"
                      label="Social Media"
                      icon={<Globe className="w-4 h-4" />}
                      value={form.socialMediaUrl}
                      onChange={(v) => set("socialMediaUrl", v)}
                      error={errors.socialMediaUrl}
                    />
                    <UrlField
                      id="portfolioUrl"
                      label="Portfolio"
                      icon={<FileText className="w-4 h-4" />}
                      value={form.portfolioUrl}
                      onChange={(v) => set("portfolioUrl", v)}
                      error={errors.portfolioUrl}
                    />
                  </div>

                  {/* Contact consent */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => (consented ? setConsented(false) : setConsentOpen(true))}
                      className="flex items-start gap-3 w-full text-left p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-mint/40 transition-colors"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          consented ? "bg-mint border-mint text-black" : "bg-black/40 border-white/20"
                        }`}
                      >
                        {consented && <Check className="w-3.5 h-3.5" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">
                          I agree to be contacted by CTC
                        </span>
                        <span className="block text-xs text-gray-500 font-mono mt-0.5">
                          Tap to review the contact consent agreement
                        </span>
                      </span>
                    </button>
                  </div>

                  {submitError && (
                    <div className="p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 bg-red-950/60 border border-red-500/40 text-red-400">
                      <X className="w-4 h-4 shrink-0" />
                      {submitError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrors({});
                        setStep(1);
                        scrollToTop();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-600 font-mono hidden sm:block">Step 2 of 2</p>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? "Submitting…" : "Submit Application"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
            )}
          </>
        )}
      </div>

      {/* Contact consent modal */}
      {consentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setConsentOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-6 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-mint/15 border border-mint/30 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-mint" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Contact Consent</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              By agreeing, you give Crescent Technocrats Club (CTC) permission to contact you at the
              email and phone number you provided, for club activities, event announcements,
              recruitment, and mentorship opportunities. Your details will never be shared with
              third parties.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setConsented(true);
                  setConsentOpen(false);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all"
              >
                <Check className="w-4 h-4" />
                I Agree
              </button>
              <button
                type="button"
                onClick={() => setConsentOpen(false)}
                className="flex-1 px-5 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Applicant Withdrawal / Deletion modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="absolute inset-0"
            onClick={() => {
              if (!withdrawBusy) setWithdrawOpen(false);
            }}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0d1317] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-red-400" />
                  Delete Application
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Permanently withdraw and delete your submitted application.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!withdrawBusy) setWithdrawOpen(false);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-mono">
                {withdrawError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2">
                Reason for Deleting *
              </label>
              <textarea
                autoFocus
                rows={3}
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                placeholder="e.g. Applied by mistake, entered wrong details, no longer available..."
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setWithdrawOpen(false)}
                disabled={withdrawBusy}
                className="px-4 py-2.5 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleWithdrawApplication}
                disabled={withdrawBusy || !withdrawReason.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
              >
                {withdrawBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom cursor overlay — hidden on touch devices */}
      {!isTouchDevice && (
        <div
          ref={cursorPngRef}
          className="fixed top-0 left-0 w-12 h-12 pointer-events-none z-[9999] transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: cursorVisible ? 1 : 0 }}
        >
          <img
            src="/assets/cursor.png"
            alt=""
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}
