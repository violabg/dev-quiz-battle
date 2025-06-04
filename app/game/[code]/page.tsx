import { createClient } from "@/lib/supabase/server";
import { getGameByCode } from "@/lib/supabase/supabase-games";
import { GameClientPage } from "./GameClientPage";

export default async function GamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: game, error } = await getGameByCode(resolvedParams.code);

  if (error || !game || !data?.user) {
    // Optionally, you can redirect or render a not found UI
    return (
      <main className="flex flex-col flex-1 justify-center items-center py-8 container">
        <h1 className="mb-4 font-dqb text-gradient text-4xl">
          Partita non trovata
        </h1>
        <a href="/dashboard" className="btn btn-primary">
          Torna alla Dashboard
        </a>
      </main>
    );
  }

  return <GameClientPage code={game.code} user={data.user} />;
}
