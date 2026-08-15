/**
 * Collapses the static export into one self-contained HTML file.
 *
 *   node scripts/inline.mjs out/index.html <destination.html>
 *
 * Every stylesheet, font, image and script chunk is embedded, so the result
 * makes no network requests at all and can be opened from anywhere — including
 * a host with a strict content security policy that blocks external origins.
 *
 * This is a shipping mechanism, not a second implementation: the markup, the
 * CSS and the JavaScript are exactly what `npm run build` produced. Nothing is
 * rewritten except the URLs that pointed at sibling files.
 */

import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const [
  entry = "out/index.html",
  destination = "out/standalone.html",
  behaviour,
] = process.argv.slice(2);

const OUT_ROOT = resolve(dirname(entry));

const MIME = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  // Missing this is silent and total: the clip embeds as
  // application/octet-stream and the browser refuses it with
  // "Unable to load URL due to content type", leaving a poster and no video.
  ".webm": "video/webm",
};

/**
 * Video is embedded only when it stays within budget. Base64 costs a third
 * again on top of the file, and a single-file page that has to arrive whole
 * before anything renders is a worse page than one whose backdrop is a still.
 * Past the ceiling the clips are dropped and the poster frames carry it — the
 * same path a metered visitor already takes.
 */
const VIDEO_BUDGET_BYTES = 6 * 1024 * 1024;

const extOf = (p) => p.slice(p.lastIndexOf("."));

/** Resolve a URL as emitted by the build back to a file inside out/. */
const localPath = (url, fromDir) =>
  url.startsWith("/") ? join(OUT_ROOT, url) : resolve(fromDir, url);

async function dataUri(path) {
  const buf = await readFile(path);
  const mime = MIME[extOf(path)] ?? "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Rewrite every url(...) inside a stylesheet to an embedded data URI. */
async function inlineCss(cssPath) {
  let css = await readFile(cssPath, "utf8");
  const dir = dirname(cssPath);
  const refs = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)];

  for (const [match, url] of refs) {
    if (url.startsWith("data:")) continue;
    try {
      const uri = await dataUri(localPath(url, dir));
      css = css.split(match).join(`url(${uri})`);
    } catch {
      console.warn(`  could not embed ${url}`);
    }
  }
  return css;
}

/** Escape a closing script tag so an embedded bundle cannot end its own tag. */
const safeScript = (js) => js.replaceAll("</script", "<\\/script");

async function main() {
  let html = await readFile(entry, "utf8");
  const embedded = { css: 0, scripts: 0, images: 0 };

  // 1. Stylesheets.
  const links = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)];
  for (const [tag] of links) {
    const href = tag.match(/href="([^"]+)"/)?.[1];
    if (!href) continue;
    const css = await inlineCss(localPath(href, OUT_ROOT));
    html = html.replace(tag, `<style>${css}</style>`);
    embedded.css++;
  }

  // 2. Preload hints now point at files that will not exist.
  html = html.replace(/<link[^>]*rel="preload"[^>]*>/g, "");

  // 2b. The favicon, which carries a cache-busting query string.
  for (const [tag, href] of html.matchAll(/<link[^>]*rel="icon"[^>]*href="([^"]+)"[^>]*>/g)) {
    try {
      const uri = await dataUri(localPath(href.split("?")[0], OUT_ROOT));
      html = html.replace(tag, tag.replace(href, uri));
      embedded.images++;
    } catch {
      html = html.replace(tag, "");
    }
  }

  // 3. Images and video, across src, srcset, poster and the deferred
  //    deferred data-webm / data-mp4 the backdrop uses to keep clips off the
  //    critical path.
  const assets = new Set(
    [
      ...html.matchAll(
        /(?:src|srcSet|srcset|poster|data-webm|data-mp4)="(\/(?:img|video|_next)\/[^"]+)"/g,
      ),
    ].map((m) => m[1]),
  );
  // Only the format a browser actually picks is worth embedding. WebM covers
  // everything except Safari, and a single-file page is opened by a person, not
  // served to a whole audience, so the MP4 twin is dropped rather than doubling
  // the file for a fallback that will not be used.
  const isClip = (u) => u.endsWith(".webm") || u.endsWith(".mp4");
  const videos = [...assets].filter((u) => u.endsWith(".webm"));
  let videoBytes = 0;
  for (const url of videos) {
    try {
      videoBytes += (await stat(localPath(url, OUT_ROOT))).size;
    } catch {
      /* Reported below when the embed itself fails. */
    }
  }
  const embedVideo = videoBytes > 0 && videoBytes <= VIDEO_BUDGET_BYTES;

  for (const url of assets) {
    if (url.endsWith(".js")) continue;
    if (url.endsWith(".mp4") && embedVideo) {
      html = html.split(`data-mp4="${url}"`).join('data-mp4=""');
      continue;
    }

    if (isClip(url) && !embedVideo) {
      // Drop the source so the element never reaches for a file that is not
      // there; its poster frame is already embedded and stands in.
      html = html
        .split(`data-webm="${url}"`).join('data-webm=""')
        .split(`data-mp4="${url}"`).join('data-mp4=""');
      continue;
    }

    try {
      const uri = await dataUri(localPath(url, OUT_ROOT));
      html = html.split(`"${url}"`).join(`"${uri}"`);
      embedded.images++;
    } catch {
      console.warn(`  could not embed ${url}`);
    }
  }

  if (videos.length) {
    console.log(
      embedVideo
        ? `  video embedded: ${(videoBytes / 1024 / 1024).toFixed(2)} MB across ${videos.length} clip(s)`
        : `  video dropped: ${(videoBytes / 1024 / 1024).toFixed(2)} MB exceeds the ${VIDEO_BUDGET_BYTES / 1024 / 1024} MB ceiling — posters carry the backdrop`,
    );
  }

  // 4. Scripts.
  //
  //    The framework bundle cannot simply be embedded: Turbopack's runtime
  //    resolves its own chunks by URL at execution time, so an inlined copy
  //    still triggers a fetch for a file that is no longer there. Measured, not
  //    assumed — inlining them produced CORS failures and a dead ripple.
  //
  //    So the framework scripts come out and a single self-contained behaviour
  //    bundle goes in. The markup is already fully rendered in this file, and
  //    the bundle imports the same geometry and rate modules the site does.
  html = html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>/g, "");
  html = html.replace(/<script[^>]*>self\.__next_f[\s\S]*?<\/script>/g, "");

  if (behaviour) {
    const js = await readFile(behaviour, "utf8");
    html = html.replace("</body>", `<script>${safeScript(js)}</script></body>`);
    embedded.scripts++;
  }

  await writeFile(destination, html);

  const bytes = Buffer.byteLength(html);
  console.log(
    `${basename(destination)}: ${(bytes / 1024 / 1024).toFixed(2)} MB — ` +
      `${embedded.css} stylesheet(s), ${embedded.scripts} script(s), ${embedded.images} asset(s)`,
  );

  const leftover = [...html.matchAll(/(?:src|href)="(\/[^"]*)"/g)].map((m) => m[1]);
  console.log(
    leftover.length
      ? `WARNING unembedded references remain: ${[...new Set(leftover)].join(", ")}`
      : "no unembedded references remain",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
