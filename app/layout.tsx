import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import WC2026Banner from "@/components/WC2026Banner";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import InstallPrompt from "@/components/InstallPrompt";
import PostHogProvider from "@/components/PostHogProvider";

export const metadata: Metadata = {
  title: "Football AI Match Analyst · WC 2026 Edition",
  description: "Automated Tactical Intelligence & Performance Analysis — FIFA World Cup 2026",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Football AI",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f0b429" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="antialiased text-white">
        <PostHogProvider>
          <WC2026Banner />
          <Header />
          {children}
        </PostHogProvider>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}
