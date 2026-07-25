"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AttendanceAlertGroups, DancerAttendanceSummary } from "@/lib/attendance-stats";

type AlertKey = "unexcused" | "warning" | "policy";

type AttendanceAlertRowProps = {
  groups: AttendanceAlertGroups;
};

type AlertBoxConfig = {
  key: AlertKey;
  title: string;
  members: DancerAttendanceSummary[];
  colorClasses: string;
  badgeClasses: string;
  countLabel: (member: DancerAttendanceSummary) => string;
  memberLabel?: (member: DancerAttendanceSummary) => string;
};

let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext() {
  if (typeof document === "undefined") {
    return null;
  }
  if (!measureContext) {
    measureContext = document.createElement("canvas").getContext("2d");
  }
  return measureContext;
}

function measureTextWidth(text: string, font: string) {
  const ctx = getMeasureContext();
  if (!ctx) {
    return 0;
  }
  ctx.font = font;
  return ctx.measureText(text).width;
}

function computeOverflow(boxWidth: number, title: string, badgeText: string, summaryText: string) {
  const available = boxWidth - 28 - 8 - 8 - 26;
  const used =
    measureTextWidth(title, "600 13px Geist, sans-serif") +
    measureTextWidth(badgeText, "600 12px Geist, sans-serif") +
    14 +
    measureTextWidth(summaryText, "12px Geist, sans-serif");
  return used > available;
}

export default function AttendanceAlertRow({ groups }: AttendanceAlertRowProps) {
  const [expandedAlert, setExpandedAlert] = useState<AlertKey | null>(null);

  const allBoxes: AlertBoxConfig[] = [
    {
      key: "unexcused",
      title: "1+ Unexcused Absences",
      members: groups.unexcused,
      colorClasses: "border-red-200 bg-red-50 text-red-950",
      badgeClasses: "bg-red-950/10",
      countLabel: (member: DancerAttendanceSummary) =>
        `${member.unexcusedAbsences} unexcused absence${member.unexcusedAbsences === 1 ? "" : "s"}`,
      memberLabel: (member: DancerAttendanceSummary) =>
        `${member.name} (${member.unexcusedAbsences})`,
    },
    {
      key: "warning",
      title: "2 Excused Absences (Approaching Limit)",
      members: groups.approaching,
      colorClasses: "border-amber-200 bg-amber-50 text-amber-950",
      badgeClasses: "bg-amber-950/10",
      countLabel: (member: DancerAttendanceSummary) => `${member.excusedAbsences} excused absences`,
      memberLabel: (member: DancerAttendanceSummary) =>
        `${member.name} (${member.excusedAbsences})`,
    },
    {
      key: "policy",
      title: "3+ Excused Absences (At Limit)",
      members: groups.atLimit,
      colorClasses: "border-red-200 bg-red-50 text-red-950",
      badgeClasses: "bg-red-950/10",
      countLabel: (member: DancerAttendanceSummary) => `${member.excusedAbsences} excused absences`,
      memberLabel: (member: DancerAttendanceSummary) =>
        `${member.name} (${member.excusedAbsences})`,
    },
  ];

  const boxes = allBoxes.filter((box) => box.members.length > 0);

  if (boxes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {boxes.map((box) => (
        <AlertBox
          key={box.key}
          config={box}
          expanded={expandedAlert === box.key}
          onToggle={() =>
            setExpandedAlert((current) => (current === box.key ? null : box.key))
          }
        />
      ))}
    </div>
  );
}

function AlertBox({
  config,
  expanded,
  onToggle,
}: {
  config: AlertBoxConfig;
  expanded: boolean;
  onToggle: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const badgeText = String(config.members.length);
  const getLabel = config.memberLabel ?? ((member: DancerAttendanceSummary) => member.name);
  const summary = config.members.map(getLabel).join(", ");

  useEffect(() => {
    const el = containerRef.current;
    if (!el || expanded) {
      return;
    }

    function measure() {
      const width = el!.getBoundingClientRect().width;
      setOverflowing(computeOverflow(width, config.title, badgeText, summary));
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, config.title, badgeText, summary]);

  const showArrow = overflowing || expanded;

  // Expanded, the names get the card's full width as a wrapped list of chips.
  // Keeping them inline would squeeze every name into whatever narrow column is
  // left beside the title, which on a phone is a one-word-per-line ribbon with
  // a tall blank gap under the title.
  if (expanded) {
    return (
      <div
        ref={containerRef}
        className={`min-w-0 rounded-xl border px-3.5 py-2.5 ${config.colorClasses}`}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded
          className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left text-inherit"
        >
          <span className="min-w-0 text-[13px] font-semibold">{config.title}</span>
          <span className={`shrink-0 rounded-full px-1.5 py-px text-xs font-semibold ${config.badgeClasses}`}>
            {badgeText}
          </span>
          <span aria-hidden className="ml-auto shrink-0 rotate-90 text-[15px] font-bold leading-none">
            ›
          </span>
        </button>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {config.members.map((member) => (
            <li key={member.memberId}>
              <Link
                href={`/attendance/members/${member.memberId}`}
                className="inline-block rounded-full bg-white/70 px-2 py-0.5 text-xs ring-1 ring-inset ring-black/5 hover:bg-white"
                title={config.countLabel(member)}
              >
                {getLabel(member)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap rounded-xl border px-3.5 py-2.5 ${config.colorClasses}`}
    >
      <span className="shrink-0 text-[13px] font-semibold">{config.title}</span>
      <span className={`shrink-0 rounded-full px-1.5 py-px text-xs font-semibold ${config.badgeClasses}`}>
        {badgeText}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs opacity-80">
        {config.members.map((member, index) => (
          <span key={member.memberId}>
            {index > 0 ? ", " : ""}
            <Link
              href={`/attendance/members/${member.memberId}`}
              className="underline-offset-2 hover:underline"
              title={config.countLabel(member)}
            >
              {getLabel(member)}
            </Link>
          </span>
        ))}
      </span>
      {showArrow ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={false}
          className="-my-1 ml-auto shrink-0 border-none bg-transparent px-1 py-1 text-[15px] font-bold leading-none text-inherit"
          aria-label="Expand alert"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
