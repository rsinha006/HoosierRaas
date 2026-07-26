import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");

/**
 * Teaches the test runner the "@/" path alias from tsconfig.
 *
 * Node strips types but does not read tsconfig paths, so until now a module
 * could only be tested if its "@/" imports were all `import type` - those are
 * erased and never resolved. Anything importing a real value through the alias
 * failed with ERR_MODULE_NOT_FOUND.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) {
      return nextResolve(specifier, context);
    }

    const base = path.join(root, specifier.slice(2));
    const resolved = path.extname(base)
      ? base
      : [".ts", ".tsx", ".mjs", ".js"]
          .map((extension) => `${base}${extension}`)
          .find((candidate) => existsSync(candidate));

    if (!resolved) {
      return nextResolve(specifier, context);
    }

    return nextResolve(pathToFileURL(resolved).href, context);
  },
});
