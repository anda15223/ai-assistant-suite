/*
 * DESIGN: Command Center — Aerospace Mission Control
 * Persistent top navigation with status indicator strip.
 * Font: Outfit for brand, JetBrains Mono for status labels.
 * Colors: Navy bg, amber accents, teal data highlights.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, Cpu } from "lucide-react";

const navLinks = [
  { label: "Mission Brief", href: "#hero" },
  { label: "Stations", href: "#stations" },
  { label: "Architecture", href: "#architecture" },
  { label: "Roadmap", href: "#roadmap" },
];

export default function Navbar() {
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
          ? "bg-navy/90 backdrop-blur-xl border-b border-amber/10"
          : "bg-transparent"
      }`}
    >
      {/* Status strip */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber/40 to-transparent" />

      <nav className="container flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-center group-hover:bg-amber/20 transition-colors">
            <Cpu className="w-5 h-5 text-amber" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 status-blink" />
          </div>
          <div>
            <span className="font-heading font-bold text-foreground text-sm tracking-wide">
              AI SUITE
            </span>
            <span className="hidden sm:block font-mono text-[10px] text-muted-foreground tracking-widest uppercase">
              Command Center
            </span>
          </div>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-amber transition-colors relative group"
            >
              {link.label}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-amber group-hover:w-3/4 transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* Status indicator (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-navy-surface border border-border font-mono text-[10px] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 status-blink" />
            <span className="text-muted-foreground">All Systems Online</span>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-muted-foreground hover:text-amber transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-navy-surface/95 backdrop-blur-xl border-b border-border"
        >
          <div className="container py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-amber hover:bg-amber/5 rounded-md transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
