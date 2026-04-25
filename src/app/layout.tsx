import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatusBar } from "@/components/StatusBar";
import { TerminalWindow } from "@/components/TerminalWindow";
import { CommandPalette } from "@/components/CommandPalette";
import { BootSequence } from "@/components/BootSequence";
import { EarlyAccessBanner } from "@/components/EarlyAccessBanner";
import { MobileNav } from "@/components/MobileNav";
import { getCurrentSession } from "@/lib/auth/session";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const departureMono = localFont({
  src: "../../public/fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "BreachLab",
  description: "Real skills. Real scenarios. No CTF bullshit.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0e0a",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user } = await getCurrentSession();
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${departureMono.variable}`}
    >
      <body className="bl-shell min-h-screen flex pb-6">
        <MobileNav />
        <Sidebar />
        <main className="bl-main flex-1 p-4 max-w-5xl">
          <TerminalWindow username={user?.username ?? null}>
            <EarlyAccessBanner />
            <Header />
            {children}
          </TerminalWindow>
        </main>
        <StatusBar />
        <CommandPalette username={user?.username ?? null} />
        <BootSequence />
      </body>
    </html>
  );
}
