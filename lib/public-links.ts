import type { Metadata } from "next";

/** The public forms live at fixed addresses. Nothing about them is generated: there
 *  is no token, nothing expires, and once one has been shared in a group chat there
 *  is no way to take it back. Whether they should carry real revocable tokens is an
 *  exec board decision; until it is made, the buttons that hand them out say what
 *  they actually are, and the pages ask not to be indexed. */
export const PUBLIC_LINK_PATHS = {
  onboarding: "/onboarding",
  signup: "/signup",
  expenses: "/expenses",
  reimbursements: "/reimbursements",
} as const;

/**
 * Deliberately a meta tag rather than a robots.txt rule: a crawler told not to fetch
 * the page never reads the tag, and the address can still be indexed from a link
 * someone posted. This asks for the page to be left out of the index outright.
 */
export const PUBLIC_PAGE_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
  },
};
