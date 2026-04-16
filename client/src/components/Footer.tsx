import { LayoutDashboard } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative border-t border-[#e5e7eb] bg-white">
      <div className="container py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#eef2ff] border border-[#e5e7eb] flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-[#6366f1]" />
            </div>
            <div>
              <span className="font-semibold text-sm text-[#111827] tracking-wide">
                AI Suite
              </span>
              <span className="block text-[10px] text-[#9ca3af] tracking-wider uppercase">
                Festival Management Platform
              </span>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-[#9ca3af]">
                Festival Architect
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-[#9ca3af]">
                Inbox Intelligence
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-[#9ca3af]">
                Workforce Concierge
              </span>
            </div>
          </div>
        </div>

        {/* Bottom line */}
        <div className="mt-8 pt-6 border-t border-[#e5e7eb] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-[10px] text-[#9ca3af] tracking-wider">
            &copy; {new Date().getFullYear()} AI Suite
          </span>
          <span className="text-[10px] text-[#9ca3af] tracking-wider">
            Built for festival operations
          </span>
        </div>
      </div>
    </footer>
  );
}
