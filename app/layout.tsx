import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WK AI | Wayne Kerr",
  description: "AI assistant for passive component testing. Identify DUTs, interpret sweep graphs, and get suggested test setups—powered by Wayne Kerr precision measurement.",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-grid">
          <div className="min-h-screen bg-gradient-to-br from-white/90 via-white/60 to-slate-100/80 dark:from-slate-950/80 dark:via-slate-950/60 dark:to-slate-900/80">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
