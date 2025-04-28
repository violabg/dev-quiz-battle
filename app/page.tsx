import { SignInButton } from "@/components/auth/sign-in-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Code, Cpu, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1">
      <section className="py-12 md:py-24 lg:py-32">
        <div className="px-4 md:px-6 container">
          <div className="flex flex-col items-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl/none tracking-tighter">
                <span className="text-gradient">DevQuizBattle</span>
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                Metti alla prova le tue conoscenze di programmazione in
                battaglie multiplayer in tempo reale con domande generate
                dall&apos;IA
              </p>
            </div>
            <div className="flex sm:flex-row flex-col gap-4">
              <Button asChild size="lg">
                <Link href="/dashboard">Inizia a giocare</Link>
              </Button>
              <SignInButton />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted/50 py-12 md:py-24 lg:py-32">
        <div className="px-4 md:px-6 container">
          <div className="gap-6 lg:gap-12 grid lg:grid-cols-3">
            <Card className="gradient-border glass-card">
              <CardContent className="flex flex-col items-center">
                <div className="inline-block bg-primary/10 p-3 rounded-full">
                  <Code className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl">Sfide di programmazione</h3>
                <p className="text-muted-foreground text-center">
                  Metti alla prova le tue abilità con domande di programmazione
                  specifiche per linguaggio su diversi livelli di difficoltà
                </p>
              </CardContent>
            </Card>
            <Card className="gradient-border glass-card">
              <CardContent className="flex flex-col items-center">
                <div className="inline-block bg-primary/10 p-3 rounded-full">
                  <Cpu className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl">
                  Domande generate dall&apos;IA
                </h3>
                <p className="text-muted-foreground text-center">
                  Domande uniche generate dall&apos;IA garantiscono nuove sfide
                  ogni volta che giochi
                </p>
              </CardContent>
            </Card>
            <Card className="gradient-border glass-card">
              <CardContent className="flex flex-col items-center">
                <div className="inline-block bg-primary/10 p-3 rounded-full">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-xl">Battaglie multiplayer</h3>
                <p className="text-muted-foreground text-center">
                  Sfida i tuoi amici in tempo reale per vedere chi risponde più
                  velocemente
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
