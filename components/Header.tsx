"use client";

import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "#hero", label: "Putovanje" },
  { href: "#o-radu", label: "Pristup" },
  { href: "#usluge", label: "Usluge" },
  { href: "#o-meni", label: "O meni" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-surface/85 backdrop-blur-md border-b border-white/5"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <div>
          <p className="font-serif italic text-lg text-text leading-none">
            Dragana Dokmanović
          </p>
          <p className="font-mono text-[9px] tracking-[0.28em] text-text-subtle uppercase mt-0.5">
            Natalne karte · Astrologija
          </p>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[11px] tracking-[0.2em] text-text-muted uppercase hover:text-text transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#zakazivanje"
            className="font-mono text-[11px] tracking-[0.18em] text-background bg-accent uppercase px-4 py-2 rounded-full hover:bg-accent/90 transition-colors duration-200"
          >
            Zakazivanje
          </a>
        </nav>
      </div>
    </header>
  );
}
