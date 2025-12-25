"use client";
import { buttonVariants } from "@/components/ui/button";
import { useConvexAuth } from "convex/react";
import Link from "next/link";

export function LoginButton() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <>
      {!isAuthenticated && (
        <Link
          className={`${buttonVariants({
            variant: "outline",
            size: "lg",
          })}`}
          href="/auth/login"
        >
          Accedi
        </Link>
      )}
    </>
  );
}
