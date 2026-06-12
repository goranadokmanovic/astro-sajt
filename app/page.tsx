import Header from "@/components/Header";
import ScrollJourneyHero from "@/components/ScrollJourneyHero";
import EnergyZone from "@/components/EnergyZone";
import Intro from "@/components/sections/Intro";
import Services from "@/components/sections/Services";
import About from "@/components/sections/About";
import Booking from "@/components/sections/Booking";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <ScrollJourneyHero />
        <EnergyZone />
        <Intro />
        <Services />
        <About />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
