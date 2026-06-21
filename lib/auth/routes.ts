// Add new protected app sections here as HROS grows.
export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/team-manager",
  "/finance",
  "/attendance",
  "/members",
  "/users",
];

export const AUTH_ROUTES = ["/login"];

export function isProtectedRoute(pathname: string) {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.includes(pathname);
}
