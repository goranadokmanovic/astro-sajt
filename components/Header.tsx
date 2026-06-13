"use client";

const NAV_LINKS = [
  { href: "#hero", label: "Putovanje" },
  { href: "#o-radu", label: "Pristup" },
  { href: "#usluge", label: "Usluge" },
  { href: "#o-meni", label: "O meni" },
];

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="w-full pl-16 pr-6 min-h-16 py-3 flex items-center justify-between">
        <div className="mt-[33px]">
          <p className="font-serif italic text-[42px] md:text-[54px] text-text leading-tight">
            Dragana Dokmanović
          </p>
          <p className="font-mono text-[14px] tracking-[0.28em] text-text-subtle mt-0.5">
            astrolog i energetski psiholog
          </p>
        </div>

        <nav className="hidden md:flex items-center gap-6">
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
