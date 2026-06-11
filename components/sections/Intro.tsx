"use client";

import { Reveal, RevealWords } from "@/components/Reveal";

const STEPS = [
  {
    num: "01",
    title: "Uvid",
    body: "Zajedno čitamo vašu natalnu kartu — planete, znakove i kuće koje oblikuju vaš karakter i put.",
  },
  {
    num: "02",
    title: "Oslobađanje",
    body: "Prepoznajemo obrasce koji vas ograničavaju i razumemo odakle dolaze — bez osude, sa razumevanjem.",
  },
  {
    num: "03",
    title: "Tok",
    body: "Usvajate praktične alate za usklađivanje sa sopstvenim ciklusima i kosmičkim ritmovima.",
  },
];

export default function Intro() {
  return (
    <section id="o-radu" className="bg-background py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase mb-6">
            07 · Pristup
          </p>
        </Reveal>

        <h2 className="font-serif italic text-4xl md:text-5xl text-text leading-tight">
          <RevealWords text="Vaša karta je" />
          <br />
          <RevealWords text="energetska mapa." className="text-text-muted" delay={0.1} />
        </h2>

        <Reveal delay={0.2}>
          <p className="mt-8 max-w-xl text-base text-text-muted leading-relaxed">
            Natalna karta nije sudbina — to je mapa potencijala. Svaki planet, svaki aspekt govori o delu vas koji čeka da bude razumljen, ne promenjen.
          </p>
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.num} delay={0.12 * i}>
              <div className="rounded-2xl bg-surface p-8 border border-white/5 h-full">
                <p className="font-mono text-[10px] tracking-[0.28em] text-accent uppercase mb-4">
                  {step.num}
                </p>
                <h3 className="font-serif italic text-xl text-text mb-3">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
