import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CreateGameForm } from "./CreateGameForm";
import { JoinGameForm } from "./JoinGameForm";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  const user = data.user;
  return (
    <main className="flex-1 py-8 container">
      <h1 className="mb-8 font-bold text-3xl">
        <span className="font-dqb text-gradient text-4xl">Dashboard</span>
      </h1>
      <div className="gap-8 grid md:grid-cols-2">
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle>Crea una nuova partita</CardTitle>
            <CardDescription>
              Imposta una nuova sfida di quiz di programmazione
            </CardDescription>
          </CardHeader>
          <CardContent>{user && <CreateGameForm user={user} />}</CardContent>
        </Card>
        <Card className="gradient-border glass-card">
          <CardHeader>
            <CardTitle>Unisciti a una partita</CardTitle>
            <CardDescription>
              Inserisci un codice partita per unirti a una partita esistente
            </CardDescription>
          </CardHeader>
          <CardContent>{user && <JoinGameForm user={user} />}</CardContent>
        </Card>
      </div>
    </main>
  );
}
