import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk, Syne } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import SmoothScrollProvider from "@/components/SmoothScroll";
import FirebaseHiddenDbSuppress from "@/components/FirebaseHiddenDbSuppress";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

const architxt = localFont({
  src: "../../assets/architxt.ttf",
  variable: "--font-architxt",
});

const inversionz = localFont({
  src: "../../assets/Inversionz.ttf",
  variable: "--font-inversionz",
});

const nechlas = localFont({
  src: "../../assets/Nechlas Demo.ttf",
  variable: "--font-nechlas",
});

const gameshow = localFont({
  src: "../../assets/Gameshow.otf",
  variable: "--font-gameshow",
});

export const metadata: Metadata = {
  title: "Crescent Technocrats Club",
  description: "Empowering student developers, designers, and innovators.",
  verification: {
    google: "-8LHZAo-7UhP9_vcNhDOpZnL1xJdKtRjDCenzhpVGgg",
  },
  icons: {
    icon: [
      { url: "/assets/icon.png", sizes: "any", type: "image/png" },
    ],
    shortcut: "/assets/icon.png",
    apple: [
      { url: "/assets/icon.png", sizes: "180x180", type: "image/png" },
      { url: "/assets/icon.png", sizes: "192x192", type: "image/png" },
      { url: "/assets/icon.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} ${syne.variable} ${architxt.variable} ${inversionz.variable} ${nechlas.variable} ${gameshow.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <FirebaseHiddenDbSuppress />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Analytics />
      </body>
    </html>
  );
}
