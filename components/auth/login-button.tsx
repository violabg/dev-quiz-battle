"use client";

import { Button } from "@/components/ui/button";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

export function LoginButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <>
      {!isAuthenticated && (
        <Button variant="outline" size="lg" asChild>
          <Link href="/auth/login">Accedi</Link>
        </Button>
      )}
    </>
  );
}
