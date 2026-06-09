import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Football AI Match Analyst",
  description: "Automated Tactical Intelligence & Performance Analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
