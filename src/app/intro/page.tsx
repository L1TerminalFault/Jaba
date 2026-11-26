"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  tokenKey: "__jaba_first_time_token__",
  companyName: "JABA",
  companySuffix: "OPERATIONS",
  subtitle: "INTELLIGENT PRODUCTION & INVENTORY SYSTEM",
  tagline: "Precision Batching • Live Stock Invariants • Profit Realization",
  enterButton: "Enter System",
  skipButton: "Skip Intro",
  redirectingText: "Loading Operations Command Center...",
};

export default function IntroPage() {
  const router = useRouter();
  const [animate, setAnimate] = useState(false);
  const [drawComplete, setDrawComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathsRef = useRef<SVGSVGElement>(null);

  const proceedToHome = () => {
    try {
      localStorage.setItem(STRINGS.tokenKey, "true");
    } catch {
      // ignore
    }
    router.replace("/home");
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let autoRedirectId: NodeJS.Timeout;

    // Small delay to ensure DOM is ready
    timeoutId = setTimeout(() => {
      setAnimate(true);

      // SVG path drawing animation using GSAP
      if (pathsRef.current) {
        const paths = pathsRef.current.querySelectorAll("path, polyline, line");

        paths.forEach((p) => {
          const pathElem = p as SVGPathElement;
          const length = pathElem.getTotalLength ? pathElem.getTotalLength() : 300;
          gsap.set(pathElem, {
            strokeDasharray: length,
            strokeDashoffset: length,
            opacity: 1,
          });

          gsap.to(pathElem, {
            strokeDashoffset: 0,
            duration: 2.8,
            ease: "power2.inOut",
            stagger: 0.15,
            onComplete: () => {
              setDrawComplete(true);
              gsap.to(".jaba-gold", {
                fill: "#f59e0b",
                stroke: "rgba(245, 158, 11, 0.4)",
                strokeWidth: "1.5px",
                duration: 1.2,
                ease: "power2.out",
              });
              gsap.to(".jaba-white", {
                fill: "#ffffff",
                stroke: "rgba(255, 255, 255, 0.3)",
                strokeWidth: "1px",
                duration: 1.2,
                ease: "power2.out",
              });
              gsap.to(".jaba-emblem", {
                stroke: "#d97706",
                strokeWidth: "2px",
                duration: 1,
              });
            },
          });
        });
      }
    }, 150);

    // Auto-proceed after intro finishes (similar to ALYA 4.5s timing)
    autoRedirectId = setTimeout(() => {
      proceedToHome();
    }, 5200);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(autoRedirectId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-[#09090b] text-white select-none"
    >
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.12)_0,transparent_70%)]" />

      {/* Main Animated Intro Cluster */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center gap-6 transition-all duration-1500 ease-out ${
          animate ? "scale-100 opacity-100" : "scale-150 opacity-0"
        }`}
      >
        {/* Custom JABA Monogram SVG */}
        <div className="relative flex items-center justify-center">
          <svg
            ref={pathsRef}
            viewBox="0 0 380 180"
            className="h-32 w-auto md:h-44 drop-shadow-[0_0_35px_rgba(245,158,11,0.35)]"
          >
            {/* Hexagonal Shield Emblem */}
            <polyline
              className="jaba-emblem fill-transparent stroke-amber-500/60"
              strokeWidth="2.5"
              strokeLinejoin="round"
              points="190,10 340,45 340,135 190,170 40,135 40,45 190,10"
            />

            {/* Letter 'J' */}
            <path
              className="jaba-gold fill-transparent stroke-amber-500"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M100,55 L100,115 C100,132 86,138 72,135 C62,132 58,124 58,118"
            />

            {/* Letter 'A' (First) */}
            <path
              className="jaba-white fill-transparent stroke-white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M115,135 L145,55 L175,135 M126,110 L164,110"
            />

            {/* Letter 'B' */}
            <path
              className="jaba-gold fill-transparent stroke-amber-500"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M190,55 L190,135 M190,55 C215,55 228,68 228,82 C228,95 215,95 190,95 M190,95 C220,95 234,107 234,121 C234,135 215,135 190,135"
            />

            {/* Letter 'A' (Second) */}
            <path
              className="jaba-white fill-transparent stroke-white"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M250,135 L280,55 L310,135 M261,110 L299,110"
            />
          </svg>
        </div>

        {/* Brand Text Reveal (Inspired by ALYA expand animation) */}
        <div
          className={`overflow-hidden transition-all duration-1200 delay-1000 ease-in-out text-center ${
            animate ? "max-h-48 opacity-100 blur-0" : "max-h-0 opacity-0 blur-md"
          }`}
        >
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-extrabold tracking-widest text-amber-500 md:text-6xl drop-shadow-[0_2px_15px_rgba(245,158,11,0.5)]">
              {STRINGS.companyName}
            </h1>
	    {/* <span className="text-xl font-light tracking-wider text-zinc-400 md:text-3xl pt-1">
              {STRINGS.companySuffix}
            </span> */}
          </div>

          <p className="mt-2 text-xs font-semibold tracking-widest text-amber-400/90 uppercase md:text-sm">
            {STRINGS.subtitle}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400 tracking-wider">
            {STRINGS.tagline}
          </p>
        </div>

        {/* Action Controls & Countdown Bar */}
        <div
          className={`flex flex-col items-center gap-3 transition-opacity duration-700 delay-2000 ${
            drawComplete ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
	{/* <div className="flex items-center gap-4">
            <button
              onClick={proceedToHome}
              className="group flex cursor-pointer items-center gap-2 rounded-full border border-amber-500/60 bg-amber-500/10 px-6 py-2.5 text-sm font-semibold text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all hover:scale-105 hover:bg-amber-500 hover:text-black"
            >
              <span>{STRINGS.enterButton}</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button
              onClick={proceedToHome}
              className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {STRINGS.skipButton}
            </button>
          </div> */}

          <p className="text-[10px] text-zinc-500 tracking-wider animate-pulse">
            {STRINGS.redirectingText}
          </p>
        </div>
      </div>

      {/* Modern subtle footer accent */}
      {/* <div className="absolute bottom-6 flex items-center gap-2 text-[10px] tracking-widest text-zinc-600 uppercase">
        <span>EST. 2026</span>
        <span>•</span>
        <span>ETHIOPIAN ROASTERY & INVENTORY SYSTEM</span>
      </div> */}
    </div>
  );
}
