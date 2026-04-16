import { motion } from "framer-motion";
import { ShieldAlert, Eye, TrendingUp, AlertTriangle } from "lucide-react";

const challenges = [
  {
    icon: ShieldAlert,
    title: "Security & Privacy",
    description:
      "All assistants handle sensitive data — emails, financial records, and employee messages. End-to-end encryption, GDPR/CCPA compliance, and strict role-based access controls are mandatory across every data flow.",
    severity: "critical" as const,
  },
  {
    icon: AlertTriangle,
    title: "AI Reliability",
    description:
      "LLM hallucinations pose a risk for financial data and external communications. The Human-in-the-Loop requirement for emails and invoice processing is the primary safeguard. All AI outputs are flagged with confidence scores.",
    severity: "high" as const,
  },
  {
    icon: TrendingUp,
    title: "Scalability",
    description:
      "As the number of employees, festivals, and daily emails grows, the system must handle increased API throughput and database load. Caching, queuing, and horizontal scaling strategies are built into the architecture.",
    severity: "medium" as const,
  },
  {
    icon: Eye,
    title: "User Adoption",
    description:
      "Building trust in AI-managed workflows requires transparency, clear audit trails, and intuitive approval interfaces. Gradual rollout with training sessions ensures smooth adoption across all teams.",
    severity: "medium" as const,
  },
];

const severityStyles = {
  critical: {
    border: "border-red-200 hover:border-red-300",
    bg: "bg-red-50",
    iconBg: "bg-red-100 border-red-200",
    iconColor: "text-red-500",
    badge: "bg-red-100 text-red-600 border-red-200",
  },
  high: {
    border: "border-amber-200 hover:border-amber-300",
    bg: "bg-amber-50",
    iconBg: "bg-amber-100 border-amber-200",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-600 border-amber-200",
  },
  medium: {
    border: "border-blue-200 hover:border-blue-300",
    bg: "bg-blue-50",
    iconBg: "bg-blue-100 border-blue-200",
    iconColor: "text-blue-500",
    badge: "bg-blue-100 text-blue-600 border-blue-200",
  },
};

export default function ChallengesSection() {
  return (
    <section className="py-24 relative bg-[#f8f9fc]">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14"
        >
          <span className="text-[11px] uppercase tracking-widest text-red-500 font-medium mb-3 block">
            Risk Assessment
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl text-[#111827] mb-4">
            Key Challenges
          </h2>
          <p className="text-[#6b7280] max-w-2xl leading-relaxed">
            Critical considerations that must be addressed during implementation
            to ensure a reliable, secure, and trusted AI assistant ecosystem.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {challenges.map((c, i) => {
            const styles = severityStyles[c.severity];
            return (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`rounded-xl border ${styles.border} ${styles.bg} p-6 transition-all duration-300`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center ${styles.iconBg}`}
                  >
                    <c.icon className={`w-5 h-5 ${styles.iconColor}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[#111827]">
                        {c.title}
                      </h3>
                      <span
                        className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles.badge}`}
                      >
                        {c.severity}
                      </span>
                    </div>
                    <p className="text-sm text-[#6b7280] leading-relaxed">
                      {c.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
