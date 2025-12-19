"use client";

import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const authActions = useAuthActions();

  const logout = async () => {
    await authActions.signOut();
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
