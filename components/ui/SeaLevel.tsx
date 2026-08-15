import { SEA_LEVEL } from "@/content/copy";

/**
 * The waterline.
 *
 * This is where the backdrop changes to the sea clip, and the line says so out
 * loud. It doubles as the anchor the backdrop switches on: tying the change to
 * a landmark the reader can see beats switching at an arbitrary fraction of
 * the document, because the two then always agree.
 */
export default function SeaLevel() {
  return (
    <div id="sea-level" className="shell layer-content py-10">
      {/* Ink rather than graphite. This line sits exactly on the handover,
          where the crossfade is halfway between two clips and the wash is at
          its least predictable — graphite measured 4.19:1 there. It is a
          landmark rather than body copy, so the heavier tone is right anyway. */}
      <p className="flex items-baseline gap-4 border-t border-mist-deep pt-5 font-data text-data text-ink">
        <span aria-hidden="true" className="text-marine">
          ▾
        </span>
        {SEA_LEVEL.line}
      </p>
    </div>
  );
}
