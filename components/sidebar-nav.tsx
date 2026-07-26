"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { APP_MODULES } from "@/lib/navigation";

type SidebarNavProps = {
  onNavigate?: () => void;
};

/**
 * Shows a spinner on the link the user just clicked, but only once the
 * navigation has been pending for a moment (see .link-hint in globals.css).
 * On a high-latency connection the prefetch has often not landed yet, so
 * without this the click has no visible effect until the server responds.
 */
function PendingHint() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      className={`link-hint h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-t-transparent ${
        pending ? "is-pending animate-spin" : ""
      }`}
    />
  );
}

export default function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {APP_MODULES.map((module) => {
        const isActive =
          pathname === module.href || pathname.startsWith(`${module.href}/`);

        return (
          <Link
            key={module.href}
            href={module.href}
            onClick={onNavigate}
            className={`block rounded-lg px-3 py-2.5 transition ${
              isActive
                ? "bg-[#990000]/10 text-[#990000]"
                : "text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="min-w-0 flex-1 truncate">{module.name}</span>
              <PendingHint />
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              {module.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
