import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kayi Apartments",
  description: "Guest-facing bilingual serviced apartment listing website.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
