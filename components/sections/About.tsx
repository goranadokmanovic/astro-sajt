"use client";

import { Reveal, RevealWords } from "@/components/Reveal";

export default function About() {
  return (
    <section id="o-meni" className="bg-background py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-16 md:grid-cols-2 md:items-center">
          <div>
            <Reveal>
              <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase mb-6">
                09 · O meni
              </p>
            </Reveal>

            <h2 className="font-serif italic text-4xl md:text-5xl text-text leading-tight">
              <RevealWords text="Astro Zvezdana" />
              <br />
              <RevealWords text="Mladjenović." className="text-text-muted" delay={0.1} />
            </h2>

            <Reveal delay={0.2}>
              <p className="mt-8 text-base text-text-muted leading-relaxed">
                {/* TODO: bio */}
                Bio tekst dolazi uskoro.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="flex justify-center md:justify-end">
            <div className="w-56 h-56 rounded-full bg-surface border-2 border-accent/30 flex items-center justify-center">
              <span className="font-mono text-[10px] tracking-[0.2em] text-text-subtle uppercase">
                Fotografija
              </span>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
