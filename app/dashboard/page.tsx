"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { CirclePlus, Loader2, ScrollText, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateGameForm } from "./CreateGameForm";
import { JoinGameForm } from "./JoinGameForm";

export default function DashboardPage() {
  const currentUser = useQuery(api.queries.auth.currentUser);
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.push("/auth/login");
    }
  }, [currentUser, router]);

  if (currentUser === undefined) {
    return (
      <main className="flex flex-1 justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </main>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <main className="quest-page">
      <div className="space-y-8 container">
        <section className="p-6 md:p-8 gradient-border quest-panel">
          <div className="lg:items-end gap-6 grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <p className="quest-kicker">Sala di comando</p>
              <h1 className="font-dqb text-4xl md:text-6xl">Dashboard</h1>
              <p className="max-w-2xl text-muted-foreground text-base md:text-lg leading-8">
                Qui si apre la prossima missione. Crea un nuovo scontro o entra
                in una stanza gia attiva con un pannello pensato come una
                bacheca operativa da gilda.
              </p>
            </div>
            <div className="gap-4 grid sm:grid-cols-2">
              <div className="quest-stat">
                <CirclePlus className="mb-3 size-5 text-primary" />
                <p className="font-dqb text-2xl">Nuova partita</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Configura il prossimo duello e genera il codice stanza.
                </p>
              </div>
              <div className="quest-stat">
                <Swords className="mb-3 size-5 text-accent" />
                <p className="font-dqb text-2xl">Join rapido</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Inserisci un codice e rientra subito nell&apos;azione.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="gap-8 grid md:grid-cols-2">
          <Card className="gradient-border glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CirclePlus className="size-5 text-primary" /> Crea una nuova
                partita
              </CardTitle>
              <CardDescription>
                Imposta una nuova sfida di quiz di programmazione
              </CardDescription>
            </CardHeader>
            <CreateGameForm />
          </Card>
          <Card className="gradient-border glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="size-5 text-accent" /> Unisciti a una
                partita
              </CardTitle>
              <CardDescription>
                Inserisci un codice partita per unirti a una partita esistente
              </CardDescription>
            </CardHeader>
            <JoinGameForm />
          </Card>
        </div>
      </div>
    </main>
  );
}
