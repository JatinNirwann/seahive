import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
import RippleSystem from "@/components/RippleSystem";
import VideoBackdrop from "@/components/VideoBackdrop";
import "lenis/dist/lenis.css";
import "./globals.css";

/**
 * Archivo's wide capitals echo the stencilled markings on container doors and
 * ULD placards. Google's Archivo is a variable font carrying a `wdth` axis
 * (62–125), so "Archivo Expanded" is this same face at wdth 125 rather than a
 * separate family — requesting the axis here is what makes `.font-expanded`
 * possible without a second download.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

/**
 * Not decoration. Freight runs on fixed-width reference data, and every port
 * code, transit figure and reference number on this site is set in mono.
 */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Seahive Freight — ocean and air freight forwarding from India",
  description:
    "Seahive Freight Private Limited. Ocean and air freight, customs clearance, project and out-of-gauge cargo, moved out of Delhi NCR by a small team that files its own paperwork.",
};

export const viewport: Viewport = {
  themeColor: "#0A1B2E",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexMono.variable} antialiased`}
    >
      <body>
        <SmoothScroll />
        <VideoBackdrop />
        <RippleSystem />
        {children}
      </body>
    </html>
  );
}
