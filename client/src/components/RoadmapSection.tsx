/*
 * DESIGN: Command Center — Implementation Roadmap
 * Timeline-style roadmap with phase cards.
 */
import { motion } from "framer-motion";
import { Rocket, Mail, MessageSquare, Calendar } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Phase {
  icon: LucideIcon;
  phase: string;
  title: string;
  weeks: string;
  tasks: string[];
  color: "amber" | "teal";
}

const phases: Phase[] = [
  {
    icon: Rocket,
    phase: "Phase 1",
    title: "Foundation",
    weeks: "Weeks 1–2",
    tasks: [
      "Set up WhatsApp Business API and Email API access",
      "Deploy central n8n instance and PostgreSQL database",
      "Configure security layer and authentication",
      "Establish monitoring with Prometheus + Grafana",
    ],
    color: "amber",
  },
  {
    icon: Mail,
    phase: "Phase 2",
    title: "Inbox Intelligence",
    weeks: "Weeks 3–5",
    tasks: [
      "Implement invoice extraction and OCR pipeline",
      "Build task creation logic with Asana/Jira integration",
      "Develop the Draft & Approve web interface",
      "Set up email classification model",
    ],
    color: "teal",
  },
  {
    icon: MessageSquare,
    phase: "Phase 3",
    title: "Workforce Concierge",
    weeks: "Weeks 6–8",
    tasks: [
      "Develop WhatsApp webhook handler with FastAPI",
      "Build knowledge base for employee queries",
      "Integrate with project management for task escalation",
      "Implement manager notification system",
    ],
    color: "amber",
  },
  {
    icon: Calendar,
    phase: "Phase 4",
    title: "Festival Architect",
    weeks: "Weeks 9–12",
    tasks: [
      "Build complex planning logic with LangChain",
      "Integrate Google Calendar and Maps APIs",
      "Implement real-time weather monitoring triggers",
      "Test end-to-end festival planning workflow",
    ],
    color: "teal",
  },
];

export default function RoadmapSection() {
  return (
    <section id="roadmap" className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <span className="font-mono text-[11px] uppercase tracking-widest text-amber mb-3 block">
            Implementation Plan
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
            Deployment Roadmap
          </h2>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            A phased 12-week implementation plan that builds the foundation
            first, then deploys each station incrementally for controlled
            rollout and testing.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-amber/40 via-teal/40 to-transparent hidden md:block" />

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
                    phase.color === "amber"
                      ? "bg-amber/10 border-amber/20"
                      : "bg-teal/10 border-teal/20"
                  }`}
                >
                  <phase.icon
                    className={`w-5 h-5 ${
                      phase.color === "amber" ? "text-amber" : "text-teal"
                    }`}
                  />
                </div>

                {/* Card */}
                <div className="rounded-lg border border-border bg-card p-6 hover:border-amber/20 transition-colors">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span
                      className={`font-mono text-[11px] uppercase tracking-widest font-bold ${
                        phase.color === "amber" ? "text-amber" : "text-teal"
                      }`}
                    >
                      {phase.phase}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                    <span className="font-heading font-semibold text-foreground">
                      {phase.title}
                    </span>
                    <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted-foreground px-2.5 py-1 rounded-full bg-navy-surface border border-border">
                      {phase.weeks}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {phase.tasks.map((task, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <span
                          className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                            phase.color === "amber" ? "bg-amber/50" : "bg-teal/50"
                          }`}
                        />
                        <span className="text-sm text-muted-foreground">
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
