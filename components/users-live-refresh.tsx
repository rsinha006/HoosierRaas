"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const USERS_REFRESH_INTERVAL_MS = 10_000;

type UsersLiveRefreshProps = {
  children: React.ReactNode;
};

/**
 * Keeps the users table current while somebody is actually looking at it.
 *
 * Every refresh re-renders this page on the server, and that is not a cheap
 * render: it lists auth accounts through the admin API, reads members,
 * season memberships and profiles, and reconciles any missing profile rows.
 * Running all of that every ten seconds against a tab left open in the
 * background was pure waste.
 *
 * Polling now pauses while the tab is hidden, and resumes with one immediate
 * refresh when it comes back - so the table is up to date the moment it is on
 * screen again, rather than showing up to ten seconds of stale rows.
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
