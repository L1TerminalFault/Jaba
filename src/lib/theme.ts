"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Theme {
  id: string;
  name: string;
  bg: string;
  fg: string;
  cardBg: string;
  accent: string;
  borderCol: string;
}

export const defaultThemes: Theme[] = [
  {
    id: "dark-amber",
    name: "JABA Obsidian Amber",
    bg: "#0a0a0c",
    fg: "#f4f4f5",
    cardBg: "rgba(255, 255, 255, 0.04)",
    accent: "#f59e0b", // Amber/Gold
    borderCol: "rgba(255, 255, 255, 0.08)",
  },
  {
    id: "coffee-warm",
    name: "Warm Roast",
    bg: "#16110e",
    fg: "#fdf8f5",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "#ea580c", // Deep Orange
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "emerald-deep",
    name: "Forest Emerald",
    bg: "#041a14",
    fg: "#ecfdf5",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "#10b981",
    borderCol: "rgba(255, 255, 255, 0.1)",
  },
  {
    id: "clean-light",
    name: "Clean Light",
    bg: "#f8fafc",
    fg: "#0f172a",
    cardBg: "#ffffff",
    accent: "#d97706",
    borderCol: "rgba(0, 0, 0, 0.08)",
  },
  {
    id: "midnight-blue",
    name: "Midnight Indigo",
    bg: "#0a0f1d",
    fg: "#f8fafc",
    cardBg: "rgba(255, 255, 255, 0.05)",
    accent: "#6366f1",
    borderCol: "rgba(255, 255, 255, 0.08)",
  },
];

interface ThemeStore {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: defaultThemes[0],
      setTheme: (theme) => set({ currentTheme: theme }),
    }),
    {
      name: "jaba-theme-storage",
    }
  )
);
