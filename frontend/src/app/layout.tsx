import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexAI – Intelligent Legal Document Assistant",
  description: "AI-powered legal contract analysis, risk detection, and conversational Q&A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-950 min-h-screen">
        {children}
      </body>
    </html>
  );
}
