"use client";

import { useRef, useState } from "react";
import {
  useScroll,
  useMotionValueEvent,
  useTransform,
  motion,
} from "framer-motion";
import { scrollState } from "@/lib/scrollState";
import { ELEMENT_COLORS } from "@/lib/zodiac";
import SolarSystemLoader from "./SolarSystemLoader";

type Side = "left" | "right";

// Act 1 STOPS — raw progress values scaled to fit first 60% of 1000vh.
// (Original 600vh values × 0.6 so Act 1 scroll distances feel identical.)
const STOPS = [
  {
    id: "01",
    name: "Sunce",
    eyebrow: "Suština.",
    body: "Sunce je vaše jezgro — identitet, vitalnost i svrha. Tu počinje svaka natalna karta.",
    start: 0.075,
    end: 0.15,
    side: "left" as Side,
  },
  {
    id: "02",
    name: "Mesec",
    eyebrow: "Emocije.",
    body: "Mesec čuva vaš unutrašnji svet — osećanja, potrebe i podsvesne obrasce koji vas vode.",
    start: 0.15,
    end: 0.225,
    side: "right" as Side,
  },
  {
    id: "03",
    name: "Merkur",
    eyebrow: "Um.",
    body: "Merkur vlada mislima i rečima — način na koji razumete svet i delite sebe sa drugima.",
    start: 0.225,
    end: 0.30,
    side: "left" as Side,
  },
  {
    id: "04",
    name: "Venera",
    eyebrow: "Odnosi.",
    body: "Venera otkriva kako volite i šta vas ispunjava — vrednosti, bliskost i samovrednost.",
    start: 0.30,
    end: 0.375,
    side: "right" as Side,
  },
  {
    id: "05",
    name: "Mars",
    eyebrow: "Energija.",
    body: "Mars je vaš pokretač — volja, strast i način na koji se borite za ono što želite.",
    start: 0.375,
    end: 0.45,
    side: "left" as Side,
  },
  {
    id: "06",
    name: "Saturn",
    eyebrow: "Lekcije.",
    body: "Saturn pokazuje gde su blokade i obrasci koji traže rad — i gde vas čeka najveći rast.",
    start: 0.45,
    end: 0.525,
    side: "right" as Side,
  },
];

type ZodiacStop = {
  id: string;
  element: string;
  eyebrow: string;
  signs: string;
  body: string;
  color: string;
  start: number;
  end: number;
  side: Side;
};

