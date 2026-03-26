import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StationsSection from "@/components/StationsSection";
import ArchitectureSection from "@/components/ArchitectureSection";
import RoadmapSection from "@/components/RoadmapSection";
import ChallengesSection from "@/components/ChallengesSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <HeroSection />
      <StationsSection />
      <ArchitectureSection />
      <RoadmapSection />
      <ChallengesSection />
      <Footer />
    </div>
  );
}
