"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const LOGO_SRC = "/images/Logo Astro Zvezda transparent.png";

const NAV_LINKS = [
  { href: "#hero", label: "Putovanje" },
  { href: "#o-radu", label: "Pristup" },
  { href: "#usluge", label: "Usluge" },
  { href: "#o-meni", label: "O meni" },
];

export default function Header() {
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => setPastHero(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px 0px 0px" }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        pastHero
          ? "overflow-hidden border-b border-brand/15 bg-[#0a0612]/78 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(10,6,18,0.55)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className={`w-full pl-16 pr-6 flex items-center justify-between transition-all duration-500 ${
          pastHero ? "py-2" : "min-h-16 py-3"
        }`}
      >
        <div
          className={`flex items-center gap-3 md:gap-4 transition-transform duration-500 ${
            pastHero ? "" : "-translate-y-8"
          }`}
        >
          <div
            className={`shrink-0 overflow-hidden transition-all duration-500 ${
              pastHero ? "h-[82px] w-[82px] md:h-[90px] md:w-[90px]" : ""
            }`}
          >
            <Image
              src={LOGO_SRC}
              alt="Logo Astro Zvezda"
              width={243}
              height={243}
              className={`object-contain object-top transition-all duration-500 ${
                pastHero
                  ? "h-[96px] w-[96px] md:h-[104px] md:w-[104px]"
                  : "h-[190px] w-[190px] md:h-[243px] md:w-[243px]"
              }`}
              priority
            />
          </div>
          <div
            className={`transition-transform duration-500 ${
              pastHero ? "" : "-translate-y-5 md:-translate-y-7"
            }`}
          >
            <p
              className={`font-serif italic text-accent leading-tight transition-all duration-500 ${
                pastHero
                  ? "text-[30px] md:text-[34px]"
                  : "text-[42px] md:text-[54px]"
              }`}
            >
              Zvezdana Jovanović
            </p>
            <p className="font-mono text-[14px] tracking-[0.28em] text-text-subtle mt-0.5">
              astrolog i numerolog
            </p>
          </div>
        </div>

        <nav
          className={`hidden md:flex items-center gap-6 transition-transform duration-500 ${
            pastHero ? "" : "-translate-y-16"
          }`}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[16px] tracking-[0.2em] text-text-muted uppercase hover:text-text transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#zakazivanje"
            className="font-mono text-[16px] tracking-[0.18em] text-background bg-accent uppercase px-4 py-2 rounded-full hover:bg-accent/90 transition-colors duration-200"
          >
            Zakazivanje
          </a>
        </nav>
      </div>
    </header>
  );
}
