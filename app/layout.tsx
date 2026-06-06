import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
