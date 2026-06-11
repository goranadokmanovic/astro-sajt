"use client";

import dynamic from "next/dynamic";

const SolarSystem = dynamic(() => import("./SolarSystem"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-background" aria-hidden="true" />
  ),
});

export default function SolarSystemLoader() {
  return (
    <div className="absolute inset-0 h-full w-full">
      <SolarSystem />
    </div>
  );
}
