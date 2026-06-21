"use client";

import { useState } from "react";
import ArchiveSeasonDialog from "@/components/archive-season-dialog";
import type { ArchiveFinancePreview, ArchiveRosterMember } from "@/lib/archive-season";

type ArchiveSeasonLauncherProps = {
  activeSeasonLabel: string;
  roster: ArchiveRosterMember[];
  financePreview: ArchiveFinancePreview;
};

export default function ArchiveSeasonLauncher({
  activeSeasonLabel,
  roster,
  financePreview,
}: ArchiveSeasonLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-[#990000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#7a0000]"
      >
        Archive Season
      </button>

      <ArchiveSeasonDialog
        open={open}
        onClose={() => setOpen(false)}
        activeSeasonLabel={activeSeasonLabel}
        roster={roster}
        financePreview={financePreview}
      />
    </>
  );
}
