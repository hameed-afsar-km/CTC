"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Send, CheckCircle2, Rocket, Calendar, Users, FileText, Layers } from "lucide-react";

const EVENT_TYPES = [
  "Workshops",
  "Hackathons",
  "Seminars",
  "Tech Talks",
  "Community Events",
];

export default function HostItPage() {
  const [formData, setFormData] = useState({
    eventTitle: "",
    eventType: "Workshops",
    organizerName: "",
    email: "",
    expectedAttendees: "50-100",
    description: "",
    proposedDate: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-[#f6fcf8] text-slate-900 font-sans selection:bg-emerald-300 selection:text-slate-900 py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Anime Grid & Dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(52,211,153,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-slate-900 shadow-[3px_3px_0px_#000] font-syne text-xs font-bold tracking-wider uppercase text-slate-900 hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform duration-200"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Back to CTC Home</span>
          </Link>
        </div>

        {/* Header Hero */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border-2 border-emerald-600 text-emerald-900 text-xs font-mono tracking-widest font-bold uppercase shadow-[3px_3px_0px_#059669] mb-4">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-spin-slow" />
            <span>CRESCENT TECHNICAL CLUB ✦ HOSTING PORTAL</span>
          </div>

          <h1 className="font-syne text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none text-slate-900 drop-shadow-[4px_4px_0px_#34d399] mb-4">
            HOST YOUR EVENT WITH CTC
          </h1>

          <p className="font-sans text-base sm:text-xl text-slate-700 max-w-2xl leading-relaxed">
            Have a passion project, tech session, or hackathon in mind? Pitch it to us and let&apos;s build an extraordinary experience together!
          </p>
        </div>

        {/* Form Container */}
        {submitted ? (
          <div className="bg-white rounded-3xl border-4 border-slate-900 shadow-[10px_10px_0px_#34d399] p-8 sm:p-12 text-center flex flex-col items-center gap-6 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-slate-900 flex items-center justify-center text-emerald-600 shadow-[4px_4px_0px_#000]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="font-syne text-3xl sm:text-4xl font-black text-slate-900">
              PROPOSAL RECEIVED! 🚀
            </h2>

            <p className="font-sans text-lg text-slate-700 max-w-lg leading-relaxed">
              Thank you, <span className="font-bold text-emerald-700">{formData.organizerName}</span>! Our CTC core team will review your proposal for <span className="font-bold text-slate-900">&ldquo;{formData.eventTitle}&rdquo;</span> and contact you at <span className="font-mono font-semibold">{formData.email}</span> shortly.
            </p>

            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-3 rounded-full bg-slate-900 text-white font-syne text-sm font-bold tracking-wider uppercase border-2 border-slate-900 shadow-[4px_4px_0px_#34d399] hover:-translate-y-0.5 transition-transform"
              >
                Submit Another Event
              </button>
              <Link
                href="/"
                className="px-6 py-3 rounded-full bg-amber-300 text-slate-900 font-syne text-sm font-bold tracking-wider uppercase border-2 border-slate-900 shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 transition-transform"
              >
                Return to Home
              </Link>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl border-4 border-slate-900 shadow-[12px_12px_0px_#6366f1] p-6 sm:p-10 space-y-8"
          >
            {/* Event Title */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                <Rocket className="w-4 h-4 text-emerald-600" />
                <span>Event Title *</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AI-Powered Web Dev Sprint 2026"
                value={formData.eventTitle}
                onChange={(e) => setFormData({ ...formData, eventTitle: e.target.value })}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 font-sans text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[3px_3px_0px_#000] transition-all"
              />
            </div>

            {/* Event Category Selector */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                <Layers className="w-4 h-4 text-emerald-600" />
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
                      className={`px-4 py-2.5 rounded-xl font-syne text-xs font-bold uppercase tracking-wider border-2 border-slate-900 transition-all ${
                        active
                          ? "bg-emerald-400 text-slate-900 shadow-[3px_3px_0px_#000] -translate-y-0.5"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
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
                <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Organizer / Lead Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={formData.organizerName}
                  onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 font-sans text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[3px_3px_0px_#000] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                  <span>Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@crescent.edu.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 font-sans text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[3px_3px_0px_#000] transition-all"
                />
              </div>
            </div>

            {/* Expected Attendees & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Expected Attendees</span>
                </label>
                <select
                  value={formData.expectedAttendees}
                  onChange={(e) => setFormData({ ...formData, expectedAttendees: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 font-sans text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[3px_3px_0px_#000] transition-all"
                >
                  <option value="20-50">20 - 50 participants</option>
                  <option value="50-100">50 - 100 participants</option>
                  <option value="100-200">100 - 200 participants</option>
                  <option value="200+">200+ participants (Grand Event)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>Proposed Date / Month</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late October 2026"
                  value={formData.proposedDate}
                  onChange={(e) => setFormData({ ...formData, proposedDate: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 font-sans text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[3px_3px_0px_#000] transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-syne font-black text-sm uppercase tracking-wider text-slate-900">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Event Brief & Vision *</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Tell us what your event is about, what resources or venue support you need, and why students will love it!"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-900 font-sans text-base text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-[3px_3px_0px_#000] transition-all"
              />
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-syne text-base font-extrabold tracking-wider uppercase border-2 border-slate-900 shadow-[6px_6px_0px_#34d399] hover:shadow-[8px_8px_0px_#6366f1] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-3"
            >
              <span>Submit Event Proposal</span>
              <Send className="w-5 h-5 text-emerald-400" />
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