// Act 2 ZODIAC_STOPS — timing aligned with SolarSystem.tsx ACT2_ELEMENT_* constants.
// act2p = (p - 0.6) / 0.4; element stations at act2p [0.1875,0.325) [0.325,0.4625) [0.4625,0.60) [0.60,0.7375)
// Finale at act2p [0.7375, 0.9375), exit fly-through at act2p >= 0.9375
const ZODIAC_STOPS: ZodiacStop[] = [
  {
    id: "07",
    element: "VATRA",
    eyebrow: "Strast.",
    signs: "Ovan · Lav · Strelac",
    body: "Znaci vatre rađaju vizionare — nesavladiva volja, hrabrost i svrha koja pali sve oko sebe.",
    color: ELEMENT_COLORS.VATRA,
    start: 0.675,
    end: 0.730,
    side: "left",
  },
  {
    id: "08",
    element: "ZEMLJA",
    eyebrow: "Utemeljenost.",
    signs: "Bik · Devica · Jarac",
    body: "Zemlja gradi careve — strpljenje, posvećenost i majstorstvo koje traje duže od svakog talenta.",
    color: ELEMENT_COLORS.ZEMLJA,
    start: 0.730,
    end: 0.785,
    side: "right",
  },
  {
    id: "09",
    element: "VAZDUH",
    eyebrow: "Sloboda.",
    signs: "Blizanci · Vaga · Vodolija",
    body: "Vazduh povezuje svetove — razum, dijalog i vizija koja prethodi svakoj promeni.",
    color: ELEMENT_COLORS.VAZDUH,
    start: 0.785,
    end: 0.840,
    side: "left",
  },
  {
    id: "10",
    element: "VODA",
    eyebrow: "Dubina.",
    signs: "Rak · Škorpion · Ribe",
    body: "Voda čita duše — intuicija, empatija i emocionalna inteligencija koja vidi iza površine.",
    color: ELEMENT_COLORS.VODA,
    start: 0.840,
    end: 0.895,
    side: "right",
  },
  {
    id: "11",
    element: "KRUG",
    eyebrow: "Celina.",
    signs: "Dvanaest svetova, jedan krug.",
    body: "Svaki zodijak je ogledalo — svemir koji piše svoju priču kroz vas. Vaša karta je jedinstvena kao otisak prsta.",
    color: "#d4a843",
    start: 0.895,
    end: 0.975,
    side: "left",
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

function ZodiacCard({
  stop,
  active,
}: {
  stop: ZodiacStop;
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
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${stop.color}18 0%, transparent 68%)`,
          filter: "blur(40px)",
          transform: "scale(1.3)",
        }}
      />
      <p
        className="font-mono text-[11px] tracking-[0.24em] uppercase mb-4"
        style={{ color: stop.color }}
      >
        {stop.id} · {stop.element}
      </p>
      <h2 className="font-serif italic text-5xl md:text-6xl text-text leading-tight mb-3">
        {stop.eyebrow}
      </h2>
      <p className="font-mono text-[10px] tracking-[0.28em] text-text-subtle uppercase mb-5">
        {stop.signs}
      </p>
      <p className="text-sm md:text-base text-text-muted leading-[1.75]">
        {stop.body}
      </p>
    </motion.div>
  );
}

export default function ScrollJourneyHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [activeZodiacIdx, setActiveZodiacIdx] = useState(-1);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Warm amber glow: peaks when camera is deep inside Lav (~exitT 0.6), short and soft
  const flashOpacity = useTransform(scrollYProgress, [0.985, 0.990, 0.994], [0, 0.85, 0]);
  // Background fade: starts when exit fly begins, complete before EnergyZone boundary shows
  const fadeOpacity  = useTransform(scrollYProgress, [0.975, 0.985], [0, 1]);
  // Progress strip: fades out as the finale completes, gone before the section boundary
  const progressOpacity = useTransform(scrollYProgress, [0.87, 0.93], [1, 0]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // Act 1 3D scene reads this — first 60% of 1000vh maps to 0–1 (same scroll rhythm as original 600vh)
    scrollState.progress = Math.min(p / 0.6, 1.0);
    // Act 2 3D scene reads this — last 40% of 1000vh maps to 0–1
    scrollState.act2Progress = Math.max(0, (p - 0.6) / 0.4);

    let nextPlanet = -1;
    for (let i = 0; i < STOPS.length; i++) {
      if (p >= STOPS[i].start && p < STOPS[i].end) {
        nextPlanet = i;
        break;
      }
    }
    if (nextPlanet !== activeIdx) setActiveIdx(nextPlanet);

    let nextZodiac = -1;
    for (let i = 0; i < ZODIAC_STOPS.length; i++) {
      if (p >= ZODIAC_STOPS[i].start && p < ZODIAC_STOPS[i].end) {
        nextZodiac = i;
        break;
      }
    }
    if (nextZodiac !== activeZodiacIdx) setActiveZodiacIdx(nextZodiac);
  });

  return (
    <section id="hero" ref={sectionRef} className="relative h-[1000vh]">
      <div className="sticky top-0 h-screen relative">
        {/* 3D canvas */}
        <SolarSystemLoader />

        {/* Planet text cards */}
        <div className="absolute inset-0 pointer-events-none">
          {STOPS.map((stop, i) => (
            <PlanetCard key={stop.id} stop={stop} active={activeIdx === i} />
          ))}
          {ZODIAC_STOPS.map((stop, i) => (
            <ZodiacCard key={stop.id} stop={stop} active={activeZodiacIdx === i} />
          ))}
        </div>

        {/* End-of-journey fade to background — z-20 covers the progress strip (z-10) */}
        <motion.div
          className="absolute inset-0 bg-background pointer-events-none"
          style={{ opacity: fadeOpacity, zIndex: 20 }}
        />

        {/* Warm amber glow during camera fly-through — above the dark fade */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: flashOpacity,
            zIndex: 30,
            background: "radial-gradient(ellipse 90% 80% at 50% 42%, #f5d9a0 0%, #d4a843 38%, #c9962e 65%, transparent 88%)",
          }}
        />

        {/* Progress strip — fades out before section boundary becomes visible */}
        <motion.div
          className="absolute bottom-6 left-6 right-6 flex items-center gap-4 pointer-events-none z-10"
          style={{ opacity: progressOpacity }}
        >
          <span className="font-mono text-[9px] tracking-[0.32em] text-accent/50 uppercase shrink-0">
            Putovanje
          </span>
          <div className="relative flex-1 h-px bg-white/10 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 right-0 bg-accent"
              style={{ scaleX: scrollYProgress, transformOrigin: "left" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
