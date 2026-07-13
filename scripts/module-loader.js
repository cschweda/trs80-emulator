/**
 * Module loader for resolving @ aliases to relative paths.
 * Used to enable import of aliased modules under plain Node.js.
 */
import { resolve as resolvePath } from "path";

const aliases = {
  "@core": "./src/core",
  "@peripherals": "./src/peripherals",
  "@system": "./src/system",
  "@ui": "./src/ui",
  "@data": "./src/data",
  "@": "./src",
};

export async function resolve(specifier, context, nextResolve) {
  for (const [alias, path] of Object.entries(aliases)) {
    if (specifier.startsWith(alias)) {
      const resolved = specifier.replace(alias, resolvePath(path));
      return nextResolve(resolved, context);
    }
  }
  return nextResolve(specifier, context);
}
