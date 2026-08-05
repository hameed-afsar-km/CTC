"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  FileText,
  Globe,
  GraduationCap,
  Info,
  Layers,
  Link2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import {
  BRANCHES,
  DEGREES,
  INTEREST_SUGGESTIONS,
  SECTIONS,
  SKILL_SUGGESTIONS,
  YEARS,
  isValidUrl,
} from "@/lib/applications";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLLEGE_EMAIL_RE = /^[^\s@]+@crescent\.education$/i;
const PHONE_RE = /^[+]?[\d\s()-]{10,15}$/;

const labelClass =
  "block text-[11px] font-mono uppercase tracking-wider text-gray-400 mb-2";
const inputClass =
  "w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-mint/60 focus:ring-2 focus:ring-mint/20 transition-all";
const selectClass = inputClass + " appearance-none pr-10";
const textareaClass = inputClass + " resize-none";

interface FormState {
  fullName: string;
  collegeMail: string;
  contactNumber: string;
  degree: string;
  branch: string;
  section: string;
  year: string;
  interests: string[];
  skills: string[];
  reason: string;
  linkedinUrl: string;
  githubUrl: string;
  socialMediaUrl: string;
  portfolioUrl: string;
}

const INITIAL_FORM: FormState = {
  fullName: "",
  collegeMail: "",
  contactNumber: "",
  degree: "",
  branch: "",
  section: "",
  year: "",
  interests: [],
  skills: [],
  reason: "",
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
        {open && filtered.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-full mt-2 rounded-xl bg-[#101820] border border-white/10 shadow-2xl overflow-hidden max-h-64 overflow-y-auto">
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

export default function JoinPage() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const cursorPngRef = useRef<HTMLDivElement>(null);
  const macHoverRef = useRef(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [macHover, setMacHover] = useState(false);

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
  const [dailyLimit, setDailyLimit] = useState(false);

  // A person can only apply once per 24 hours — check the college mail as it
  // is typed and surface an early "contact the team" notice before submission.
  useEffect(() => {
    const email = form.collegeMail.trim();
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!COLLEGE_EMAIL_RE.test(email)) {
        setDailyLimit(false);
        return;
      }
      fetch(`/api/applications/status?email=${encodeURIComponent(email)}`, {
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled) setDailyLimit(!!d.appliedToday);
        })
        .catch(() => {
          if (!cancelled) setDailyLimit(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [form.collegeMail]);

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
    const collegeMail = form.collegeMail.trim();
    if (!EMAIL_RE.test(collegeMail)) {
      e.collegeMail = "Enter a valid college email";
    } else if (!COLLEGE_EMAIL_RE.test(collegeMail)) {
      e.collegeMail = "Only your official college email (@crescent.education) is accepted";
    }
    if (!PHONE_RE.test(form.contactNumber.trim())) e.contactNumber = "Enter a valid contact number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.degree) e.degree = "Select your degree";
    if (!form.branch) e.branch = "Select your branch";
    if (!form.section) e.section = "Select your section";
    if (!form.year) e.year = "Select your year";
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
    if (dailyLimit) {
      setErrors((prev) => ({
        ...prev,
        collegeMail:
          "You've already applied today. Please contact the team directly for any follow-ups or updates.",
      }));
      return;
    }
    setErrors({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (dailyLimit) {
      setSubmitError(
        "You've already applied today. Please contact the team directly for any follow-ups or updates."
      );
      return;
    }
    if (!validateStep2()) return;
    if (!consented) {
      setConsentOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, consented }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ||
            "Your application could not be submitted. Please try again."
        );
      }
      setSubmitted(true);
      setSubmittedName(form.fullName);
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
              <p className="text-sm text-gray-400 mt-4 max-w-sm leading-relaxed">
                Thanks {submittedName || "for applying"}! Your application is with the team — we&apos;ll
                reach out at your college email or phone number with the next steps.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-mint hover:bg-mint-light text-black font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                >
                  Back to Homepage
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setForm(INITIAL_FORM);
                    setSubmitted(false);
                    setConsented(false);
                    setErrors({});
                    setStep(1);
                    window.scrollTo({ top: 0 });
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/15 text-gray-300 hover:bg-white/5 hover:text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Submit Another
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="mb-10">
              <div className="text-shine text-[10px] font-mono uppercase tracking-widest font-medium mb-4">
                Applications Open
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Join the Club
              </h1>
              <p className="text-sm text-gray-400 mt-3 max-w-md leading-relaxed">
                Become part of Crescent Technocrats Club — build, ship, and grow with a community
                of student engineers, designers, and innovators.
              </p>
            </header>

            <div className="rounded-3xl bg-[#0d1317] border border-white/10 shadow-2xl p-6 sm:p-10">
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
                          onChange={(e) => set("collegeMail", e.target.value)}
                          placeholder="you@crescent.education"
                          className={`${inputClass} pl-10 ${errors.collegeMail ? "border-red-500/50" : ""}`}
                        />
                      </div>
                      {errors.collegeMail ? (
                        <p className="mt-1.5 text-xs text-red-400 font-mono">{errors.collegeMail}</p>
                      ) : (
                        <p className="mt-1.5 text-xs text-gray-500 font-mono">
                          Only @crescent.education emails are accepted · one application per person per day
                        </p>
                      )}
                      {dailyLimit && (
                        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/40 p-3 text-xs font-mono text-amber-300">
                          <Info className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            You&apos;ve already applied today. Please contact the team directly for any
                            follow-ups or updates.
                          </span>
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

                  <div className="grid grid-cols-2 gap-5">
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
                            Select
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
                            Select
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
                        window.scrollTo({ top: 0, behavior: "smooth" });
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
            </div>
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

      {/* Custom cursor overlay — hidden on touch devices */}
      {!isTouchDevice && (
        <div
          ref={cursorPngRef}
          className="fixed top-0 left-0 w-12 h-12 pointer-events-none z-[99] transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2"
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
