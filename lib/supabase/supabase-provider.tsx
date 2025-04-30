"use client";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

interface SupabaseContextValue {
  loading: boolean;
  supabase: SupabaseClient;
  user: User | null;
}

const SupabaseContext = createContext<SupabaseContextValue>({
  user: null,
  loading: true,
  supabase: createClient(),
});

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  return (
    <SupabaseContext.Provider value={{ loading, supabase, user }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useAuth() {
  return useContext(SupabaseContext);
}
