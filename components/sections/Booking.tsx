"use client";

import dynamic from "next/dynamic";
import { Reveal, RevealWords } from "@/components/Reveal";

const CalWidget = dynamic(() => import("@/components/CalWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[500px]">
      <p className="font-mono text-[11px] tracking-[0.2em] text-text-subtle uppercase">
        Učitavanje...
      </p>
    </div>
  ),
});

export default function Booking() {
  return (
    <section id="zakazivanje" className="bg-surface py-28 md:py-40">
      <div className="mx-auto max-w-5xl px-6">
        <Reveal>
          <p className="font-mono text-[11px] tracking-[0.28em] text-accent uppercase mb-6">
            10 · Termini
          </p>
        </Reveal>

        <h2 className="font-serif italic text-4xl md:text-5xl text-text leading-tight">
          <RevealWords text="Zakažite" />
          <br />
          <RevealWords text="svoj termin." className="text-text-muted" delay={0.1} />
        </h2>

        <Reveal delay={0.2}>
          <div className="mt-12 min-h-[600px] rounded-2xl overflow-hidden bg-background border border-white/5">
            <CalWidget />
          </div>

          <p className="mt-6 text-center text-sm text-text-subtle">
            Ili pišite na{" "}
            <a
              href="mailto:dragana@dokmanovic.rs"
              className="text-accent hover:underline transition-colors"
            >
              dragana@dokmanovic.rs
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
