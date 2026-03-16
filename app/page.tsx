import { LoginButton } from "@/components/auth/login-button";
import DQBLogoGradient from "@/components/icons/dqb-gradient-logo";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Castle,
  Crown,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Swords,
  TimerReset,
  Trophy,
  WandSparkles,
} from "lucide-react";
import Link from "next/link";

export default async function Home() {
  const features = [
    {
      icon: ScrollText,
      title: "Missioni forgiate al momento",
      description:
        "Ogni round pesca prompt e livelli di difficolta come se un maestro di gilda stesse scrivendo la prossima prova sul tavolo della mappa.",
    },
    {
      icon: Swords,
      title: "Duelli rapidi, leggibili, reali",
      description:
        "Turni chiari, pressione in tempo reale e feedback immediato. Il ritmo ricorda una sfida da raid, non un modulo da compilare.",
    },
    {
      icon: Trophy,
      title: "Progressione da classifica viva",
      description:
        "Ogni vittoria aggiorna la bacheca della gilda. Linguaggi, punteggi e ranking si leggono come un registro di campagna condiviso.",
    },
  ];

  const callouts = [
    { label: "Tempo reale", value: "Live lobby" },
    { label: "IA", value: "Sfide variabili" },
    { label: "Modalita", value: "PvP a turni" },
  ];

  return (
    <main className="flex-1 overflow-hidden">
      <section className="pt-8 md:pt-12 quest-page">
        <div className="container">
          <div className="lg:items-center gap-8 grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="z-10 relative space-y-8">
              <div className="space-y-5">
                <div className="quest-badge">
                  <Sparkles className="size-3.5" /> Stagione delle sfide
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex justify-center items-center bg-primary/10 shadow-primary/20 shadow-xl border border-primary/25 rounded-[1.8rem] size-18 md:size-24">
                      <DQBLogoGradient size={56} className="md:size-[70px]" />
                    </div>
                    <div>
                      <p className="quest-kicker">Modern Quest Arena</p>
                      <h1 className="font-dqb text-5xl md:text-7xl tracking-tight">
                        Dev Quiz Battle
                      </h1>
                    </div>
                  </div>
                  <p className="max-w-2xl text-muted-foreground text-lg md:text-xl leading-8">
                    Una bacheca di missioni per sviluppatori competitivi: lobby
                    in tempo reale, duelli di codice e ranking condivisi, con la
                    teatralita di una campagna fantasy ma la chiarezza di un
                    prodotto moderno.
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-row flex-col sm:items-center gap-4">
                <Link
                  className={buttonVariants({
                    variant: "gradient",
                    size: "lg",
                  })}
                  href="/dashboard"
                >
                  <Castle className="size-4.5" /> Apri la quest board
                </Link>
                <LoginButton />
              </div>

              <div className="gap-4 grid sm:grid-cols-3">
                {callouts.map((item) => (
                  <div key={item.label} className="quest-stat">
                    <p className="mb-2 quest-kicker">{item.label}</p>
                    <p className="font-dqb text-2xl leading-none">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Card className="gradient-border border-border/70 quest-panel">
              <CardContent className="z-10 relative p-6 md:p-8">
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <p className="mb-2 quest-kicker">Bacheca attiva</p>
                    <h2 className="font-dqb text-3xl">Cronaca della gilda</h2>
                  </div>
                  <div className="flex items-center gap-2 bg-accent/10 px-3 py-1 border border-accent/25 rounded-full font-semibold text-accent text-xs uppercase tracking-[0.22em]">
                    <div className="quest-dot" /> online
                  </div>
                </div>

                <div className="my-6 quest-divider" />

                <div className="space-y-4">
                  <div className="bg-background/72 p-4 border border-border/70 rounded-[1.4rem]">
                    <div className="flex justify-between items-center gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex justify-center items-center bg-primary/12 rounded-2xl size-10 text-primary">
                          <ShieldCheck className="size-5" />
                        </div>
                        <div>
                          <p className="font-dqb text-2xl leading-none">
                            Capitolo I
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Ingaggio, regole, codice stanza
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 border border-border/70 rounded-full font-semibold text-muted-foreground text-xs uppercase tracking-[0.2em]">
                        Entry
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm leading-7">
                      Crea o raggiungi una partita con un pannello che sembra
                      inciso su ottone, non su una dashboard anonima.
                    </p>
                  </div>

                  <div className="gap-4 grid md:grid-cols-2">
                    <div className="bg-background/70 p-4 border border-border/70 rounded-[1.4rem]">
                      <WandSparkles className="mb-3 size-5 text-accent" />
                      <p className="font-dqb text-2xl">Question Forge</p>
                      <p className="mt-2 text-muted-foreground text-sm leading-7">
                        Prompt dinamici costruiti round per round, come missioni
                        distribuite al tavolo della campagna.
                      </p>
                    </div>
                    <div className="bg-background/70 p-4 border border-border/70 rounded-[1.4rem]">
                      <TimerReset className="mb-3 size-5 text-primary" />
                      <p className="font-dqb text-2xl">Turni leggibili</p>
                      <p className="mt-2 text-muted-foreground text-sm leading-7">
                        Stato del match, punteggi e progressione emergono
                        subito, senza rumore visivo.
                      </p>
                    </div>
                  </div>

                  <div className="bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_18%,transparent),color-mix(in_oklab,var(--color-accent)_12%,transparent))] p-4 border border-border/70 rounded-[1.4rem]">
                    <div className="flex justify-between items-center gap-3">
                      <div>
                        <p className="mb-2 quest-kicker">Ricompensa</p>
                        <p className="font-dqb text-3xl">
                          Esperienza competitiva con atmosfera
                        </p>
                      </div>
                      <ArrowRight className="size-5 text-primary" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="pt-4 quest-page">
        <div className="space-y-8 container">
          <div className="space-y-3 max-w-2xl">
            <p className="quest-kicker">Tre pilastri</p>
            <h2 className="font-dqb text-4xl md:text-5xl">
              Un gioco che sembra una campagna, non un CRUD travestito
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-8">
              Ho portato il look verso una sala delle missioni contemporanea:
              pannelli incisi, luci metalliche, accenti verdi da reliquia e una
              gerarchia visiva molto piu netta.
            </p>
          </div>

          <div className="gap-5 grid lg:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card
                key={title}
                className="gradient-border border-border/70 quest-panel"
              >
                <CardContent className="z-10 relative p-6">
                  <div className="flex justify-center items-center bg-primary/10 shadow-lg shadow-primary/10 mb-5 border border-primary/20 rounded-2xl size-12 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-dqb text-3xl leading-none">{title}</h3>
                  <p className="mt-4 text-muted-foreground text-sm md:text-base leading-7">
                    {description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="gap-8 grid md:grid-cols-[0.9fr_1.1fr] p-6 md:p-8 gradient-border quest-panel">
            <div className="space-y-4">
              <p className="quest-kicker">Direzione visiva</p>
              <h2 className="font-dqb text-4xl md:text-5xl">
                Pianta della mappa, ottone, vetro e segnali chiari
              </h2>
              <p className="text-muted-foreground text-base md:text-lg leading-8">
                Il ricordo che deve rimanere e questo: sembra di scegliere la
                prossima missione su un tavolo da gilda illuminato, non di
                navigare una UI stock.
              </p>
            </div>
            <div className="gap-4 grid sm:grid-cols-2">
              <div className="quest-stat">
                <Crown className="mb-3 size-5 text-primary" />
                <p className="font-dqb text-2xl">Shell piu autorevole</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Navbar e footer diventano parti della scenografia, non solo
                  contenitori funzionali.
                </p>
              </div>
              <div className="quest-stat">
                <Sparkles className="mb-3 size-5 text-accent" />
                <p className="font-dqb text-2xl">Form piu fisici</p>
                <p className="mt-2 text-muted-foreground text-sm leading-7">
                  Input, select e bottoni sembrano strumenti della quest board,
                  con superfici piu tattili e rilievo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
