import type { CSSProperties } from "react";
import Section from "@/components/ui/Section";
import { SERVICES } from "@/content/services";
import { SERVICES_INTRO } from "@/content/copy";

/**
 * Column and row for each cell, in cell widths and row pitches.
 *
 * Two, three, two — the hexagonal flower, a hexagon built out of hexagons.
 * It is the only arrangement of seven that closes on itself, and seven is
 * already this site's number: seven waves in the mark, seven paths in the
 * ripple.
 *
 * The count follows the services, not the other way round. If a service is
 * ever removed, change this to the arrangement that suits the new count rather
 * than inventing a service to keep the shape.
 */
const CELL_POSITIONS: [number, number][] = [
  [0.5, 0],
  [1.5, 0],
  [0, 1],
  [1, 1],
  [2, 1],
  [0.5, 2],
  [1.5, 2],
];

/**
 * The honeycomb.
 *
 * A real tessellation — rows interlock and cells share edges — because the
 * hive is the network, not an icon set. Seven cells as two, three, two: the
 * comb closes into a hexagon of hexagons rather than trailing off.
 *
 * The list is a `<ul>` under the geometry. Screen readers and keyboard users
 * get seven list items in reading order — top pair, middle row left to right,
 * bottom pair; the hexagons are how it looks, not what it is.
 */
export default function Services() {
  return (
    <Section id="services" amplitude={0.75} className="py-24 sm:py-32">
      {/* Intro left, honeycomb right. The grid steps down and to the right, so
          the two halves interlock the way the cells do rather than leaving the
          comb stranded in a corner. */}
      <div className="shell layer-content grid grid-cols-12 items-start gap-x-6 gap-y-14">
        <div className="col-span-12 lg:col-span-4 lg:pt-6">
          <p data-reveal className="font-data text-eyebrow uppercase text-marine">
            {SERVICES_INTRO.eyebrow}
          </p>
          <h2
            data-reveal
            className="mt-5 font-display font-expanded text-display-2 text-ink"
          >
            {SERVICES_INTRO.heading}
          </h2>
          <p data-reveal className="mt-6 max-w-[42ch] text-body-lg text-graphite">
            {SERVICES_INTRO.body}
          </p>
        </div>

        <ul className="hex-grid col-span-12 mx-auto lg:col-span-8 lg:mx-0">
          {SERVICES.map((service, i) => (
            <li
              key={service.code}
              data-reveal
              className="hex-cell"
              style={
                {
                  "--hex-x": CELL_POSITIONS[i][0],
                  "--hex-y": CELL_POSITIONS[i][1],
                } as CSSProperties
              }
            >
              <div className="hex-shell">
                <article className="hex-face flex flex-col justify-center bg-surface px-9 text-center transition-colors duration-300">
                  <p className="font-data text-eyebrow uppercase text-marine">
                    {service.code}
                  </p>
                  <h3 className="mt-3 font-display font-expanded text-[1.3rem] leading-tight text-ink">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-[0.875rem] leading-relaxed text-graphite">
                    {service.body}
                  </p>
                </article>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* The full paragraphs. A hexagon's usable text area is the middle half
          of its height, so the cells carry a trimmed line and the detail lives
          here, where it can be read rather than clipped. Two columns, so the
          list reads as a spread rather than a wall. */}
      <div className="shell layer-content mt-20">
        <dl className="grid gap-x-12 gap-y-10 border-t border-mist-deep pt-10 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <div key={service.code} data-reveal>
              <dt className="flex items-baseline gap-3">
                <span className="font-data text-eyebrow uppercase text-marine">
                  {service.code}
                </span>
                <span className="font-display font-expanded text-[1.05rem] text-ink">
                  {service.title}
                </span>
              </dt>
              <dd className="mt-3 max-w-[54ch] text-body text-graphite">
                {service.detail}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
