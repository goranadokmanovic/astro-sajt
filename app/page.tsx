import SolarSystemLoader from "@/components/SolarSystemLoader";

export default function Home() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      <SolarSystemLoader />

      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-center px-8 sm:px-12 md:px-16 lg:px-24">
        <div className="max-w-xl">
          <p className="font-mono text-xs tracking-[0.25em] text-accent uppercase sm:text-sm">
            Astro · Natalne karte · Konsultacije
          </p>

          <h1 className="mt-6 font-serif text-4xl leading-tight italic sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="text-text">Zvezde znaju.</span>
            <br />
            <span className="text-text-muted">Pitajte ih.</span>
          </h1>

          <p className="mt-6 text-sm text-text-subtle sm:text-base">
            Uskoro — sajt je u izradi.
          </p>
        </div>
      </div>
    </div>
  );
}
