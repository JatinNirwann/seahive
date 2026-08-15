import { dividerPath } from "@/lib/wave";

/**
 * A section divider: one wave at low amplitude, in place of a horizontal rule.
 *
 * The wave between two sections is a specific one of the seven, carrying the
 * section's index as its phase — so the dividers down the page are a sequence
 * rather than the same squiggle repeated.
 *
 * Generated once at build time. It never animates, so it costs no runtime.
 */
export default function Divider({ index }: { index: number }) {
  const d = dividerPath(index, 1200, 36);

  return (
    <div className="shell layer-content" aria-hidden="true">
      <svg
        viewBox="0 0 1200 36"
        preserveAspectRatio="none"
        className="h-9 w-full text-marine"
      >
        {/* Drawn by default. RevealController hides and re-draws it only once
            it has confirmed motion is allowed, so the rule is complete on a
            page that never runs its JavaScript. */}
        <path
          data-divider-path
          d={d}
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset="0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
