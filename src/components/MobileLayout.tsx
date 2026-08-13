"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Menu, X } from "lucide-react";
import Image from "next/image";

interface MobileLayoutProps {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}

export function MobileLayout({ user, children }: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#e8eced] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Flow Realty" width={28} height={28} className="rounded-[7px]" />
          <span className="text-[13px] font-semibold text-[#1a1a2e]" style={{ fontFamily: "var(--font-display)" }}>Flow Realty</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-[8px] hover:bg-[#f1f3f4] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-[#5a6474]" />
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="absolute right-0 top-0 h-full w-[280px] animate-slide-in">
            <div className="relative h-full">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-[8px] bg-[#f1f3f4] hover:bg-[#e8eced] transition-colors"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-[#5a6474]" />
              </button>
              <div onClick={() => setSidebarOpen(false)}>
                <Sidebar user={user} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar user={user} />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">
          <div className="p-4 sm:p-5 lg:p-7 max-w-[1400px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
