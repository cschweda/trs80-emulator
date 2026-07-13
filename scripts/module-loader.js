/**
 * Module loader for resolving @ aliases to relative paths.
 * Used to enable import of aliased modules under plain Node.js.
 *
 * Mirrors the aliases declared in vite.config.js's resolve.alias. This file
 * is registered as a module customization hook via node:module's register()
 * (see probe-program.js) instead of relying on Vite's bundler-time alias
 * resolution, which plain `node script.js` invocations never go through.
 */
import { fileURLToPath } from "url";
import { dirname, resolve as resolvePath } from "path";

// Anchor alias targets to this file's own location (repo-root/scripts/), not
// process.cwd(), so resolution works no matter which directory the caller
// invokes the tool from (mirrors the __dirname trick probe-program.js uses
// for locating the ROM file).
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolvePath(__dirname, "..");

const aliases = {
  "@core": resolvePath(repoRoot, "src/core"),
  "@peripherals": resolvePath(repoRoot, "src/peripherals"),
  "@system": resolvePath(repoRoot, "src/system"),
  "@ui": resolvePath(repoRoot, "src/ui"),
  "@data": resolvePath(repoRoot, "src/data"),
  "@": resolvePath(repoRoot, "src"),
};

// Longest-prefix-first: sorted by alias length (descending) so a specific
// alias (e.g. "@core") always wins over a shorter catch-all one (e.g. "@"),
// regardless of the object's key/insertion order above.
const sortedAliases = Object.entries(aliases).sort(
  ([a], [b]) => b.length - a.length
);

export async function resolve(specifier, context, nextResolve) {
  for (const [alias, targetPath] of sortedAliases) {
    if (specifier.startsWith(alias)) {
      const resolved = specifier.replace(alias, targetPath);
      return nextResolve(resolved, context);
    }
  }
  return nextResolve(specifier, context);
}
