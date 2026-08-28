"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import EventRegistrationForm from "@/components/EventRegistrationForm";

function RegisterContent() {
  const searchParams = useSearchParams();
  const queryEventId = searchParams.get("event") || searchParams.get("id") || undefined;
  return <EventRegistrationForm initialSlugOrId={queryEventId} />;
}

export default function WorkshopRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06090c] flex items-center justify-center text-xs font-mono text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
