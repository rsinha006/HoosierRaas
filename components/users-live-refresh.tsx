"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const USERS_REFRESH_INTERVAL_MS = 5 * 60_000;

type UsersLiveRefreshProps = {
  children: React.ReactNode;
};

/**
 * Keeps the users table current while somebody is actually looking at it.
 *
 * Every refresh re-renders this page on the server, and that is not a cheap
 * render: it lists auth accounts through the admin API, reads members,
 * season memberships and profiles, and reconciles any missing profile rows.
 * This data changes a couple of times a semester, not every few seconds - a
 * ten-second interval meant roughly 360 of those full rebuilds an hour
 * against a tab that was simply left open, almost all of them wasted. Every
 * action taken from this page (assigning a role, deleting a user) already
 * calls router.refresh() itself, so polling only exists to catch a change
 * made by someone else's session - a five-minute interval still does that
 * without the previous rate of pure waste.
 *
 * Polling pauses while the tab is hidden, and resumes with one immediate
 * refresh when it comes back - so the table is up to date the moment it is on
 * screen again, rather than waiting out the rest of the interval.
 */
export default function UsersLiveRefresh({ children }: UsersLiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    let intervalId: number | undefined;

    const stopPolling = () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const startPolling = () => {
      if (intervalId === undefined) {
        intervalId = window.setInterval(() => {
          router.refresh();
        }, USERS_REFRESH_INTERVAL_MS);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }

      router.refresh();
      startPolling();
    };

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return children;
}
