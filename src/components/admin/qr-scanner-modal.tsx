"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  UserCheck,
  GraduationCap,
  Sparkles,
  RotateCw,
  FlipHorizontal2,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import type { EventRegistration } from "@/lib/registrations";
import { useAdmin } from "./admin-context";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  registrations: EventRegistration[];
  onCheckIn: (regId: string, attended: boolean) => Promise<boolean>;
  selectedEventId: string;
}

interface ScanResult {
  type: "success" | "already-checked" | "not-found" | "error";
  message: string;
  registration?: EventRegistration;
  scannedAt: string;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  registrations,
  onCheckIn,
  selectedEventId,
}: Props) {
  const { getToken } = useAdmin();
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [manualCode, setManualCode] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [mirrorEnabled, setMirrorEnabled] = useState(false);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef(false);
  const isStartingRef = useRef(false);
  const lastScannedCodeRef = useRef<string>("");
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const camerasRef = useRef<{ id: string; label: string }[]>([]);
  // Keep ref in sync for stable startScanner
  useEffect(() => {
    camerasRef.current = cameras;
  }, [cameras]);

  // Play subtle confirmation beep
  const playBeep = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (success) {
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      }
    } catch {
      // Audio context might be restricted before interaction
    }
  }, [soundEnabled]);

  // Handle barcode / QR text resolution
  const processDecodedText = useCallback(
    async (decodedText: string) => {
      if (processing) return;

      const raw = decodedText.trim();
      if (!raw || raw === lastScannedCodeRef.current) return;

      lastScannedCodeRef.current = raw;
      setProcessing(true);

      // Reset last scanned cache after 3 seconds so same pass can be rescanned if needed
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = setTimeout(() => {
        lastScannedCodeRef.current = "";
      }, 3000);

      // Parse payload: CTC-VERIFY:<id>:<ticketCode>:<collegeEmail> or raw ticketCode
      let matchedReg: EventRegistration | undefined;

      if (raw.startsWith("CTC-VERIFY:")) {
        const parts = raw.split(":");
        const docId = parts[1];
        const ticketCode = parts[2];
        const email = parts[3]?.toLowerCase();

        matchedReg = registrations.find(
          (r) =>
            r.id === docId ||
            (ticketCode && r.ticketCode.toLowerCase() === ticketCode.toLowerCase()) ||
            (email && r.collegeMail.toLowerCase() === email)
        );
      } else {
        // Match by Ticket Code, ID, or Register Number
        const clean = raw.toLowerCase();
        matchedReg = registrations.find(
          (r) =>
            r.ticketCode.toLowerCase() === clean ||
            r.id.toLowerCase() === clean ||
            r.registerNumber.toLowerCase() === clean ||
            r.collegeMail.toLowerCase() === clean
        );
      }

      if (!matchedReg) {
        playBeep(false);
        setLastResult({
          type: "not-found",
          message: `No registration found for: "${raw.slice(0, 30)}"`,
          scannedAt: new Date().toLocaleTimeString(),
        });
        setProcessing(false);
        return;
      }

      // Check if registration belongs to selected event
      if (
        selectedEventId !== "all" &&
        matchedReg.eventId !== selectedEventId &&
        matchedReg.eventId.toLowerCase() !== selectedEventId.toLowerCase()
      ) {
        playBeep(false);
        setLastResult({
          type: "error",
          message: `Ticket is for another event (${matchedReg.eventTitle || matchedReg.eventId})`,
          registration: matchedReg,
          scannedAt: new Date().toLocaleTimeString(),
        });
        setProcessing(false);
        return;
      }

      // If already attended
      if (matchedReg.attended) {
        playBeep(false);
        setLastResult({
          type: "already-checked",
          message: `Already Checked-In at ${matchedReg.attendedAt ? new Date(matchedReg.attendedAt).toLocaleTimeString() : "earlier"}`,
          registration: matchedReg,
          scannedAt: new Date().toLocaleTimeString(),
        });
        setProcessing(false);
        return;
      }

      // Mark as Attended
      try {
        const success = await onCheckIn(matchedReg.id, true);
        if (success) {
          playBeep(true);
          setLastResult({
            type: "success",
            message: `Check-in successful! Welcome, ${matchedReg.fullName}.`,
            registration: { ...matchedReg, attended: true, attendedAt: new Date().toISOString() },
            scannedAt: new Date().toLocaleTimeString(),
          });
        } else {
          playBeep(false);
          setLastResult({
            type: "error",
            message: "Failed to update attendance on server.",
            registration: matchedReg,
            scannedAt: new Date().toLocaleTimeString(),
          });
        }
      } catch (err) {
        playBeep(false);
        setLastResult({
          type: "error",
          message: err instanceof Error ? err.message : "Error processing check-in",
          registration: matchedReg,
          scannedAt: new Date().toLocaleTimeString(),
        });
      } finally {
        setProcessing(false);
      }
    },
    [processing, registrations, selectedEventId, onCheckIn, playBeep]
  );

  // Helper: filter out OBS Virtual Camera and pick best physical camera
  const pickBestCameraId = useCallback((devices: { id: string; label: string }[]) => {
    if (!devices.length) return undefined;
    const isVirtual = (label: string) => /obs|virtual|snap camera/i.test(label);
    const withoutVirtual = devices.filter((d) => !isVirtual(d.label));
    const pool = withoutVirtual.length > 0 ? withoutVirtual : devices;
    const back = pool.find((d) => /back|rear|environment/i.test(d.label));
    if (back) return back.id;
    const front = pool.find((d) => /front|user|face/i.test(d.label));
    if (front) return front.id;
    // Prefer first non-virtual, otherwise first device
    return pool[0]?.id ?? devices[0]?.id;
  }, []);

  // Initialize and start scanner - stable (no cameras dep to avoid infinite restart loop)
  const startScanner = useCallback(
    async (cameraId?: string) => {
      if (isStartingRef.current) {
        console.debug("[QrScanner] startScanner already in progress, ignoring duplicate call");
        return;
      }
      isStartingRef.current = true;
      setCameraError(null);
      try {
        // Ensure reader element is mounted and visible (avoids clientWidth null + black flash)
        const el = document.getElementById("reader-element");
        if (!el || el.clientWidth === 0) {
          await new Promise((r) => setTimeout(r, 160));
          const el2 = document.getElementById("reader-element");
          if (!el2 || el2.clientWidth === 0) {
            throw new Error("Scanner view not ready — please retry");
          }
        }

        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode("reader-element");
        }

        const qrCode = html5QrCodeRef.current;
        // Always fully stop and destroy before restarting — fixes Android camera switching
        if (qrCode.isScanning) {
          try {
            await qrCode.stop();
          } catch {}
          await new Promise((r) => setTimeout(r, 150));
        }
        try {
          await qrCode.clear();
        } catch {}
        // Create a fresh instance to avoid stale stream handles on Android
        html5QrCodeRef.current = new Html5Qrcode("reader-element");
        const activeQr = html5QrCodeRef.current;
        const config: Html5QrcodeCameraScanConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: { width: { ideal: 640 }, height: { ideal: 480 } } as unknown as MediaTrackConstraints,
        };

        // If explicit cameraId provided, try it first; otherwise use facingMode.
        // Never auto-pick OBS virtual camera as first choice.
        const candidates: (string | { facingMode: string })[] = [];
        if (cameraId) {
          candidates.push(cameraId);
          // Fallback to other physical cameras if the chosen one is OBS / busy
          for (const d of camerasRef.current) {
            if (d.id !== cameraId && !/obs|virtual|snap/i.test(d.label)) {
              candidates.push(d.id);
            }
          }
          candidates.push({ facingMode: "user" });
          candidates.push({ facingMode: "environment" });
        } else {
          // No explicit id: prefer environment on mobile, user on desktop — start with facingMode
          // to let browser pick best physical camera instead of OBS virtual device.
          candidates.push({ facingMode: "environment" });
          candidates.push({ facingMode: "user" });
          // Also try explicit non-virtual device ids as last resort
          for (const d of camerasRef.current) {
            if (!/obs|virtual|snap/i.test(d.label)) candidates.push(d.id);
          }
        }
        // If first candidate fails with NotReadableError, the loop below will try next

        let lastErr: unknown = null;
        for (const targetCamera of candidates) {
          try {
            await activeQr.start(
              targetCamera as string | { facingMode: string },
              config,
              (decodedText) => {
                processDecodedText(decodedText);
              },
              undefined
            );
            setScanning(true);
            return;
          } catch (e) {
            lastErr = e;
            const name = (e as { name?: string })?.name ?? "";
            // Only retry on constraint / not-readable; permission errors should surface immediately
            if (name === "NotAllowedError" || name === "NotFoundError") throw e;
            // Try next candidate
            try {
              if (activeQr.isScanning) await activeQr.stop();
            } catch {}
            // Brief pause before next candidate to avoid "already under transition"
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
        }
        throw lastErr;
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "";
        const rawMsg = err instanceof Error ? err.message : String(err ?? "");
        // Don't spam Next.js Console Error overlay — this is an expected hardware/permission failure
        console.warn("Failed to start camera:", err);

        let friendly = "Could not access camera. Please allow camera permissions in your browser or enter the code manually below.";
        if (name === "NotReadableError" || rawMsg.includes("NotReadableError") || rawMsg.includes("Could not start video source")) {
          friendly =
            "Camera is busy or unavailable (NotReadableError). Close other apps/tabs using the camera (Zoom, Teams, OBS), then tap Retry. You can also enter the ticket code manually below or try switching cameras.";
        } else if (name === "NotAllowedError" || rawMsg.includes("NotAllowedError") || rawMsg.includes("Permission denied")) {
          friendly = "Camera permission denied. Please allow camera access in your browser's site settings and tap Retry, or enter the code manually below.";
        } else if (name === "NotFoundError" || rawMsg.includes("NotFoundError")) {
          friendly = "No camera found on this device. Please enter the ticket code manually below.";
        } else if (name === "OverconstrainedError" || rawMsg.includes("OverconstrainedError")) {
          friendly = "This camera does not support the requested mode. Try selecting a different camera or enter the code manually below.";
        } else if (name === "SecurityError" || rawMsg.includes("SecurityError")) {
          friendly = "Camera requires a secure context (HTTPS or localhost). Please open the admin on HTTPS or localhost, or enter the code manually below.";
        } else if (rawMsg.includes("clientWidth") || rawMsg.includes("view not ready")) {
          friendly = "Scanner view not ready. Please wait a moment and tap Retry, or enter the code manually below.";
        }

        setCameraError(friendly);
        setScanning(false);
      } finally {
        isStartingRef.current = false;
      }
    },
    [processDecodedText, pickBestCameraId]
  );

  // Stop scanner
  const stopScanner = useCallback(async () => {
    const qr = html5QrCodeRef.current;
    if (!qr) return;
    try {
      if (qr.isScanning) {
        await qr.stop();
      }
      // Release camera stream fully — prevents NotReadableError on next start
      try {
        await qr.clear();
      } catch {}
    } catch (err) {
      console.warn("Error stopping scanner:", err);
    } finally {
      setScanning(false);
    }
  }, []);

  // Keep stable refs for start/stop to avoid effect loop that causes blinking (video 0.2ms then black)
  const startScannerRef = useRef(startScanner);
  const stopScannerRef = useRef(stopScanner);
  useEffect(() => {
    startScannerRef.current = startScanner;
  }, [startScanner]);
  useEffect(() => {
    stopScannerRef.current = stopScanner;
  }, [stopScanner]);

  // Modal open / close lifecycle — runs ONLY on isOpen change
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      setLastResult(null);
      // Small delay to let modal mount and #reader-element be measurable (prevents clientWidth 0 → black flash)
      const timer = setTimeout(() => {
        Html5Qrcode.getCameras()
          .then((devices) => {
            if (!isMountedRef.current) return;
            if (devices && devices.length > 0) {
              setCameras(devices);
              const chosen = pickBestCameraId(devices) ?? devices[0].id;
              setSelectedCamera(chosen);
              startScannerRef.current(chosen);
            } else {
              startScannerRef.current();
            }
          })
          .catch(() => {
            startScannerRef.current();
          });
      }, 180);

      return () => {
        clearTimeout(timer);
        isMountedRef.current = false;
        stopScannerRef.current();
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      };
    } else {
      stopScannerRef.current();
      return () => {
        isMountedRef.current = false;
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
      };
    }
  }, [isOpen, pickBestCameraId]);

  // Handle Manual Code Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processDecodedText(manualCode.trim());
    setManualCode("");
  };

  // Switch between front and rear cameras
  const switchCamera = useCallback(async () => {
    await stopScanner();
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    setMirrorEnabled(newFacing === "user");
    setSelectedCamera("");
    // Small delay to ensure previous stream is fully released
    await new Promise((r) => setTimeout(r, 300));
    startScanner();
  }, [facingMode, stopScanner, startScanner]);

  // Toggle mirror on/off
  const toggleMirror = useCallback(() => {
    setMirrorEnabled((prev) => !prev);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-[#0b1015] p-5 sm:p-6 shadow-2xl space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Live Door QR Scanner
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </h3>
              <p className="text-[11px] font-mono text-gray-400">
                Point camera at attendee&apos;s digital pass
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              title={soundEnabled ? "Mute audio beep" : "Unmute audio beep"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Camera Viewfinder */}
        <div className={`relative overflow-hidden rounded-2xl bg-black border border-white/10 aspect-square max-h-[300px] flex items-center justify-center${mirrorEnabled ? " -scale-x-100" : ""}`}>
          <div id="reader-element" className="w-full h-full object-cover" />

          {/* Animated Laser Overlay */}
          {scanning && !cameraError && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 scale-x-[-1]">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400/50 rounded-2xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br" />
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce duration-1000 mt-24" />
              </div>
              <span className="text-[10px] font-mono text-emerald-400/80 bg-black/60 px-2.5 py-1 rounded-full mt-3">
                Align QR Code within frame
              </span>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 bg-[#0e161c]/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <p className="text-xs font-mono text-gray-300 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => startScanner(selectedCamera)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-mono text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="flex items-center gap-2">
          {/* Flip Camera Button (front/rear toggle) */}
          <button
            type="button"
            onClick={switchCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-mono shrink-0"
            title={facingMode === "user" ? "Switch to rear camera" : "Switch to front camera"}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{facingMode === "user" ? "Rear" : "Front"}</span>
          </button>

          {/* Mirror Toggle */}
          <button
            type="button"
            onClick={toggleMirror}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors text-[11px] font-mono shrink-0 ${
              mirrorEnabled
                ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-400"
                : "bg-white/5 border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
            }`}
            title={mirrorEnabled ? "Disable mirror" : "Enable mirror (flip horizontally)"}
          >
            <FlipHorizontal2 className="w-3.5 h-3.5" />
            <span>Mirror</span>
          </button>

          {/* Camera Dropdown — shown only when 3+ cameras exist (otherwise flip button suffices) */}
          {cameras.length > 2 && (
            <>
              <span className="text-[10px] font-mono text-gray-500 shrink-0">|</span>
              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value);
                  stopScanner().then(() => startScanner(e.target.value));
                }}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-gray-300 focus:outline-none focus:border-emerald-400"
              >
                {cameras.map((c, i) => (
                  <option key={c.id} value={c.id} className="bg-[#0b1015] text-white">
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* LIVE SCAN FEEDBACK CARD */}
        {lastResult && (
          <div
            className={`rounded-2xl border p-4 transition-all duration-300 ${
              lastResult.type === "success"
                ? "bg-emerald-500/15 border-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.2)]"
                : lastResult.type === "already-checked"
                ? "bg-amber-500/15 border-amber-400/60"
                : "bg-rose-500/15 border-rose-400/60"
            }`}
          >
            <div className="flex items-start gap-3">
              {lastResult.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : lastResult.type === "already-checked" ? (
                <UserCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-bold font-mono uppercase tracking-wider ${
                      lastResult.type === "success"
                        ? "text-emerald-300"
                        : lastResult.type === "already-checked"
                        ? "text-amber-300"
                        : "text-rose-300"
                    }`}
                  >
                    {lastResult.type === "success"
                      ? "PASS VERIFIED & CHECKED IN"
                      : lastResult.type === "already-checked"
                      ? "ALREADY CHECKED IN"
                      : "VERIFICATION FAILED"}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{lastResult.scannedAt}</span>
                </div>

                <p className="text-xs text-white font-medium">{lastResult.message}</p>

                {lastResult.registration && (
                  <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-white/10 text-[11px] font-mono">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Attendee:</span>
                      <span className="text-white font-bold truncate block">
                        {lastResult.registration.fullName}
                      </span>
                      <span className="text-gray-400 text-[10px]">
                        {lastResult.registration.registerNumber}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Department:</span>
                      <span className="text-white truncate block">
                        {lastResult.registration.branch}
                      </span>
                      <span className="text-emerald-400 text-[10px] font-bold">
                        Ticket: {lastResult.registration.ticketCode}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Manual Code Entry Form */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-white/10">
          <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">
            Or Type 6-Char Ticket Code / Register No:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="e.g. WF26-8A3F or 240071601263"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono placeholder:text-gray-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || processing}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors shrink-0"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
