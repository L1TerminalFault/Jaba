"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Strings refactored to top of file for internationalization (e.g. Amharic)
const STRINGS = {
  loading: "Initializing JABA...",
  tokenKey: "__jaba_first_time_token__",
};

export default function Entry() {
  const router = useRouter();

  useEffect(() => {
    try {
      const firstTime = localStorage.getItem(STRINGS.tokenKey);
      if (true /* !firstTime */) {
        router.replace("/intro");
      } else {
        router.replace("/home");
      }
    } catch {
      router.replace("/home");
    }
  }, [router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0c] text-amber-500">
      <div className="flex flex-col items-center gap-4">
        <div className="size-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        <p className="text-xs uppercase tracking-widest text-zinc-400">
          {STRINGS.loading}
        </p>
      </div>
    </div>
  );
}
