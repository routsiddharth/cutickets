import type { Metadata } from "next";
import { Newsreader, Space_Mono } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

// The sans-serif body face is the system UI stack (San Francisco on Apple
// devices), not a loaded webfont — see tailwind.config.ts `fontFamily.sans`.

// Ticket-stub voice: dates, times, prices, and counts on the events list.
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Morningside Tickets",
  description:
    "A verified student marketplace for event-ticket interest at Columbia & Barnard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${newsreader.variable} ${spaceMono.variable}`}>
      <body className="font-sans text-ink min-h-screen">{children}</body>
    </html>
  );
}
