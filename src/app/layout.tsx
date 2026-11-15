import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbit Quest — Satellite Mission Design Lab",
  description:
    "Design a satellite, balance mass, power, battery, downlink, and budget, then test it with a 1,000-run Monte Carlo simulation.",
  applicationName: "Orbit Quest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05080f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
