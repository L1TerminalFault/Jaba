"use client";

import { useEffect, useState } from "react";
import { useThemeStore } from "@/lib/theme";

export default function ClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <style suppressHydrationWarning>{`
        :root {
          --bg: ${currentTheme.bg};
          --fg: ${currentTheme.fg};
          --cardBg: ${currentTheme.cardBg};
          --accent: ${currentTheme.accent};
          --borderCol: ${currentTheme.borderCol};
        }
        body {
          background-color: var(--bg);
          color: var(--fg);
        }
      `}</style>
      <div className={`min-h-screen flex flex-col ${mounted ? "opacity-100" : "opacity-95"} transition-opacity duration-300`}>
        {children}
      </div>
    </>
  );
}
