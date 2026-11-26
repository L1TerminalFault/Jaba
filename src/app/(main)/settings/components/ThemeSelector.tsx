"use client";

import { useThemeStore, defaultThemes } from "@/lib/theme";
import { MdOutlinePalette, MdOutlineCheck } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  themeSectionTitle: "Theme Palettes",
  themeSectionSubtitle: "Select from curated ambient themes tailored for operations management",
};

export default function ThemeSelector() {
  const { currentTheme, setTheme } = useThemeStore();

  return (
    <div className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl">
      <div className="flex items-center gap-2 pb-4 border-b border-theme-border/40">
        <MdOutlinePalette className="size-5 text-theme-accent" />
        <div>
          <h2 className="text-base font-bold text-theme-text">
            {STRINGS.themeSectionTitle}
          </h2>
          <p className="text-xs text-theme-text/50">
            {STRINGS.themeSectionSubtitle}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {defaultThemes.map((t) => {
          const isSelected = currentTheme.id === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setTheme(t)}
              className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-sm ${
                isSelected
                  ? "border-theme-accent bg-theme-accent/15 ring-2 ring-theme-accent/30 font-bold"
                  : "border-theme-border/40 bg-theme-card/40 hover:border-theme-accent/50 hover:bg-theme-card/70"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="size-6 rounded-full border border-white/20 shadow-md shrink-0"
                  style={{ backgroundColor: t.accent }}
                />
                <div>
                  <span className="text-sm font-bold text-theme-text block">
                    {t.name}
                  </span>
                  <span className="text-[10px] text-theme-text/40 font-mono">
                    Bg: {t.bg} • Accent: {t.accent}
                  </span>
                </div>
              </div>

              {isSelected && (
                <div className="flex size-6 items-center justify-center rounded-full bg-theme-accent text-black shrink-0">
                  <MdOutlineCheck className="size-4" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
