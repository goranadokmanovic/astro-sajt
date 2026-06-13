"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; r: number; g: number; b: number;
}

function spawnParticle(W: number, H: number): Particle {
  const x = Math.random() * W;
  const y = Math.random() * H;
  const PALETTE = [
    [212, 168, 67],
    [192, 128, 48],
    [232, 200, 122],
    [255, 245, 208],
  ];
  const [r, g, b] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x, y,
    vx: (Math.random() - 0.5) * 0.12,
    vy: -(0.18 + Math.random() * 0.22),
    life: Math.random() * 180,
    maxLife: 140 + Math.random() * 160,
    size: 0.8 + Math.random() * 1.8,
    r, g, b,
  };
}

export default function EnergyZone() {
  const starsRef       = useRef<HTMLCanvasElement>(null);
  const particleRef    = useRef<HTMLCanvasElement>(null);
  const particlesStore = useRef<Particle[]>([]);

  // Star field — same density/color profile as the 3D CosmicBackdrop for sky continuity
  useEffect(() => {
    const canvas = starsRef.current;
    if (!canvas) return;
    const draw = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      // ~400 stars: mostly white-blue with slight saturation variance (matches Stars factor=3-4)
      const count = Math.round((W * H) / 3200);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        const r = 0.35 + Math.random() * 1.15;
        const a = 0.06 + Math.random() * 0.39; // capped ~0.45 to match 3D mat.opacity=0.45
        // slight hue variation: 85% cool-white, 10% blue-tinted, 5% warm-tinted
        const roll = Math.random();
        let cr: number, cg: number, cb: number;
        if (roll < 0.05) {
          cr = Math.round(240 + Math.random() * 15); cg = Math.round(225 + Math.random() * 20); cb = Math.round(205 + Math.random() * 20);
        } else if (roll < 0.15) {
          cr = Math.round(205 + Math.random() * 25); cg = Math.round(215 + Math.random() * 25); cb = Math.round(240 + Math.random() * 15);
        } else {
          cr = Math.round(218 + Math.random() * 37); cg = Math.round(218 + Math.random() * 32); cb = Math.round(222 + Math.random() * 33);
        }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(2)})`;
        ctx.fill();
      }
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Particle loop
  useEffect(() => {
    const canvas = particleRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId = 0;

    const resize = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();

    const N = 65;
    if (particlesStore.current.length === 0) {
      for (let i = 0; i < N; i++)
        particlesStore.current.push(spawnParticle(canvas.width, canvas.height));
    }

    const tick = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const ps = particlesStore.current;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (
          p.life >= p.maxLife ||
          p.x < -4 || p.x > W + 4 ||
          p.y < -4 || p.y > H + 4
        ) {
          ps[i] = spawnParticle(W, H);
          ps[i].life = 0;
          continue;
        }
        const t = p.life / p.maxLife;
        const a = (t < 0.12 ? t / 0.12 : t > 0.78 ? (1 - t) / 0.22 : 1) * 0.55;
        const hex = Math.floor(a * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `#${p.r.toString(16).padStart(2,"00")}${p.g.toString(16).padStart(2,"00")}${p.b.toString(16).padStart(2,"00")}${hex}`;
        ctx.fill();
      }
      animId = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {/* ── Hero viewport ───────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen"
        style={{ background: "#0a0a14" }}
      >
        {/* Star field */}
        <canvas
          ref={starsRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Amber mist — soft radial around figure */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 65% 55% at 50% 58%, rgba(192,108,32,0.08) 0%, rgba(160,88,20,0.04) 45%, transparent 72%)",
          }}
        />

        {/* Particles */}
        <canvas
          ref={particleRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Sun glow — full-section, no hard rectangular edge */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 62% 58% at 100% 0%, rgba(238,218,168,0.50) 0%, rgba(220,190,115,0.28) 12%, rgba(200,158,72,0.10) 30%, transparent 52%)",
          }}
        />
        {/* Sun pulse — full-section, no hard edge */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 44% 40% at 100% 0%, rgba(232,208,148,0.30) 0%, rgba(210,180,100,0.09) 22%, transparent 44%)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Central content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          {/* Figure with breathing animation — mask dissolves PNG edges before vignette takes over */}
          <motion.div
            animate={{ scale: [1, 1.022, 1] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              display: "inline-block",
              maskImage: "radial-gradient(ellipse 70% 70% at center, black 40%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 70% at center, black 40%, transparent 75%)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/energy-figure.png"
              alt=""
              style={{
                maxHeight: "55vh",
                maxWidth: "88vw",
                display: "block",
                objectFit: "contain",
              }}
            />
          </motion.div>

          {/* Text */}
          <div className="mt-8 md:mt-10">
            <h2 className="font-serif italic text-5xl md:text-6xl text-text leading-tight mb-4">
              Energija.
            </h2>
            <p className="font-mono text-[11px] md:text-xs tracking-[0.28em] text-text-muted uppercase">
              Nebo je mapa. Energija je put.
            </p>
          </div>
        </div>

        {/* Section-wide vignette — dissolves figure edges AND section top/bottom into #0a0a14 */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 15,
            background: `
              radial-gradient(ellipse 55% 60% at 50% 44%,
                transparent 28%,
                rgba(10,10,20,0.38) 52%,
                rgba(10,10,20,0.78) 68%,
                #0a0a14 84%)
            `,
          }}
        />
      </section>

      {/* ── Placeholder section ─────────────────────────────────────────── */}
      <section
        className="min-h-[38vh] flex items-center justify-center"
        style={{ background: "#0a0a14" }}
      >
        <p className="font-mono text-[9px] tracking-[0.36em] uppercase opacity-25 text-accent">
          Usluge · uskoro
        </p>
      </section>
    </>
  );
}
