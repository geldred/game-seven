import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAME SEVEN — Draft your five. Survive the series.",
  description:
    "Draft an all-time NBA five, get matched against a legendary team from history, and settle it in a best-of-seven.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
