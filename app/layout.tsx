import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/server";
import { Inter } from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "DevQuizBattle",
  description: "AI-Powered Multiplayer Coding Quiz Game",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex flex-col min-h-screen">
            <Navbar user={data.user} />
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
        </ThemeProvider>
      </body>
    </html>
  );
}
