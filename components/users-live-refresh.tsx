"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const USERS_REFRESH_INTERVAL_MS = 10_000;

type UsersLiveRefreshProps = {
  children: React.ReactNode;
};

export default function UsersLiveRefresh({ children }: UsersLiveRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      router.refresh();
    }, USERS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [router]);

  return children;
}
