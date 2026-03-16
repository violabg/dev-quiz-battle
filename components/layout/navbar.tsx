"use client";
import { ModeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { Compass, Loader2, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CurrentUserAvatar } from "../auth/current-user-avatar";
import DQBLogoGradient from "../icons/dqb-gradient-logo";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const authActions = useAuthActions();
  const { isAuthenticated, isLoading } = useConvexAuth();

  const handleSignOut = async () => {
    await authActions.signOut();
    router.push("/auth/login");
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Dashboard", href: "/dashboard" },
    { name: "Classifica", href: "/leaderboard" },
  ] as const;

  return (
    <header className="top-0 z-50 sticky px-3 md:px-4 pt-3 md:pt-4">
      <div className="container">
        <div className="flex justify-between items-center px-3 md:px-5 h-16 md:h-[4.6rem] quest-shell">
          <div className="flex md:flex-row flex-row-reverse items-center gap-2 md:gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex justify-center items-center bg-primary/10 shadow-lg shadow-primary/15 border border-primary/25 rounded-2xl size-10">
                <DQBLogoGradient size={24} />
              </div>
              <div className="hidden md:block">
                <p className="quest-kicker">Quest Board</p>
                <span className="font-dqb text-xl leading-none">
                  Dev Quiz Battle
                </span>
              </div>
            </Link>
            <nav className="hidden md:flex gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition-all ${
                    pathname === item.href
                      ? "border-primary/35 bg-primary/12 text-primary shadow-md shadow-primary/15"
                      : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
            <div className="md:hidden">
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="glass"
                      size="icon"
                      aria-label="Apri menu di navigazione"
                    >
                      <Menu className="w-6 h-6" />
                    </Button>
                  }
                />
                <PopoverContent
                  align="start"
                  className="bg-popover/92 backdrop-blur-xl p-2 border-border/70 rounded-[calc(var(--radius)+0.4rem)] w-64"
                >
                  <div className="flex items-center gap-2 mb-2 px-2 py-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-[0.26em]">
                    <Compass className="size-3.5" /> Mappa
                  </div>
                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] transition-colors ${
                          pathname === item.href
                            ? "bg-primary/12 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </nav>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ModeToggle />
            {isLoading ? (
              <Loader2 className="mr-2 w-4 h-4 animate-spin" />
            ) : (
              <>
                {isAuthenticated ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="glass" size="icon">
                          <CurrentUserAvatar />
                        </Button>
                      }
                    ></DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-popover/95 backdrop-blur-xl border-border/70 rounded-[calc(var(--radius)+0.3rem)]"
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          render={<Link href="/profile">Profilo</Link>}
                        ></DropdownMenuItem>
                        <DropdownMenuItem
                          render={<Link href="/dashboard">Dashboard</Link>}
                        ></DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 w-4 h-4" />
                        <span>Esci</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    className={`${buttonVariants({
                      variant: "gradient",
                    })}`}
                    href="/auth/login"
                  >
                    Accedi
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
