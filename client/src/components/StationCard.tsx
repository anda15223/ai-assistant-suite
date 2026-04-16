import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  title: string;
  description: string;
}

interface Tool {
  name: string;
  category: string;
}

interface StationCardProps {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  image: string;
  status: "active" | "pending" | "standby";
  features: Feature[];
  tools: Tool[];
  workflow: string[];
  index: number;
}

const statusColors = {
  active: "bg-green-500",
  pending: "bg-[#6366f1]",
  standby: "bg-[#9ca3af]",
};

const statusLabels = {
  active: "Online",
  pending: "Pending",
  standby: "Standby",
};

export default function StationCard({
  title,
  subtitle,
  description,
  icon: Icon,
  image,
  status,
  features,
  tools,
  workflow,
  index,
}: StationCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay: index * 0.15, duration: 0.6 }}
      className="group relative"
    >
      <div
        className={`relative rounded-xl border border-[#e5e7eb] bg-white overflow-hidden transition-all duration-500 shadow-sm ${
          expanded ? "shadow-lg shadow-[#6366f1]/10 border-[#6366f1]/30" : "hover:border-[#6366f1]/30 hover:shadow-md"
        }`}
      >
        {/* Status bar at top */}
        <div
          className={`h-[3px] w-full transition-all duration-500 ${
            expanded
              ? "bg-gradient-to-r from-[#6366f1] via-[#818cf8] to-transparent"
              : "bg-gradient-to-r from-[#6366f1]/30 via-transparent to-transparent group-hover:from-[#6366f1]/60"
          }`}
        />

        {/* Card header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#eef2ff] border border-[#e0e7ff] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#6366f1]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[#111827] leading-tight">
                  {title}
                </h3>
                <span className="text-[10px] uppercase tracking-widest text-[#9ca3af]">
                  {subtitle}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#f8f9fc] border border-[#e5e7eb]">
              <span
                className={`w-2 h-2 rounded-full ${statusColors[status]} ${
                  status === "active" ? "animate-pulse" : ""
                }`}
              />
              <span className="text-[10px] uppercase tracking-widest text-[#9ca3af]">
                {statusLabels[status]}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
            {description}
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="px-3 py-2.5 rounded-lg bg-[#f8f9fc] border border-[#e5e7eb]"
              >
                <div className="font-semibold text-xs text-[#111827] mb-0.5">
                  {f.title}
                </div>
                <div className="text-[10px] text-[#9ca3af] leading-relaxed">
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expandable section */}
        <div className="px-6">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-[#e5e7eb] text-[11px] uppercase tracking-widest text-[#9ca3af] hover:text-[#6366f1] transition-colors"
          >
            {expanded ? "Collapse Details" : "View Full Details"}
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="px-6 pb-6 border-t border-[#e5e7eb]"
          >
            {/* Tech Stack */}
            <div className="mt-5 mb-5">
              <h4 className="font-semibold text-xs uppercase tracking-wider text-[#6366f1] mb-3">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-2">
                {tools.map((t) => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f8f9fc] border border-[#e5e7eb] text-[10px] text-[#6b7280]"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#6366f1]" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Workflow */}
            <div>
              <h4 className="font-semibold text-xs uppercase tracking-wider text-[#6366f1] mb-3">
                Workflow
              </h4>
              <div className="space-y-2">
                {workflow.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-[#eef2ff] border border-[#e0e7ff] flex items-center justify-center mt-0.5">
                      <span className="text-[10px] font-bold text-[#6366f1]">
                        {i + 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6b7280] leading-relaxed pt-1">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
