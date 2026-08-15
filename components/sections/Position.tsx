import Section from "@/components/ui/Section";
import Counter from "@/components/ui/Counter";
import { POSITION } from "@/content/copy";
import {
  COUNTRY_COUNT,
  DESTINATION_COUNT,
  GATEWAY_COUNT,
} from "@/content/lanes";

/**
 * Who Seahive is, in two paragraphs, with three figures beside it.
 *
 * The figures are counted off the lane table rather than typed in, so the page
 * cannot claim a number it does not actually list further down. If a lane is
 * removed, the figure falls on its own.
 */
export default function Position() {
  const figures = [
    { value: DESTINATION_COUNT, label: "Destination ports and airports" },
    { value: COUNTRY_COUNT, label: "Countries served" },
    { value: GATEWAY_COUNT, label: "Indian gateways" },
  ];

  return (
    <Section amplitude={0.5} className="py-24 sm:py-32">
      <div className="shell layer-content grid grid-cols-12 gap-x-6 gap-y-14">
        <div className="col-span-12 lg:col-span-7">
          <p data-reveal className="font-data text-eyebrow uppercase text-marine">
            {POSITION.eyebrow}
          </p>
          <h2
            data-reveal
            className="mt-5 font-display font-expanded text-display-2 text-ink"
          >
            {POSITION.heading}
          </h2>
          {POSITION.body.map((p) => (
            <p
              key={p.slice(0, 24)}
              data-reveal
              className="mt-6 max-w-[58ch] text-body-lg text-graphite"
            >
              {p}
            </p>
          ))}
        </div>

        <div className="col-span-12 lg:col-span-4 lg:col-start-9 lg:pt-16">
          <dl className="flex flex-col gap-9">
            {figures.map((f) => (
              <div
                key={f.label}
                data-reveal
                className="border-t border-mist-deep pt-4"
              >
                <dd className="font-display font-expanded text-[clamp(2.5rem,4vw,3.25rem)] leading-none text-marine">
                  <Counter value={f.value} />
                </dd>
                <dt className="mt-3 font-data text-eyebrow uppercase text-graphite">
                  {f.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Section>
  );
}
