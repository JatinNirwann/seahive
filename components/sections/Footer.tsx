"use client";

import { useRef } from "react";
import Mark from "@/components/ui/Mark";
import { COMPANY, FOOTER } from "@/content/copy";
import { useRippleConverge } from "@/lib/useRipple";

/**
 * The closing move.
 *
 * Across this footer the seven lines converge and re-form the hexagon. The
 * mark closes, and the journey that began with the preloader ends where it
 * started. Scrubbed, so scrolling back up unspools it again.
 */
export default function Footer() {
  const root = useRef<HTMLElement>(null);
  useRippleConverge(root);

  return (
    <footer
      ref={root}
      className="relative border-t border-mist-deep pt-20 pb-14"
    >
      <div className="shell layer-content">
        <div className="flex flex-col items-center gap-6 text-center">
          <Mark className="h-14 w-auto" />
          <p className="font-display font-expanded text-[1.1rem] text-ink">
            {COMPANY.legalName}
          </p>
          <p className="font-data text-data text-graphite">{FOOTER.line}</p>
          <p className="font-data text-eyebrow uppercase text-graphite">
            {FOOTER.place}
          </p>
        </div>

        <div className="mt-16 flex flex-col items-center gap-4 border-t border-mist-deep pt-8 sm:flex-row sm:justify-between">
          {/* Year computed rather than written down, so the footer cannot go
              stale on a site nobody is redeploying weekly. */}
          <p className="font-data text-eyebrow uppercase text-graphite">
            © {new Date().getFullYear()} {COMPANY.legalName}
          </p>
          <nav aria-label="Footer">
            <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
              {[
                { href: "#services", label: "Services" },
                { href: "#lanes", label: "Lanes" },
                { href: "#excellence", label: "Excellence" },
                { href: "#rate-request", label: "Request a rate" },
              ].map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-flex min-h-11 items-center font-data text-eyebrow uppercase text-graphite transition-colors hover:text-marine"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
