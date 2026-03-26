/*
 * DESIGN: Command Center — Station Card
 * Self-contained "station" card with header bar, status lights,
 * and expandable detail panels. Amber glow on hover.
 */
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
  active: "bg-green-400",
  pending: "bg-amber",
  standby: "bg-muted-foreground",
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
        className={`relative rounded-lg border border-border bg-card overflow-hidden transition-all duration-500 ${
          expanded ? "glow-amber" : "hover:border-amber/30"
        }`}
      >
        {/* Status bar at top */}
        <div
          className={`h-[3px] w-full transition-all duration-500 ${
            expanded
              ? "bg-gradient-to-r from-amber via-amber to-transparent"
              : "bg-gradient-to-r from-amber/30 via-transparent to-transparent group-hover:from-amber/60"
          }`}
        />

        {/* Card header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-amber" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg text-foreground leading-tight">
                  {title}
                </h3>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {subtitle}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-navy-surface border border-border">
              <span
                className={`w-2 h-2 rounded-full ${statusColors[status]} ${
                  status === "active" ? "status-blink" : ""
                }`}
              />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {statusLabels[status]}
              </span>
            </div>
          </div>

          {/* Image */}
          <div className="relative rounded-md overflow-hidden mb-5 border border-border/50">
            <img
              src={image}
              alt={title}
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {description}
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="px-3 py-2.5 rounded-md bg-navy-surface border border-border"
              >
                <div className="font-heading font-semibold text-xs text-foreground mb-0.5">
                  {f.title}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground leading-relaxed">
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
            className="w-full flex items-center justify-center gap-2 py-3 border-t border-border font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-amber transition-colors"
          >
            {expanded ? "Collapse Readout" : "Expand Full Readout"}
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
            className="px-6 pb-6 border-t border-border"
          >
            {/* Tech Stack */}
            <div className="mt-5 mb-5">
              <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-amber mb-3">
                Tech Stack
              </h4>
              <div className="flex flex-wrap gap-2">
                {tools.map((t) => (
                  <span
                    key={t.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-navy-surface border border-border font-mono text-[10px] text-muted-foreground"
                  >
                    <span className="w-1 h-1 rounded-full bg-teal" />
                    {t.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Workflow */}
            <div>
              <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-amber mb-3">
                Workflow
              </h4>
              <div className="space-y-2">
                {workflow.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-amber/10 border border-amber/20 flex items-center justify-center mt-0.5">
                      <span className="font-mono text-[10px] font-bold text-amber">
                        {i + 1}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground leading-relaxed pt-1">
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
