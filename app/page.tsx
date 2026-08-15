import RevealController from "@/components/RevealController";
import Divider from "@/components/ui/Divider";
import Hero from "@/components/sections/Hero";
import Position from "@/components/sections/Position";
import Services from "@/components/sections/Services";
import Lanes from "@/components/sections/Lanes";
import Excellence from "@/components/sections/Excellence";
import Process from "@/components/sections/Process";
import SeaLevel from "@/components/ui/SeaLevel";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/sections/Footer";

/**
 * Composition only. Every section owns its own layout and copy, and every
 * string lives in content/ rather than here.
 *
 * Dividers carry their index so the wave between two sections is a specific
 * one of the seven rather than the same rule repeated.
 */
export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-marine focus:px-4 focus:py-2 focus:font-data focus:text-data focus:text-surface"
      >
        Skip to content
      </a>

      <RevealController />

      <main id="main">
        <span id="top" />
        <Hero />
        <Position />
        <Divider index={1} />
        <Services />
        <Lanes />
        <Excellence />
        <Divider index={4} />
        <Process />
        <Divider index={5} />
        {/* The waterline. The sea clip takes over the backdrop from here — the
            backdrop anchors on this element's id rather than on a scroll
            fraction, so the line and the change can never drift apart. */}
        <SeaLevel />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
