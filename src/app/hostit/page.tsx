"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, XCircle, Award, Calendar, Users, FileText, Layers, Phone, GraduationCap, ShieldCheck, ChevronDown } from "lucide-react";

const EVENT_TYPES = [
  "Seminar",
  "Workshop",
  "Tech Talks",
  "Community Events",
];

const DEPARTMENTS = [
  "Computer Science & Engineering",
  "Artificial Intelligence & Data Science",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Biotechnology",
  "Aerospace Engineering",
  "Automobile Engineering",
  "Food Technology",
  "Polymer Technology",
  "Pharmacy",
  "Law",
  "Commerce",
  "Business Administration (BBA)",
  "Commerce (B.Com)",
  "Economics",
  "English",
  "Design (B.Des)",
  "Architecture & Planning",
  "Visual Communication",
  "Mathematics",
  "Computer Applications (BCA)",
  "Physical Education",
  "Library & Information Science",
  "Media & Communication",
  "Interdisciplinary Studies",
  "Management (MBA)",
  "Science & Humanities",
  "Other",
];

const YEARS = ["I", "II", "III", "IV", "M.Tech / M.Sc"];

const DEGREES = [
  "B.Tech",
  "BCA",
  "B.Sc",
  "B.Com",
  "BBA",
  "B.Des",
  "B.Arch",
  "MCA",
  "M.Tech",
  "M.Sc",
  "MBA",
  "PhD",
  "Other",
];

const inputCls =
  "w-full px-4 py-3.5 rounded-2xl bg-[#0b120f]/80 border border-emerald-400/20 font-sans text-base text-[#ecfdf5] placeholder:text-slate-600 focus:bg-[#0b120f] focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/60 transition-all";

const labelCls =
  "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] font-bold text-emerald-400";

