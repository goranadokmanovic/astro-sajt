"use client";

import { useRef, useState } from "react";
import {
  useScroll,
  useMotionValueEvent,
  useTransform,
  motion,
} from "framer-motion";
import { scrollState } from "@/lib/scrollState";
import SolarSystemLoader from "./SolarSystemLoader";

type Side = "left" | "right";

const STOPS = [
  {
    id: "01",
    name: "Sunce",
    eyebrow: "Suština.",
    body: "Sunce je vaše jezgro — identitet, vitalnost i svrha. Tu počinje svaka natalna karta.",
    start: 0.125,
    end: 0.25,
    side: "left" as Side,
  },
  {
    id: "02",
    name: "Mesec",
    eyebrow: "Emocije.",
    body: "Mesec čuva vaš unutrašnji svet — osećanja, potrebe i podsvesne obrasce koji vas vode.",
    start: 0.25,
    end: 0.375,
    side: "right" as Side,
  },
  {
    id: "03",
    name: "Merkur",
    eyebrow: "Um.",
    body: "Merkur vlada mislima i rečima — način na koji razumete svet i delite sebe sa drugima.",
    start: 0.375,
    end: 0.5,
    side: "left" as Side,
  },
  {
    id: "04",
    name: "Venera",
    eyebrow: "Odnosi.",
    body: "Venera otkriva kako volite i šta vas ispunjava — vrednosti, bliskost i samovrednost.",
    start: 0.5,
    end: 0.625,
    side: "right" as Side,
  },
  {
    id: "05",
    name: "Mars",
    eyebrow: "Energija.",
    body: "Mars je vaš pokretač — volja, strast i način na koji se borite za ono što želite.",
    start: 0.625,
    end: 0.75,
    side: "left" as Side,
  },
  {
    id: "06",
    name: "Saturn",
    eyebrow: "Lekcije.",
    body: "Saturn pokazuje gde su blokade i obrasci koji traže rad — i gde vas čeka najveći rast.",
    start: 0.75,
    end: 0.875,
    side: "right" as Side,
  },
];

function PlanetCard({
  stop,
  active,
}: {
  stop: (typeof STOPS)[number];
  active: boolean;
}) {
  const isLeft = stop.side === "left";
  return (
    <motion.div
      className={`absolute top-1/2 -translate-y-1/2 w-full max-w-md pointer-events-none px-8 md:px-12 ${
        isLeft ? "left-12" : "right-12"
      }`}
      initial={{ opacity: 0, x: isLeft ? -32 : 32 }}
      animate={{
        opacity: active ? 1 : 0,
        x: active ? 0 : isLeft ? -32 : 32,
      }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Warm ambient glow — mirrors the station fill light on the text side */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(212,168,67,0.06) 0%, transparent 68%)",
          filter: "blur(40px)",
          transform: "scale(1.3)",
        }}
      />

      <p className="font-mono text-[11px] tracking-[0.24em] text-accent uppercase mb-4">
        {stop.id} · {stop.name}
      </p>
      <h2 className="font-serif italic text-5xl md:text-6xl text-text leading-tight mb-5">
        {stop.eyebrow}
      </h2>
      <p className="text-sm md:text-base text-text-muted leading-[1.75]">
        {stop.body}
      </p>
    </motion.div>
  );
}

export default function ScrollJourneyHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIdx, setActiveIdx] = useState(-1);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const fadeOpacity = useTransform(scrollYProgress, [0.96, 1.0], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    scrollState.progress = p;

    let next = -1;
    for (let i = 0; i < STOPS.length; i++) {
      if (p >= STOPS[i].start && p < STOPS[i].end) {
        next = i;
        break;
      }
    }
    if (next !== activeIdx) setActiveIdx(next);
  });

  return (
    <section id="hero" ref={sectionRef} className="relative h-[600vh]">
      <div className="sticky top-0 h-screen relative">
        {/* 3D canvas */}
        <SolarSystemLoader />

        {/* Planet text cards */}
        <div className="absolute inset-0 pointer-events-none">
          {STOPS.map((stop, i) => (
            <PlanetCard key={stop.id} stop={stop} active={activeIdx === i} />
          ))}
        </div>

        {/* End-of-journey fade to background */}
        <motion.div
          className="absolute inset-0 bg-background pointer-events-none"
          style={{ opacity: fadeOpacity }}
        />

        {/* Progress strip */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4 pointer-events-none z-10">
          <span className="font-mono text-[9px] tracking-[0.32em] text-accent/50 uppercase shrink-0">
            Putovanje
          </span>
          <div className="relative flex-1 h-px bg-white/10 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 right-0 bg-accent"
              style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
