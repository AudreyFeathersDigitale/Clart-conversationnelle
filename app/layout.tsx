import type { Metadata } from "next";
import "./globals.css";

import {
  Cormorant_Garamond,
  Manrope,
} from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Diag Clarté",
  description: "Lead magnet conversationnel intelligent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${cormorant.variable} ${manrope.variable}`}
      >
        {children}
      </body>
    </html>
  );
}