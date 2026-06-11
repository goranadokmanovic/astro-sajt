"use client";

import { Sun, Sparkles, MessageCircle, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Reveal, RevealWords } from "@/components/Reveal";

const SERVICES: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Sun,
    title: "Natalna karta",
    body: "Detaljna analiza vašeg natalnog položaja — ko ste, šta tražite i šta vas pokreće u životu.",
  },
  {
    Icon: Sparkles,
    title: "Godišnji pregled",
    body: "Tranziti i progresije za tekuću godinu — šta vas čeka i kako da se pripremite za promene.",
  },
  {
    Icon: MessageCircle,
    title: "Tematska sesija",
    body: "Fokusirana konsultacija na temu po vašem izboru: ljubav, posao, zdravlje, tranzicije.",
  },
  {
    Icon: GraduationCap,
    title: "Uvod u astrologiju",
    body: "Naučite da čitate svoju kartu — 4-nedeljni program za početnike koji žele dublje razumevanje.",
  },
];

export default function Services() {
  return (
    <section id="usluge" className="bg-surface py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase mb-6">
            08 · Usluge
          </p>
        </Reveal>

        <h2 className="font-serif italic text-4xl md:text-5xl text-text leading-tight">
          <RevealWords text="Kako radimo" />
          <br />
          <RevealWords text="zajedno." className="text-text-muted" delay={0.1} />
        </h2>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {SERVICES.map((svc, i) => (
            <Reveal key={svc.title} delay={0.1 * i}>
              <div className="group rounded-2xl bg-background p-8 border border-white/5 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_0_32px_rgba(212,168,67,0.08)] transition-all duration-300 h-full">
                <svc.Icon
                  className="w-5 h-5 text-accent mb-6"
                  strokeWidth={1.5}
                />
                <h3 className="font-serif italic text-xl text-text mb-3">
                  {svc.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">{svc.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
