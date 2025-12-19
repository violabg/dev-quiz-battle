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
  description: "AI-Powered Multiplayer Coding Quiz Game",
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
              <div className="flex flex-col min-h-screen">
                <Navbar />
                {children}
                <footer className="py-6 md:py-0 border-t">
                  <div className="flex md:flex-row flex-col justify-between items-center gap-4 md:h-16 container">
                    <p className="text-muted-foreground text-sm">
                      &copy; {new Date().getFullYear()} Dev Quiz Battle. Tutti i
                      diritti riservati.
                    </p>
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
