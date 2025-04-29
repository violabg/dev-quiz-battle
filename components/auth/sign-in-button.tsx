"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export async function SignInButton() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) return null;
  return (
    <Button variant="outline" size="lg" asChild>
      <Link href="/auth/login">Sign In</Link>
    </Button>
  );
}
