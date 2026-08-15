/**
 * Builds the whole site into one self-contained HTML file.
 *
 *   npm run build && npm run standalone
 *
 * Bundles the behaviour layer, then inlines it along with every stylesheet,
 * font and image. The result needs no server and makes no network requests, so
 * it can be opened from disk or hosted anywhere, including behind a content
 * security policy that blocks external origins.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const work = mkdtempSync(join(tmpdir(), "seahive-"));
const bundle = join(work, "behaviour.js");

const run = (cmd, args) =>
  execFileSync(cmd, args, { stdio: "inherit", cwd: process.cwd() });

run("npx", [
  "esbuild",
  "scripts/standalone/entry.ts",
  "--bundle",
  "--format=iife",
  "--minify",
  "--target=es2020",
  `--outfile=${bundle}`,
]);

run("node", ["scripts/inline.mjs", "out/index.html", "out/standalone.html", bundle]);
