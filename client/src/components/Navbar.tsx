import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, LayoutDashboard, LogIn } from "lucide-react";

const navLinks = [
  { label: "Overview", href: "#hero" },
  { label: "Stations", href: "#stations" },
  { label: "Architecture", href: "#architecture" },
  { label: "Roadmap", href: "#roadmap" },
];

interface NavbarProps {
  isAuthenticated?: boolean;
  onDashboard?: () => void;
  loginUrl?: string;
}

export default function Navbar({ isAuthenticated, onDashboard, loginUrl }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-[#e5e7eb] shadow-sm"
          : "bg-transparent"
      }`}
    >
      <nav className="container flex items-center justify-between h-16">
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-lg bg-[#eef2ff] border border-[#e5e7eb] flex items-center justify-center group-hover:bg-[#e0e7ff] transition-colors">
            <LayoutDashboard className="w-5 h-5 text-[#6366f1]" />
          </div>
          <div>
            <span className="font-semibold text-[#111827] text-sm tracking-wide">
              AI Suite
            </span>
            <span className="hidden sm:block text-[10px] text-[#9ca3af] tracking-wider uppercase">
              Festival Management
            </span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm text-[#6b7280] hover:text-[#6366f1] transition-colors relative group"
            >
              {link.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#6366f1] group-hover:w-3/4 transition-all duration-300" />
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={onDashboard}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366f1] text-white font-medium text-sm hover:bg-[#4f46e5] transition-colors shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
          ) : (
            <a
              href={loginUrl}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#6366f1] text-white font-medium text-sm hover:bg-[#4f46e5] transition-colors shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </a>
          )}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-[#6b7280] hover:text-[#6366f1] transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white/95 backdrop-blur-xl border-b border-[#e5e7eb]"
        >
          <div className="container py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm text-[#6b7280] hover:text-[#6366f1] hover:bg-[#eef2ff] rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            {isAuthenticated ? (
              <button
                onClick={() => { setMobileOpen(false); onDashboard?.(); }}
                className="px-4 py-3 text-sm text-[#6366f1] hover:bg-[#eef2ff] rounded-lg transition-colors text-left font-medium"
              >
                Dashboard
              </button>
            ) : (
              <a
                href={loginUrl}
                className="px-4 py-3 text-sm text-[#6366f1] hover:bg-[#eef2ff] rounded-lg transition-colors font-medium"
              >
                Sign In
              </a>
            )}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
