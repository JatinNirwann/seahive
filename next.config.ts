import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The site has no dynamic data, so it ships as a static export that any
  // CDN or object store can serve. This also keeps the Indian-mobile
  // performance budget honest: no server round trip before first paint.
  output: "export",
  images: {
    // Required by `output: export` — there is no image optimisation server.
    // Every image is pre-encoded to AVIF with a WebP fallback instead.
    unoptimized: true,
  },
  trailingSlash: true,

  // A GitHub Pages project site is served from /<repo>/, not from the root.
  // Set NEXT_PUBLIC_BASE_PATH at build time there; leave it unset for local
  // work and for any host that serves the site from its own domain root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;
