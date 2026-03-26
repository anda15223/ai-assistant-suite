/*
 * DESIGN: Command Center — Footer
 * Minimal footer with status indicators.
 */
import { Cpu } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber/20 to-transparent" />

      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-amber" />
            </div>
            <div>
              <span className="font-heading font-bold text-sm text-foreground tracking-wide">
                AI ASSISTANT SUITE
              </span>
              <span className="block font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
                Blueprint v1.0
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-blink" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Festival Architect
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-blink-slow" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Inbox Intelligence
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-blink" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Workforce Concierge
              </span>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
            &copy; {new Date().getFullYear()} AI Assistant Suite Blueprint
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
            Designed for mission-critical operations
          </span>
        </div>
      </div>
    </footer>
  );
}
