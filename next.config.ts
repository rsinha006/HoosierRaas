import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js 16.2.x can omit @swc/helpers ESM files from the proxy/middleware
  // bundle on Vercel, causing MIDDLEWARE_INVOCATION_FAILED at cold start.
  outputFileTracingIncludes: {
    "*": ["./node_modules/@swc/helpers/esm/**"],
  },
};

export default nextConfig;
