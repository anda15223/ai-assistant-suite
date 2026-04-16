import { motion } from "framer-motion";
import { ChevronDown, Zap, Shield, Brain, LogIn, LayoutDashboard } from "lucide-react";

const stats = [
  { icon: Brain, label: "AI Agents", value: "3" },
  { icon: Zap, label: "Automations", value: "12+" },
  { icon: Shield, label: "HITL Safeguards", value: "Active" },
];

interface HeroSectionProps {
  isAuthenticated?: boolean;
  onDashboard?: () => void;
  loginUrl?: string;
}

export default function HeroSection({ isAuthenticated, onDashboard, loginUrl }: HeroSectionProps) {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-b from-[#eef2ff] via-[#f8f9fc] to-white"
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-[#6366f1]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-[#818cf8]/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 pt-28 pb-20">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eef2ff] border border-[#e0e7ff] mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-pulse" />
            <span className="text-[11px] uppercase tracking-widest text-[#6366f1] font-medium">
              v2.0 — Live
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="font-semibold text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight text-[#111827] mb-6"
          >
            Multi-Agent{" "}
            <span className="text-[#6366f1]">AI Assistant</span>{" "}
            Suite
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-lg sm:text-xl text-[#6b7280] max-w-xl leading-relaxed mb-10"
          >
            Three specialized AI stations working in concert — planning your
            festivals, managing your inbox, and coordinating your workforce.
            All under your command.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-wrap gap-4"
          >
            {isAuthenticated ? (
              <button
                onClick={onDashboard}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#6366f1] text-white font-semibold text-sm hover:bg-[#4f46e5] transition-colors shadow-lg shadow-[#6366f1]/25"
              >
                <LayoutDashboard className="w-4 h-4" />
                Open Dashboard
              </button>
            ) : (
              <a
                href={loginUrl}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#6366f1] text-white font-semibold text-sm hover:bg-[#4f46e5] transition-colors shadow-lg shadow-[#6366f1]/25"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Start
              </a>
            )}
            <a
              href="#stations"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#e5e7eb] text-[#6b7280] font-medium text-sm hover:border-[#6366f1] hover:text-[#6366f1] transition-colors bg-white"
            >
              Explore Stations
              <ChevronDown className="w-4 h-4" />
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-lg"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-white border border-[#e5e7eb] shadow-sm"
            >
              <stat.icon className="w-5 h-5 text-[#6366f1] shrink-0" />
              <div>
                <div className="font-bold text-lg text-[#111827] leading-none">
                  {stat.value}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-[#9ca3af] mt-0.5">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-widest text-[#9ca3af]">
          Scroll to explore
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown className="w-4 h-4 text-[#6366f1]/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}
