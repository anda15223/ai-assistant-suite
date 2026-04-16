import { motion } from "framer-motion";
import { Rocket, Mail, MessageSquare, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Phase {
  icon: LucideIcon;
  phase: string;
  title: string;
  weeks: string;
  tasks: string[];
  color: "indigo" | "blue";
}

const phases: Phase[] = [
  {
    icon: Rocket,
    phase: "Phase 1",
    title: "Foundation",
    weeks: "Weeks 1-2",
    tasks: [
      "Set up WhatsApp Business API and Email API access",
      "Deploy PostgreSQL database and backend API",
      "Configure security layer and authentication",
      "Establish monitoring and health checks",
    ],
    color: "indigo",
  },
  {
    icon: Mail,
    phase: "Phase 2",
    title: "Inbox Intelligence",
    weeks: "Weeks 3-5",
    tasks: [
      "Implement invoice extraction and classification",
      "Build task creation logic with priority scoring",
      "Develop the Draft & Approve web interface",
      "Set up email classification model with Claude",
    ],
    color: "blue",
  },
  {
    icon: MessageSquare,
    phase: "Phase 3",
    title: "Workforce Concierge",
    weeks: "Weeks 6-8",
    tasks: [
      "Develop WhatsApp webhook handler",
      "Build knowledge base for employee queries",
      "Integrate with project management for task escalation",
      "Implement manager notification system",
    ],
    color: "indigo",
  },
  {
    icon: Calendar,
    phase: "Phase 4",
    title: "Festival Architect",
    weeks: "Weeks 9-12",
    tasks: [
      "Build complex planning logic with AI",
      "Integrate Google Calendar and Maps APIs",
      "Implement real-time monitoring triggers",
      "Test end-to-end festival planning workflow",
    ],
    color: "blue",
  },
];

export default function RoadmapSection() {
  return (
    <section id="roadmap" className="py-24 relative bg-white">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <span className="text-[11px] uppercase tracking-widest text-[#6366f1] font-medium mb-3 block">
            Implementation Plan
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl text-[#111827] mb-4">
            Deployment Roadmap
          </h2>
          <p className="text-[#6b7280] max-w-2xl leading-relaxed">
            A phased 12-week implementation plan that builds the foundation
            first, then deploys each station incrementally for controlled
            rollout and testing.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#6366f1]/40 via-[#818cf8]/30 to-transparent hidden md:block" />

          <div className="space-y-8">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative md:pl-16"
              >
                {/* Timeline dot */}
                <div
                  className={`hidden md:flex absolute left-0 top-6 w-12 h-12 rounded-lg border items-center justify-center ${
                    phase.color === "indigo"
                      ? "bg-[#eef2ff] border-[#e0e7ff]"
                      : "bg-[#eff6ff] border-[#dbeafe]"
                  }`}
                >
                  <phase.icon
                    className={`w-5 h-5 ${
                      phase.color === "indigo" ? "text-[#6366f1]" : "text-[#3b82f6]"
                    }`}
                  />
                </div>

                {/* Card */}
                <div className="rounded-xl border border-[#e5e7eb] bg-white p-6 hover:border-[#6366f1]/20 hover:shadow-sm transition-all">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={`text-[11px] uppercase tracking-widest font-bold ${
                        phase.color === "indigo" ? "text-[#6366f1]" : "text-[#3b82f6]"
                      }`}
                    >
                      {phase.phase}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-[#9ca3af]" />
                    <span className="font-semibold text-[#111827]">
                      {phase.title}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-[#9ca3af] px-2.5 py-1 rounded-full bg-[#f8f9fc] border border-[#e5e7eb]">
                      {phase.weeks}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {phase.tasks.map((task, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span
                          className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                            phase.color === "indigo" ? "bg-[#6366f1]/50" : "bg-[#3b82f6]/50"
                          }`}
                        />
                        <span className="text-sm text-[#6b7280]">
                          {task}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
