import { ThemeProvider } from "@/components/theme-provider";
import { SupabaseProvider } from "@/lib/supabase-provider";
import { Inter } from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "DevQuizBattle",
  description: "AI-Powered Multiplayer Coding Quiz Game",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            {children}
            <Toaster richColors />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
