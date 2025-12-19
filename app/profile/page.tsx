"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { ProfileContent } from "./ProfileContent";
import { ProfileContentError } from "./ProfileContentError";
import { ProfileContentFallback } from "./ProfileContentFallback";

export default function ProfilePage() {
  const router = useRouter();
  const currentUser = useQuery(api.auth.currentUser);
  const profileData = useQuery(
    api.leaderboard.getUserProfileWithScore,
    currentUser?._id ? { user_id: currentUser._id } : "skip"
  );

  // Loading state
  if (currentUser === undefined || profileData === undefined) {
    return <ProfileContentFallback />;
  }

  // Not authenticated
  if (!currentUser) {
    router.push("/auth/login");
    return null;
  }

  // Error state
  if (!profileData) {
    return <ProfileContentError error="Errore nel caricamento del profilo." />;
  }

  return (
    <ProfileContent
      profile={{
        id: currentUser._id,
        user_name: currentUser.username || currentUser.name || "Unknown",
        full_name: currentUser.name || currentUser.username || "Unknown",
        avatar_url: currentUser.image || null,
        total_score: profileData.totalScore,
      }}
    />
  );
}
