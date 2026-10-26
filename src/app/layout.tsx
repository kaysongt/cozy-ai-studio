import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio-shell";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Cozy AI Studio",
  description:
    "A ten-stage video floor run by agents for Cozy Digital. Viral-readiness is a checklist, not a promise.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} dark h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <StudioShell>{children}</StudioShell>
      </body>
    </html>
  );
}
