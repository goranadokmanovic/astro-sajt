import Header from "@/components/Header";
import ScrollJourneyHero from "@/components/ScrollJourneyHero";
import PortfolioCTA from "@/components/PortfolioCTA";
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
        <PortfolioCTA />
        <Intro />
        <Services />
        <About />
        <Booking />
      </main>
      <Footer />
    </>
  );
}
