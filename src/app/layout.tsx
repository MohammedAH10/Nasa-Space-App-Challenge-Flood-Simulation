import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moon Squad — Build a rocket, land on the Moon",
  description:
    "A kid-friendly WebGL rocket builder. Fit parts, balance thrust and fuel, then fly to the Moon with a steering and staging mini-game.",
  applicationName: "Moon Squad",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b1f",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