export default function HostItPage() {
  const [formData, setFormData] = useState({
    eventType: "Seminar",
    organizerName: "",
    email: "",
    contactNumber: "",
    degree: "B.Tech",
    department: DEPARTMENTS[0],
    section: "",
    year: "",
    expectedAttendees: "50-100",
    description: "",
    proposedDate: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptQuery, setDeptQuery] = useState("");
  const [emailError, setEmailError] = useState("");
  const [contactError, setContactError] = useState("");

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const cursorPngRef = useRef<HTMLDivElement>(null);
  const guidelinesRef = useRef<HTMLDivElement>(null);
  const macHoverRef = useRef(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [macHover, setMacHover] = useState(false);

  // 3D Chromatic Grid Canvas Render Loop (same backdrop as home hostit section)
  useEffect(() => {
    const canvas = gridRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const cols = 26;
    const rows = 18;
    const focalLength = 320;
    const resScale = 0.5;
    let width = (canvas.width = window.innerWidth * resScale);
    let height = (canvas.height = window.innerHeight * resScale);

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleResize = () => {
      width = canvas.width = window.innerWidth * resScale;
      height = canvas.height = window.innerHeight * resScale;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) * resScale;
      mouseY = (e.clientY - rect.top) * resScale;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    const render = () => {
      time += 0.012;

      ctx.fillStyle = "#080c0b";
      ctx.fillRect(0, 0, width, height);

      const rx = 1.1 + Math.sin(time * 0.1) * 0.05;
      const ry = Math.sin(time * 0.15) * 0.1;

      const cosRx = Math.cos(rx);
      const sinRx = Math.sin(rx);
      const cosRy = Math.cos(ry);
      const sinRy = Math.sin(ry);

      const centerX = width / 2;
      const centerY = height * 0.45;

      const points: { sx: number; sy: number }[][] = [];

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        for (let c = 0; c < cols; c++) {
          const px = (c / (cols - 1) - 0.5) * width * 1.6;
          const py = (r / (rows - 1) - 0.5) * height * 1.5;

          const wave1 = Math.sin(c * 0.25 + time * 1.2) * Math.cos(r * 0.25 - time * 0.8);
          const wave2 = Math.sin(r * 0.15 - time * 2.0) * 0.5;
          let pz = (wave1 + wave2) * 35;

          const tempX = px * cosRy;
          const tempY = py * cosRx;
          const distToMouse = Math.sqrt(
            Math.pow(centerX + tempX - mouseX, 2) + Math.pow(centerY + tempY - mouseY, 2)
          );
          if (distToMouse < 220) {
            const pushFactor = (220 - distToMouse) / 220;
            pz += Math.sin(time * 6 + distToMouse * 0.1) * 20 * pushFactor;
          }

          const y1 = py * cosRx - pz * sinRx;
          const z1 = py * sinRx + pz * cosRx;
          const x2 = px * cosRy + z1 * sinRy;
          const z2 = -px * sinRy + z1 * cosRy;

          const scale = focalLength / (focalLength + z2);
          points[r][c] = {
            sx: centerX + x2 * scale,
            sy: centerY + y1 * scale,
          };
        }
      }

      for (let r = 0; r < rows; r++) {
        ctx.beginPath();
        for (let c = 0; c < cols; c++) {
          const pt = points[r][c];
          if (c === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }

        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, `hsla(${(r / rows) * 60 + time * 25}, 80%, 55%, 0.12)`);
        grad.addColorStop(0.3, `hsla(${(r / rows) * 60 + 120 + time * 25}, 80%, 55%, 0.22)`);
        grad.addColorStop(0.7, `hsla(${(r / rows) * 60 + 240 + time * 25}, 80%, 55%, 0.22)`);
        grad.addColorStop(1, `hsla(${(r / rows) * 60 + time * 25}, 80%, 55%, 0.12)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      for (let c = 0; c < cols; c += 2) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          const pt = points[r][c];
          if (r === 0) ctx.moveTo(pt.sx, pt.sy);
          else ctx.lineTo(pt.sx, pt.sy);
        }

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `hsla(${(c / cols) * 120 + time * 20}, 75%, 60%, 0.05)`);
        grad.addColorStop(0.5, `hsla(${(c / cols) * 120 + 180 + time * 20}, 75%, 60%, 0.18)`);
        grad.addColorStop(1, `hsla(${(c / cols) * 120 + time * 20}, 75%, 60%, 0.05)`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: none)");
    const t = window.setTimeout(() => setIsTouchDevice(mq.matches), 0);
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      clearTimeout(t);
      mq.removeEventListener("change", handler);
    };
  }, []);

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
      const overMac =
        !!targetEl &&
        typeof targetEl.closest === "function" &&
        !!targetEl.closest(
          "a[href], button, [role='button'], input, textarea, select"
        );
      if (overMac !== macHoverRef.current) {
        macHoverRef.current = overMac;
        setMacHover(overMac);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const emailOk = /^[a-zA-Z0-9._%+-]+@crescent\.education$/i.test(formData.email);
    const contactOk = /^[6-9]\d{9}$/.test(formData.contactNumber);
    setEmailError(
      emailOk ? "" : "Please use your official college email ending in @crescent.education."
    );
    setContactError(contactOk ? "" : "Enter a valid 10-digit mobile number.");

    if (!emailOk || !contactOk) return;
    setSubmitted(true);
  };

  useEffect(() => {
    if (acceptedGuidelines) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [acceptedGuidelines]);

  return (
    <main className="relative min-h-screen w-full bg-[#080c0b] text-[#ecfdf5] font-sans selection:bg-emerald-300 selection:text-[#080c0b]">
      <style>{`
        @keyframes hostit-page-spin { 100% { transform: rotate(360deg); } }
        @keyframes hostit-page-fade-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-hostit-page-fade-up { animation: hostit-page-fade-up 0.6s ease-out both; }
        @keyframes hostit-btn-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes hostit-btn-breathe {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        .animate-hostit-btn-flow { animation: hostit-btn-flow 6s ease-in-out infinite; background-size: 250% 250%; }
      `}</style>

      {/* Fixed 3D Chromatic Grid Backdrop */}
      <canvas
        ref={gridRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
      />

      {/* Scanlines, cyber grid & ambient glows */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(52, 211, 153, 0.15) 1px, transparent 1px),
              linear-gradient(-45deg, rgba(52, 211, 153, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute inset-0 bg-cyber-grid opacity-50" />
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto py-12 px-4 sm:px-6">
        {/* Back Link */}
        <div className="mb-10">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full glass-badge font-mono text-xs font-bold tracking-wider uppercase text-emerald-300 hover:text-emerald-200 hover:border-emerald-400/60 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" />
            <span>Back to CTC Home</span>
          </Link>
        </div>

        {/* Header Hero */}
        <div className="relative text-center mb-14 flex flex-col items-center">
          {/* Rotating HUD ring behind the header */}
          <div className="absolute -top-24 w-[420px] h-[420px] sm:w-[560px] sm:h-[560px] rounded-full border border-dashed border-emerald-400/15 pointer-events-none animate-[hostit-page-spin_50s_linear_infinite]" />
          <div className="absolute -top-10 w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] rounded-full border border-emerald-400/5 pointer-events-none animate-[hostit-page-spin_30s_linear_infinite_reverse]" />

          <div className="flex items-center gap-3 mb-6">
            <span className="w-6 h-[1px] bg-emerald-400/50" />
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
              Crescent Technical Club ✦ Hosting Portal
            </span>
            <span className="w-6 h-[1px] bg-emerald-400/50" />
          </div>

          <h1 className="relative font-sans text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6">
            <span className="block text-white">HOST YOUR EVENT</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-300 to-emerald-300 animate-text-gradient">
              WITH CTC
            </span>
          </h1>

          <p className="relative text-base sm:text-xl text-slate-400 max-w-2xl leading-relaxed">
            Have a passion project, tech session, or hackathon in mind? Pitch it to
            us and let&apos;s build an extraordinary experience together.
          </p>
        </div>

        {/* Form Container */}
        <div className="relative">
          {/* HUD corner brackets */}
          <span className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-emerald-400/50 rounded-tl-lg pointer-events-none z-10" />
          <span className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-emerald-400/50 rounded-tr-lg pointer-events-none z-10" />
          <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-emerald-400/50 rounded-bl-lg pointer-events-none z-10" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-emerald-400/50 rounded-br-lg pointer-events-none z-10" />

          {submitted ? (
            <div className="glass-card rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center gap-6 animate-hostit-page-fade-up">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center justify-center text-[#080c0b] shadow-[0_0_30px_rgba(52,211,153,0.5)]">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="font-sans text-3xl sm:text-4xl font-black tracking-tight text-white">
                PROPOSAL RECEIVED
              </h2>

              <p className="font-sans text-lg text-slate-300 max-w-lg leading-relaxed">
                Thank you,{" "}
                <span className="font-bold text-emerald-300">
                  {formData.organizerName}
                </span>
                ! Our CTC core team will review your proposal and contact you at{" "}
                <span className="font-mono font-semibold text-cyan-300">
                  {formData.email}
                </span>{" "}
                shortly.
              </p>

              <div className="pt-4 flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-3 rounded-full brutal-btn-primary font-sans text-sm font-bold tracking-wider uppercase"
                >
                  Submit Another Event
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 rounded-full glass-badge font-sans text-sm font-bold tracking-wider uppercase text-emerald-300 hover:text-emerald-200 hover:border-emerald-400/60 transition-all duration-300"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="glass-card rounded-3xl p-6 sm:p-10 space-y-8"
            >
              {/* Event Category Selector */}
              <div className="space-y-3">
                <label className={labelCls}>
                  <Layers className="w-4 h-4" />
                  <span>Event Category *</span>
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {EVENT_TYPES.map((type) => {
                    const active = formData.eventType === type;
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setFormData({ ...formData, eventType: type })}
                        className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider border transition-all ${
                          active
                            ? "bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#080c0b] border-transparent shadow-[0_0_20px_rgba(52,211,153,0.4)] -translate-y-0.5"
                            : "bg-[#0b120f]/60 text-slate-400 border-emerald-400/20 hover:text-emerald-300 hover:border-emerald-400/50"
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Organizer Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>
                    <Users className="w-4 h-4" />
                    <span>Organizer Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your full name"
                    value={formData.organizerName}
                    onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>
                    <span>Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. your-regno@crescent.education"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (emailError) setEmailError("");
                    }}
                    className={inputCls}
                  />
                  {emailError && (
                    <p className="text-xs text-rose-400 font-medium">{emailError}</p>
                  )}
                  <p className="text-[11px] text-slate-500 font-medium">
                    Only official college emails (@crescent.education) are accepted.
                  </p>
                </div>
              </div>

              {/* Contact Number & Degree */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>
                    <Phone className="w-4 h-4" />
                    <span>Contact Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      setFormData({ ...formData, contactNumber: e.target.value.replace(/\D/g, "") });
                      if (contactError) setContactError("");
                    }}
                    className={inputCls}
                  />
                  {contactError && (
                    <p className="text-xs text-rose-400 font-medium">{contactError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>
                    <Award className="w-4 h-4" />
                    <span>Degree *</span>
                  </label>
                  <select
                    required
                    value={formData.degree}
                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                    className={`${inputCls} bg-[#0b120f]`}
                  >
                    {DEGREES.map((degree) => (
                      <option key={degree} value={degree} className="bg-[#0b120f] text-[#ecfdf5]">
                        {degree}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>
                    <GraduationCap className="w-4 h-4" />
                    <span>Department *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => {
                        setFormData({ ...formData, department: e.target.value });
                        setDeptQuery(e.target.value);
                        setDeptOpen(true);
                      }}
                      onFocus={() => setDeptOpen(true)}
                      onBlur={() =>
                        setTimeout(() => {
                          setDeptOpen(false);
                          setDeptQuery("");
                        }, 150)
                      }
                      placeholder="Type or select your department..."
                      className={`${inputCls} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setDeptOpen((v) => !v)}
                      tabIndex={-1}
                      aria-label="Toggle department list"
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-emerald-400 transition-colors"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 ${deptOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {deptOpen && (
                      <ul className="absolute z-20 mt-2 w-full max-h-56 overflow-y-auto rounded-2xl border border-emerald-400/20 bg-[#0b120f]/95 backdrop-blur-xl shadow-2xl shadow-black/60 py-1.5">
                        {DEPARTMENTS.filter((d) =>
                          d.toLowerCase().includes(deptQuery.toLowerCase())
                        ).map((dept) => (
                          <li key={dept}>
                            <button
                              type="button"
                              onMouseDown={() => {
                                setFormData({ ...formData, department: dept });
                                setDeptQuery(dept);
                                setDeptOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 font-sans text-sm transition-colors ${
                                formData.department === dept
                                  ? "bg-emerald-400/15 text-emerald-300"
                                  : "text-slate-300 hover:bg-emerald-400/10 hover:text-white"
                              }`}
                            >
                              {dept}
                            </button>
                          </li>
                        ))}
                        {DEPARTMENTS.filter((d) =>
                          d.toLowerCase().includes(deptQuery.toLowerCase())
                        ).length === 0 && (
                          <li className="px-4 py-2.5 text-slate-500 font-sans text-sm">
                            No match for &ldquo;{deptQuery}&rdquo; — you can still continue with your own text.
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>
                    <Users className="w-4 h-4" />
                    <span>Section *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. A"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Year of Study & Expected Participants */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className={labelCls}>
                    <Calendar className="w-4 h-4" />
                    <span>Year of Study *</span>
                  </label>
                  <select
                    required
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className={`${inputCls} bg-[#0b120f]`}
                  >
                    <option value="" disabled className="bg-[#0b120f] text-slate-500">
                      Select your year
                    </option>
                    {YEARS.map((y) => (
                      <option key={y} value={y} className="bg-[#0b120f] text-[#ecfdf5]">
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className={labelCls}>
                    <Users className="w-4 h-4" />
                    <span>Expected Participants</span>
                  </label>
                  <select
                    value={formData.expectedAttendees}
                    onChange={(e) => setFormData({ ...formData, expectedAttendees: e.target.value })}
                    className={`${inputCls} bg-[#0b120f]`}
                  >
                    <option value="20-50" className="bg-[#0b120f] text-[#ecfdf5]">
                      20 - 50 participants
                    </option>
                    <option value="50-100" className="bg-[#0b120f] text-[#ecfdf5]">
                      50 - 100 participants
                    </option>
                    <option value="100-200" className="bg-[#0b120f] text-[#ecfdf5]">
                      100 - 200 participants
                    </option>
                    <option value="200+" className="bg-[#0b120f] text-[#ecfdf5]">
                      200+ participants (Grand Event)
                    </option>
                  </select>
                </div>
              </div>

              {/* Date / Month */}
              <div className="space-y-2">
                <label className={labelCls}>
                  <Calendar className="w-4 h-4" />
                  <span>Date / Month</span>
                </label>
                <input
                  type="date"
                  value={formData.proposedDate}
                  onChange={(e) => setFormData({ ...formData, proposedDate: e.target.value })}
                  className={`${inputCls} [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100`}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className={labelCls}>
                  <FileText className="w-4 h-4" />
                  <span>Description *</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us what your event is about, what resources or venue support you need, and why students will love it!"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputCls}
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-[#080c0b] font-sans text-base font-extrabold tracking-wider uppercase shadow-[0_0_25px_rgba(52,211,153,0.3)] hover:shadow-[0_0_45px_rgba(52,211,153,0.55)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3"
              >
                <span>Submit Event Proposal</span>
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-12 font-mono text-[10px] tracking-[0.35em] uppercase text-emerald-400/40">
          CRC ✦ Crescent Technical Club — Event Partnership Program © 2026
        </p>
      </div>

      {/* Guidelines Popup — must be accepted before using the portal */}
      {!acceptedGuidelines && (
        <div className={`fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-700 ${isAccepting ? 'opacity-0 pointer-events-none delay-100' : 'opacity-100'}`}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
          <div
            ref={guidelinesRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="guidelines-title"
            className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col glass-card rounded-3xl overflow-hidden animate-hostit-page-fade-up"
          >
            <div className="px-6 sm:px-10 py-6 border-b border-emerald-400/15 flex items-center justify-between gap-4 shrink-0">
              <div>
                <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-emerald-400 font-bold">
                  Event Partnership Guidelines
                </span>
                <h2
                  id="guidelines-title"
                  className="font-sans text-2xl sm:text-3xl font-black tracking-tight text-white mt-1"
                >
                  Before You Hit Submit...
                </h2>
              </div>
              <ShieldCheck className="w-9 h-9 text-emerald-400 shrink-0" />
            </div>

            <div className="px-6 sm:px-10 py-6 overflow-y-auto flex-1">
              <ul className="space-y-4 text-sm sm:text-base text-slate-300 leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="shrink-0">📅</span>
                  <span>
                    <strong className="font-bold text-emerald-300">Give us a head start.</strong>{" "}
                    Submit your proposal at least <strong className="font-bold text-white">3 weeks before</strong> your
                    planned event so we can sort out the venue, budget, and all the behind-the-scenes magic.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0">💡</span>
                  <span>
                    <strong className="font-bold text-emerald-300">Bring ideas that matter.</strong>{" "}
                    Workshops, hackathons, seminars, competitions, or community initiatives&mdash;we&apos;re all for events
                    that inspire and educate.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0">🤝</span>
                  <span>
                    <strong className="font-bold text-emerald-300">Team up with CTC.</strong>{" "}
                    Every approved event will have a CTC core team member working with you, and don&apos;t forget to show
                    some love with CTC branding!
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0">🚫</span>
                  <span>
                    <strong className="font-bold text-emerald-300">No spam, ads, or half-baked submissions.</strong>{" "}
                    Complete proposals have a much better chance of making it through.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="shrink-0">✅</span>
                  <span>
                    <strong className="font-bold text-emerald-300">Final call?</strong>{" "}
                    The CTC Executive Committee has the final say on all event proposals.
                  </span>
                </li>
              </ul>
            </div>

            <div className="px-6 sm:px-10 py-6 border-t border-emerald-400/15 shrink-0 flex items-center justify-center gap-5">
              <button
                onClick={() => {
                  setIsAccepting(true);
                  const el = guidelinesRef.current;
                  if (el) {
                    el.style.animation = "none";
                    gsap.fromTo(
                      el,
                      { y: 0, opacity: 1, scale: 1 },
                      {
                        y: -window.innerHeight * 0.85,
                        opacity: 0,
                        scale: 0.95,
                        duration: 0.7,
                        ease: "power2.inOut",
                        clearProps: "transform,opacity",
                        onComplete: () => setAcceptedGuidelines(true),
                      }
                    );
                  } else {
                    setAcceptedGuidelines(true);
                  }
                }}
                aria-label="Agree"
                className="group flex items-center h-14 rounded-full bg-emerald-400/10 border border-emerald-400/40 hover:border-emerald-300/80 hover:bg-gradient-to-r hover:from-emerald-400 hover:to-cyan-400 hover:shadow-[0_0_30px_rgba(52,211,153,0.45)] transition-all duration-500 ease-out"
              >
                <span className="flex items-center justify-center w-14 h-14 shrink-0 rounded-full">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 group-hover:text-[#052e22] group-hover:scale-110 transition-all duration-300" strokeWidth={3} />
                </span>
                <span className="max-w-0 group-hover:max-w-44 overflow-hidden whitespace-nowrap transition-[max-width] duration-500 ease-out">
                  <span className="inline-block font-sans text-sm font-black tracking-[0.15em] uppercase text-[#052e22] opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 pr-6 transition-all duration-500 delay-100">
                    Agree
                  </span>
                </span>
              </button>

              <Link
                href="/declined"
                aria-label="Decline"
                className="group flex items-center h-14 rounded-full bg-rose-500/10 border border-rose-400/40 hover:border-rose-300/80 hover:bg-gradient-to-r hover:from-rose-500 hover:to-rose-400 hover:shadow-[0_0_30px_rgba(244,63,94,0.35)] transition-all duration-500 ease-out"
              >
                <span className="flex items-center justify-center w-14 h-14 shrink-0 rounded-full">
                  <XCircle className="w-6 h-6 text-rose-400 group-hover:text-white group-hover:scale-110 transition-all duration-300" strokeWidth={3} />
                </span>
                <span className="max-w-0 group-hover:max-w-44 overflow-hidden whitespace-nowrap transition-[max-width] duration-500 ease-out">
                  <span className="inline-block font-sans text-sm font-black tracking-[0.15em] uppercase text-white opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 pr-6 transition-all duration-500 delay-100">
                    Decline
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Cursor PNG Overlay — hidden on touch/mobile devices */}
      {!isTouchDevice && (
        <div
          ref={cursorPngRef}
          className="fixed top-0 left-0 w-12 h-12 pointer-events-none z-[96] transition-opacity duration-300 -translate-x-1/2 -translate-y-1/2"
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
    </main>
  );
}
