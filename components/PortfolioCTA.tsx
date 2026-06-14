"use client";

import { useEffect, useRef } from "react";

export default function PortfolioCTA() {
  const starsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = starsRef.current;
    if (!canvas) return;

    const draw = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const count = Math.round((w * h) / 3200);
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const r = 0.35 + Math.random() * 1.15;
        const a = 0.06 + Math.random() * 0.39;
        const roll = Math.random();
        let cr: number;
        let cg: number;
        let cb: number;
        if (roll < 0.05) {
          cr = Math.round(240 + Math.random() * 15);
          cg = Math.round(225 + Math.random() * 20);
          cb = Math.round(205 + Math.random() * 20);
        } else if (roll < 0.15) {
          cr = Math.round(205 + Math.random() * 25);
          cg = Math.round(215 + Math.random() * 25);
          cb = Math.round(240 + Math.random() * 15);
        } else {
          cr = Math.round(218 + Math.random() * 37);
          cg = Math.round(218 + Math.random() * 32);
          cb = Math.round(222 + Math.random() * 33);
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

  return (
    <section
      id="zakazivanje"
      className="relative min-h-screen flex items-center justify-center"
      style={{ background: "#0a0a14" }}
    >
      <canvas
        ref={starsRef}
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      />

      <div className="relative z-10 px-6 text-center">
        <h2 className="font-serif italic text-5xl md:text-6xl text-text leading-tight mb-6">
          Vaša karta. Vaša priča.
        </h2>
        <p className="font-mono text-[11px] md:text-xs tracking-[0.28em] text-text-muted uppercase mb-8">
          Zakazite konsultaciju
        </p>
        <a
          href="#"
          className="inline-block font-mono text-[11px] tracking-[0.2em] text-background bg-accent uppercase px-6 py-3 rounded-full hover:bg-accent/90 transition-colors duration-200"
        >
          ZAKAZIVANJE →
        </a>
      </div>
    </section>
  );
}
