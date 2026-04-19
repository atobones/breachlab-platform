import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { StatusBar } from "@/components/StatusBar";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${departureMono.variable}`}
    >
      <body className="min-h-screen flex pb-6">
        <Sidebar />
        <main className="flex-1 p-8 max-w-4xl">
          <Header />
          {children}
        </main>
        <StatusBar />
      </body>
    </html>
  );
}
