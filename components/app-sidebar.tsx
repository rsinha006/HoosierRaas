"use client";

import { useState } from "react";
import SidebarNav from "@/components/sidebar-nav";
import LogoutButton from "@/components/logout-button";
import { useUserRole } from "@/hooks/use-user-role";
import type { UserProfile } from "@/lib/get-user-profile";
import { formatExecTitle } from "@/lib/members";

type AppSidebarProps = {
  user: UserProfile;
};

function RoleBadge() {
  const { execTitle } = useUserRole();

  if (!execTitle) {
    return (
      <span className="mt-2 inline-flex rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
        Executive Board
      </span>
    );
  }

  const label = formatExecTitle(execTitle) ?? "Executive Board";

  return (
    <span className="mt-2 inline-flex rounded-full bg-[#990000]/10 px-2.5 py-0.5 text-xs font-medium text-[#990000]">
      {label}
    </span>
  );
}

export default function AppSidebar({ user }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:bg-zinc-50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
          </svg>
        </button>
        <div className="flex-1 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#990000]">
            HROS
          </p>
          <p className="text-sm font-medium text-zinc-900">{user.name}</p>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-zinc-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="bg-[#990000] px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            HoosierRaas
          </p>
          <h1 className="mt-1 text-xl font-semibold text-white">HROS</h1>
          <p className="mt-1 text-sm text-white/80">Executive board portal</p>
        </div>

        <SidebarNav onNavigate={() => setMobileOpen(false)} />

        <div className="mt-auto border-t border-zinc-200 px-4 py-4">
          <div className="mb-3 rounded-lg bg-zinc-50 px-3 py-3">
            <p className="text-sm font-medium text-zinc-900">{user.name}</p>
            <RoleBadge />
            <p className="mt-2 truncate text-xs text-zinc-400">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
