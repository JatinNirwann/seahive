/**
 * Prefix for assets referenced by hand.
 *
 * Next rewrites the URLs it generates itself (scripts, styles, fonts) when
 * `basePath` is set, but it cannot rewrite a string literal in a `src`
 * attribute. Anything we point at in `public/` has to be prefixed here, or it
 * 404s the moment the site is served from a subdirectory — which is exactly
 * what a GitHub Pages project site does.
 *
 * Set NEXT_PUBLIC_BASE_PATH at build time; empty everywhere else.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
