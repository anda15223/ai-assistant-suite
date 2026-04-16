import { motion } from "framer-motion";
import { Database, Cpu, Workflow, Server, Lock, BarChart3 } from "lucide-react";

const infraItems = [
  {
    icon: Cpu,
    title: "LLM Provider",
    description:
      "Claude Sonnet via Anthropic API powers all three stations with consistent, high-quality AI reasoning.",
  },
  {
    icon: Database,
    title: "PostgreSQL Database",
    description:
      "Stores conversation history, user preferences, task statuses, and extracted invoice data.",
  },
  {
    icon: Workflow,
    title: "tRPC + React Query",
    description:
      "Type-safe API layer with real-time mutations and optimistic updates across all stations.",
  },
  {
    icon: Server,
    title: "Node.js Backend",
    description:
      "Express + Hono backend handling webhooks, API routing, and business logic.",
  },
  {
    icon: Lock,
    title: "Security Layer",
    description:
      "JWT auth, GDPR compliance, and strict access controls for all data flows.",
  },
  {
    icon: BarChart3,
    title: "Monitoring Stack",
    description:
      "Built-in accounting dashboards and health checks for real-time system visibility.",
  },
];

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 relative bg-[#f8f9fc]">
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
            System Architecture
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl text-[#111827] mb-4">
            Unified Infrastructure
          </h2>
          <p className="text-[#6b7280] max-w-2xl leading-relaxed">
            All three stations reside on a shared backend to minimize costs and
            complexity. A single LLM provider, database, and API layer
            serve the entire ecosystem.
          </p>
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
              className="group p-5 rounded-xl bg-white border border-[#e5e7eb] hover:border-[#6366f1]/30 hover:shadow-md transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg bg-[#eef2ff] border border-[#e0e7ff] flex items-center justify-center mb-4 group-hover:bg-[#e0e7ff] transition-colors">
                <item.icon className="w-4.5 h-4.5 text-[#6366f1]" />
              </div>
              <h3 className="font-semibold text-sm text-[#111827] mb-1.5">
                {item.title}
              </h3>
              <p className="text-[11px] text-[#6b7280] leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
