"use client";

import { Button } from "@/components/ui/button";
import { useSupabase } from "@/lib/supabase-provider";
import Link from "next/link";

export function SignInButton() {
  const { user } = useSupabase();
  if (user) return null;
  return (
    <Button variant="outline" size="lg" asChild>
      <Link href="/login">Sign In</Link>
    </Button>
  );
}
