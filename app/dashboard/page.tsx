import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateGameForm } from "./CreateGameForm";
import { JoinGameForm } from "./JoinGameForm";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/auth/login");
  }
  const user = data.user;
  return (
    <main className="flex-1 py-8 container">
      <h1 className="mb-8 font-bold text-3xl">
        <span className="text-gradient">Dashboard</span>
      </h1>
      <div className="gap-8 grid md:grid-cols-2">
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle>Crea una nuova partita</CardTitle>
            <CardDescription>
              Imposta una nuova sfida di quiz di programmazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateGameForm user={user} />
          </CardContent>
        </Card>
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle>Unisciti a una partita</CardTitle>
            <CardDescription>
              Inserisci un codice partita per unirti a una partita esistente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <JoinGameForm user={user} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
