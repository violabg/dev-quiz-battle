"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { CreateGameForm } from "./CreateGameForm";
import { JoinGameForm } from "./JoinGameForm";

export default function DashboardPage() {
  const currentUser = useQuery(api.auth.currentUser);
  const router = useRouter();

  if (currentUser === undefined) {
    return (
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  if (!currentUser) {
    router.push("/auth/login");
    return null;
  }

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
          <CardContent>
            <CreateGameForm />
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
            <JoinGameForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
