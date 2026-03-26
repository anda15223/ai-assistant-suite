/*
 * DESIGN: Command Center — Unified Architecture
 * Shows the shared infrastructure diagram and tech stack.
 */
import { motion } from "framer-motion";
import { Database, Cpu, Workflow, Server, Lock, BarChart3 } from "lucide-react";

const ARCH_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480602866/KuriegSE9E2r7xqu9W7qQS/architecture-diagram-QDPPCwVLtezmqVHxkhe7oj.webp";

const infraItems = [
  {
    icon: Cpu,
    title: "LLM Provider",
    description:
      "A single OpenAI GPT-4o API key powers all three stations, reducing cost and complexity.",
  },
  {
    icon: Database,
    title: "PostgreSQL Database",
    description:
      "Stores conversation history, user preferences, task statuses, and extracted invoice data.",
  },
  {
    icon: Workflow,
    title: "n8n Automation",
    description:
      "Self-hosted workflow engine orchestrating multi-step processes across all stations.",
  },
  {
    icon: Server,
    title: "FastAPI Backend",
    description:
      "High-performance Python backend handling webhooks, API routing, and business logic.",
  },
  {
    icon: Lock,
    title: "Security Layer",
    description:
      "End-to-end encryption, GDPR compliance, and strict access controls for all data flows.",
  },
  {
    icon: BarChart3,
    title: "Monitoring Stack",
    description:
      "Prometheus + Grafana for real-time performance monitoring and alerting across all services.",
  },
];

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 relative">
      {/* Subtle top border */}
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
          <span className="font-mono text-[11px] uppercase tracking-widest text-teal mb-3 block">
            System Architecture
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
            Unified Infrastructure
          </h2>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            All three stations reside on a shared backend to minimize costs and
            complexity. A single LLM provider, database, and automation platform
            serve the entire ecosystem.
          </p>
        </motion.div>

        {/* Architecture diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative rounded-lg overflow-hidden border border-border mb-14 glow-teal"
        >
          <img
            src={ARCH_IMG}
            alt="System Architecture Diagram"
            className="w-full h-auto"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/40 to-transparent" />
        </motion.div>

        {/* Infrastructure grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {infraItems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="group p-5 rounded-lg bg-card border border-border hover:border-teal/30 transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center mb-4 group-hover:bg-teal/20 transition-colors">
                <item.icon className="w-4.5 h-4.5 text-teal" />
              </div>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-1.5">
                {item.title}
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
