/*
 * DESIGN: Command Center — Mission Briefing Hero
 * Full-bleed hero with generated command center background.
 * Scanline overlay, large Outfit heading, amber CTA.
 */
import { motion } from "framer-motion";
import { ChevronDown, Zap, Shield, Brain } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480602866/KuriegSE9E2r7xqu9W7qQS/hero-command-center-AsK4ZoyFSSSh5CqjkPY8yn.webp";

const stats = [
  { icon: Brain, label: "AI Agents", value: "3" },
  { icon: Zap, label: "Automations", value: "12+" },
  { icon: Shield, label: "HITL Safeguards", value: "Active" },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={HERO_IMG}
          alt="AI Command Center"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none" />

      {/* Content */}
      <div className="container relative z-10 pt-28 pb-20">
        <div className="max-w-3xl">
          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber/10 border border-amber/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-amber status-blink" />
            <span className="font-mono text-[11px] uppercase tracking-widest text-amber">
              Blueprint v1.0 — Active
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-heading font-800 text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-foreground mb-6"
          >
            Multi-Agent{" "}
            <span className="text-amber">AI Assistant</span>{" "}
            Suite
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10"
          >
            Three specialized AI stations working in concert — planning your
            festivals, managing your inbox, and coordinating your workforce.
            All under your command.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-wrap gap-4"
          >
            <a
              href="#stations"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-amber text-navy font-heading font-semibold text-sm uppercase tracking-wider hover:bg-amber/90 transition-colors glow-amber"
            >
              Explore Stations
              <ChevronDown className="w-4 h-4" />
            </a>
            <a
              href="#architecture"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-border text-muted-foreground font-heading font-medium text-sm uppercase tracking-wider hover:border-teal hover:text-teal transition-colors"
            >
              View Architecture
            </a>
          </motion.div>
        </div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 px-4 py-3 rounded-md bg-navy-surface/60 border border-border backdrop-blur-sm"
            >
              <stat.icon className="w-5 h-5 text-teal shrink-0" />
              <div>
                <div className="font-heading font-bold text-lg text-foreground leading-none">
                  {stat.value}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Scroll to explore
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown className="w-4 h-4 text-amber/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
