"use client";

import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; r: number; g: number; b: number;
  isRayDrift: boolean;
}

function spawnParticle(W: number, H: number): Particle {
  const isRayDrift = Math.random() < 0.28;
  // Ray-drift: top-right area, moves down-left
  // Ambient: anywhere, moves up
  const x = isRayDrift ? W * (0.4 + Math.random() * 0.6) : Math.random() * W;
  const y = isRayDrift ? Math.random() * H * 0.5 : Math.random() * H;
  const PALETTE = [
    [212, 168, 67],  // #d4a843 accent gold
    [192, 128, 48],  // #c08030 amber
    [232, 200, 122], // #e8c87a pale gold
    [255, 245, 208], // #fff5d0 near-white gold
  ];
  const [r, g, b] = PALETTE[Math.floor(Math.random() * PALETTE.length)];
  return {
    x, y,
    vx: isRayDrift ? -(0.18 + Math.random() * 0.22) : (Math.random() - 0.5) * 0.12,
    vy: isRayDrift ? (0.15 + Math.random() * 0.18) : -(0.18 + Math.random() * 0.22),
    life: Math.random() * 180,
    maxLife: 140 + Math.random() * 160,
    size: 0.8 + Math.random() * 1.8,
    r, g, b,
    isRayDrift,
  };
}

function drawRays(canvas: HTMLCanvasElement) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);

  // Origin: top-right corner. Direction vectors in screen space (dx<0=left, dy>0=down).
  const RAYS = [
    { dx: -0.97, dy: 0.24, opacity: 0.07, w: 5 },
    { dx: -0.92, dy: 0.39, opacity: 0.10, w: 12 },
    { dx: -0.85, dy: 0.53, opacity: 0.13, w: 20 },
    { dx: -0.75, dy: 0.66, opacity: 0.09, w: 12 },
    { dx: -0.62, dy: 0.78, opacity: 0.07, w: 7 },
    { dx: -0.45, dy: 0.89, opacity: 0.05, w: 4 },
  ];

  const len = Math.hypot(W, H) * 1.5;
  const ox = W, oy = 0;

  RAYS.forEach(({ dx, dy, opacity, w }) => {
    const ex = ox + dx * len;
    const ey = oy + dy * len;
    const grad = ctx.createLinearGradient(ox, oy, ex, ey);
    grad.addColorStop(0,    `rgba(255, 248, 200, ${opacity})`);
    grad.addColorStop(0.18, `rgba(255, 235, 160, ${opacity * 0.75})`);
    grad.addColorStop(0.5,  `rgba(255, 210, 110, ${opacity * 0.28})`);
    grad.addColorStop(1,    "rgba(255, 190, 60, 0)");
    ctx.lineWidth = w;
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  });
}

export default function EnergyZone() {
  const sectionRef     = useRef<HTMLElement>(null);
  const particleRef    = useRef<HTMLCanvasElement>(null);
  const raysRef        = useRef<HTMLCanvasElement>(null);
  const particlesStore = useRef<Particle[]>([]);

  // Scroll-driven entry reveal: background slides from opaque → transparent
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "start 22%"],
  });
  const entryOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Draw rays (static, redrawn on resize)
  useEffect(() => {
    const canvas = raysRef.current;
    if (!canvas) return;
    const draw = () => {
      canvas.width  = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      drawRays(canvas);
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
        ctx.fillStyle = `#${p.r.toString(16).padStart(2,"0")}${p.g.toString(16).padStart(2,"0")}${p.b.toString(16).padStart(2,"0")}${hex}`;
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
        ref={sectionRef}
        className="relative min-h-screen overflow-hidden"
        style={{ background: "#0a0612" }}
      >
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

        {/* Sun glow — top-right, partially out of frame */}
        <div
          aria-hidden
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: "52vw",
            height: "52vh",
            background:
              "radial-gradient(ellipse at 100% 0%, rgba(255,255,224,0.92) 0%, rgba(255,242,168,0.58) 9%, rgba(255,224,104,0.24) 24%, rgba(210,160,56,0.08) 48%, transparent 68%)",
          }}
        />
        {/* Sun pulse */}
        <motion.div
          aria-hidden
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: "38vw",
            height: "38vh",
            background:
              "radial-gradient(ellipse at 100% 0%, rgba(255,252,210,0.48) 0%, rgba(255,235,140,0.18) 16%, transparent 44%)",
          }}
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Rays — static canvas, slightly blurred for soft god-ray feel */}
        <canvas
          ref={raysRef}
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%", filter: "blur(3px)", opacity: 0.75 }}
        />

        {/* Central content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
          {/* Figure */}
          <motion.div
            animate={{ scale: [1, 1.022, 1] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            style={{ display: "inline-block" }}
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

        {/* Entry overlay — dark background fades out as you scroll in */}
        <motion.div
          aria-hidden
          className="absolute inset-0 pointer-events-none z-20 bg-background"
          style={{ opacity: entryOpacity }}
        />
      </section>

      {/* ── Placeholder section ─────────────────────────────────────────── */}
      <section
        className="min-h-[38vh] flex items-center justify-center"
        style={{
          background: "#080810",
          borderTop: "1px solid rgba(212,168,67,0.12)",
        }}
      >
        <p className="font-mono text-[9px] tracking-[0.36em] uppercase opacity-25 text-accent">
          Usluge · uskoro
        </p>
      </section>
    </>
  );
}
