import { ConvexClientProvider } from "@/components/convex-provider";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Cormorant, Inter } from "next/font/google";
import type React from "react";
import { Toaster } from "sonner";
import "./globals.css";

const cormorant = Cormorant({ subsets: ["latin"] });

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Dev Quiz Battle",
  description: "Multiplayer coding duels staged like a modern quest board.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning>
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/favicon/apple-touch-icon.png"
        />
        <link rel="manifest" href="/favicon/site.webmanifest" />
        <body className={`${inter.className} ${cormorant.className}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>
              <div className="relative flex flex-col min-h-screen">
                <Navbar />
                {children}
                <footer className="bg-background/70 backdrop-blur-xl mt-10 border-border/60 border-t">
                  <div className="py-6 md:py-8 container">
                    <div className="mb-6 quest-divider" />
                    <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <p className="quest-kicker">Guild Ledger</p>
                        <p className="text-muted-foreground text-sm">
                          Real-time quiz duels, forged by Convex and Groq,
                          dressed as a living quest board.
                        </p>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        &copy; {new Date().getFullYear()} Dev Quiz Battle. Tutti
                        i diritti riservati.
                      </p>
                    </div>
                  </div>
                </footer>
              </div>
              <Toaster richColors />
            </ConvexClientProvider>
          </ThemeProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
