import { getProfileWithScore } from "@/lib/supabase-profiles";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileContent } from "./ProfileContent";
import { ProfileContentError } from "./ProfileContentError";
import { ProfileContentFallback } from "./ProfileContentFallback";

async function ProfileLoader({ userId }: { userId: string }) {
  try {
    const profileData = await getProfileWithScore(userId);
    return (
      <ProfileContent
        profile={{
          id: profileData.profile_id,
          username: profileData.username,
          avatar_url: profileData.avatar_url,
          total_score: profileData.total_score,
        }}
      />
    );
  } catch (e: any) {
    return (
      <ProfileContentError
        error={e.message || "Errore nel caricamento del profilo."}
      />
    );
  }
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }
  return (
    <Suspense fallback={<ProfileContentFallback />}>
      <ProfileLoader userId={data.user.id} />
    </Suspense>
  );
}
