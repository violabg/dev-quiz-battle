import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export const useCurrentUserName = () => {
  const profile = useQuery(api.queries.auth.getCurrentUserProfile);

  return profile?.username || "?";
};
