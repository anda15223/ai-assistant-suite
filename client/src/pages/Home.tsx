import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StationsSection from "@/components/StationsSection";
import ArchitectureSection from "@/components/ArchitectureSection";
import RoadmapSection from "@/components/RoadmapSection";
import ChallengesSection from "@/components/ChallengesSection";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { LogIn, LayoutDashboard } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar
        isAuthenticated={isAuthenticated}
        onDashboard={() => navigate("/dashboard")}
        loginUrl="/login"
      />
      <HeroSection
        isAuthenticated={isAuthenticated}
        onDashboard={() => navigate("/dashboard")}
        loginUrl="/login"
      />
      <StationsSection />
      <ArchitectureSection />
      <RoadmapSection />
      <ChallengesSection />
      <Footer />
    </div>
  );
}
