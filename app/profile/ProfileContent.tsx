import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

interface ProfileData {
  id: string;
  username: string;
  avatar_url?: string | null;
  total_score: number;
}

export function ProfileContent({ profile }: { profile: ProfileData }) {
  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh]">
      <Card className="flex flex-col items-center bg-gradient-to-br from-[oklch(0.98_0.01_220)] dark:from-[oklch(0.25_0.02_220)] to-[oklch(0.85_0.04_270)] dark:to-[oklch(0.45_0.04_270)] p-8 border border-gradient w-full max-w-md">
        <Avatar className="mb-4 border-4 border-gradient w-20 h-20">
          <AvatarImage
            src={profile.avatar_url || "/placeholder-user.jpg"}
            alt={profile.username || "Avatar"}
          />
          <AvatarFallback className="text-3xl">
            {profile.username?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <h2 className="mb-2 font-bold text-gradient text-2xl">
          {profile.username}
        </h2>
        <div className="flex flex-col items-center gap-2">
          <span className="font-semibold text-lg">Punteggio totale</span>
          <span className="bg-clip-text bg-gradient-to-r from-[oklch(0.7_0.15_200)] to-[oklch(0.7_0.15_320)] font-bold text-gradient text-transparent text-3xl">
            {profile.total_score}
          </span>
        </div>
      </Card>
    </div>
  );
}
