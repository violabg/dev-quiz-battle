import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export const useCurrentUserImage = () => {
  const profile = useQuery(api.auth.getCurrentUserProfile);

  return profile?.avatar_url ?? null;
};
