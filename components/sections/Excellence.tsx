import Section from "@/components/ui/Section";
import { EXCELLENCE } from "@/content/copy";

/**
 * Commitment to excellence.
 *
 * Deliberately the least animated section on the page: the ripple flattens to
 * nothing behind it and there is no reveal stagger. Compliance material that
 * performs is compliance material a buyer distrusts.
 *
 * Set as a document rather than as cards — no icons, no badges, no seals.
 */
export default function Excellence() {
  return (
    <Section id="excellence" amplitude={0} className="py-24 sm:py-32">
      <div className="shell layer-content grid grid-cols-12 gap-x-6 gap-y-10">
        <div className="col-span-12 lg:col-span-4">
          <p className="font-data text-eyebrow uppercase text-marine">
            {EXCELLENCE.eyebrow}
          </p>
          <h2 className="mt-5 font-display font-expanded text-display-2 text-ink">
            {EXCELLENCE.heading}
          </h2>
        </div>

        <div className="col-span-12 border-t border-mist-deep pt-8 lg:col-span-7 lg:col-start-6 lg:border-t-0 lg:pt-0">
          {EXCELLENCE.body.map((paragraph) => (
            <p
              key={paragraph.slice(0, 24)}
              className="mt-6 max-w-[62ch] text-body-lg text-graphite first:mt-0"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </Section>
  );
}
