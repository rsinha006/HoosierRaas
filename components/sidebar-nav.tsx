"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_MODULES } from "@/lib/navigation";

type SidebarNavProps = {
  onNavigate?: () => void;
};

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
            <span className="block text-sm font-medium">{module.name}</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
              {module.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
