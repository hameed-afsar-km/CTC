"use client";

const isHiddenDbError = (reason: unknown) => {
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : String(reason ?? "");
  return msg.includes("Database is closing") || msg.includes("Database is closing/hidden");
};
const isNetworkError = (reason: unknown) => {
  const msg =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : String(reason ?? "");
  const code = (reason as { code?: string })?.code ?? "";
  return msg.includes("network-request-failed") || code.includes("network-request-failed");
};

if (typeof window !== "undefined") {
  const onUnhandled = (event: PromiseRejectionEvent) => {
    if (isHiddenDbError(event.reason)) {
      event.preventDefault();
      console.warn("[Firebase] Suppressed IndexedDB hidden error (early)");
      return;
    }
    if (isNetworkError(event.reason)) {
      event.preventDefault();
      console.debug("[Firebase] Suppressed network error (early)");
    }
  };
  const onError = (event: ErrorEvent) => {
    if (event.message?.includes("Database is closing")) {
      event.preventDefault();
    }
  };
  window.addEventListener("unhandledrejection", onUnhandled);
  window.addEventListener("error", onError);
}

import { useEffect } from "react";

export default function FirebaseHiddenDbSuppress() {
  useEffect(() => {
    const onUnhandled = (event: PromiseRejectionEvent) => {
      if (isHiddenDbError(event.reason)) {
        event.preventDefault();
        console.warn("[Firebase] Suppressed IndexedDB hidden error");
        return;
      }
      if (isNetworkError(event.reason)) {
        event.preventDefault();
        console.debug("[Firebase] Suppressed network error");
      }
    };
    const onError = (event: ErrorEvent) => {
      if (event.message?.includes("Database is closing")) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandled);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      window.removeEventListener("error", onError);
    };
  }, []);
  return null;
}
