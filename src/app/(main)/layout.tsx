"use client";

import TitleBar from "@/components/TitleBar";
import NavBar from "@/components/NavBar";
import { RbacProvider } from "@/lib/rbac-client";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RbacProvider>
      <div className="flex min-h-screen flex-col bg-theme-background text-theme-text transition-colors duration-300">
        <TitleBar />
        <main className="flex-1 pt-24 pb-28 px-3 sm:px-6 md:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <NavBar />
      </div>
    </RbacProvider>
  );
}
