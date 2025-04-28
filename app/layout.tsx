import { Navbar } from "@/components/layout/navbar";
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
            <div className="flex flex-col min-h-screen">
              <Navbar />
              {children}
              <footer className="py-6 md:py-0 border-t">
                <div className="flex md:flex-row flex-col justify-between items-center gap-4 md:h-16 container">
                  <p className="text-muted-foreground text-sm">
                    &copy; {new Date().getFullYear()} DevQuizBattle. Tutti i
                    diritti riservati.
                  </p>
                </div>
              </footer>
            </div>
            <Toaster richColors />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
