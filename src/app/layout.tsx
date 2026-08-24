import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { I18nProvider } from "@/lib/i18n";
import "./globals.css";

const sans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Consistency Guard — prop-firm payout compliance checker",
  description:
    "Measure a funded trading account against Hola Prime's published concentration, risk and payout rules, and size the next order so a win cannot breach them.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
