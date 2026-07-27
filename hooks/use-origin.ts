"use client";

import { useSyncExternalStore } from "react";

// The origin never changes for the life of the page, so there is nothing to
// subscribe to - but useSyncExternalStore is the hook that takes a server
// snapshot, which is the whole point of using it here.
const subscribeToNothing = () => () => {};
const readOrigin = () => window.location.origin;
const readOriginOnServer = () => "";

/**
 * The page's own origin, or "" while rendering on the server.
 *
 * Reading window.location.origin during render makes the first client pass
 * disagree with the HTML it is hydrating, and React responds by throwing that
 * tree away and rebuilding it. Both sides start from "" here, so the markup
 * matches, and the full address arrives once the component has mounted.
 *
 * Anything built from this has to read sensibly without it - a path on its own,
 * rather than a URL with a hole where the host should be.
 */
export function useOrigin() {
  return useSyncExternalStore(subscribeToNothing, readOrigin, readOriginOnServer);
}
