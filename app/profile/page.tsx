"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getProfileWithScore } from "@/lib/supabase-profiles";
import { useSupabase } from "@/lib/supabase-provider";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface ProfileData {
  id: string;
  username: string;
  avatar_url?: string | null;
  total_score: number;
}

export default function ProfilePage() {
  const { user, supabase } = useSupabase();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const profileData = await getProfileWithScore(supabase, user.id);
        setProfile({
          id: profileData.profile_id,
          username: profileData.username,
          avatar_url: profileData.avatar_url,
          total_score: profileData.total_score,
        });
      } catch (e: any) {
        setError(e.message || "Errore nel caricamento del profilo.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, supabase]);

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Card className="p-8 w-full max-w-md text-center">
          <h2 className="mb-4 font-bold text-gradient text-2xl">Profilo</h2>
          <p className="mb-4">
            Devi essere autenticato per vedere il tuo profilo.
          </p>
          <Button asChild>
            <a href="/login">Accedi</a>
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Loader2 className="mb-4 w-8 h-8 text-primary animate-spin" />
        <span>Caricamento profilo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Card className="p-8 w-full max-w-md text-center">
          <h2 className="mb-4 font-bold text-gradient text-2xl">Profilo</h2>
          <p className="mb-4 text-red-500">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh]">
      <Card className="flex flex-col items-center bg-gradient-to-br from-[oklch(0.98_0.01_220)] dark:from-[oklch(0.25_0.02_220)] to-[oklch(0.85_0.04_270)] dark:to-[oklch(0.45_0.04_270)] p-8 border border-gradient w-full max-w-md">
        <Avatar className="mb-4 border-4 border-gradient w-20 h-20">
          <AvatarImage
            src={profile?.avatar_url || "/placeholder-user.jpg"}
            alt={profile?.username || "Avatar"}
          />
          <AvatarFallback className="text-3xl">
            {profile?.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <h2 className="mb-2 font-bold text-gradient text-2xl">
          {profile?.username}
        </h2>
        <div className="flex flex-col items-center gap-2">
          <span className="font-semibold text-lg">Punteggio totale</span>
          <span className="bg-clip-text bg-gradient-to-r from-[oklch(0.7_0.15_200)] to-[oklch(0.7_0.15_320)] font-bold text-gradient text-transparent text-3xl">
            {profile?.total_score}
          </span>
        </div>
      </Card>
    </div>
  );
}
