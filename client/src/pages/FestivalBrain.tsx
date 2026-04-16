import { useState, useRef, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  Send,
  ChevronDown,
  Zap,
  BookOpen,
  BarChart3,
  ArrowLeft,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Filter,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";

// ── Festival list (same slugs as Command Centre) ─────────────────────────

const FESTIVALS = [
  { slug: "jelling", name: "Jelling Musikfestival", dates: "18-25 May 2026", status: "active" as const },
  { slug: "heartland", name: "Heartland", dates: "15-22 Jun 2026", status: "upcoming" as const },
  { slug: "copenhell", name: "Copenhell", dates: "15-22 Jun 2026", status: "upcoming" as const },
  { slug: "tinderbox", name: "Tinderbox", dates: "22-28 Jun 2026", status: "upcoming" as const },
  { slug: "cirkus-summarum", name: "Cirkus Summarum", dates: "22-28 Jun 2026", status: "upcoming" as const },
  { slug: "vig-festival", name: "Vig Festival", dates: "6-12 Jul 2026", status: "upcoming" as const },
  { slug: "gron-koncert", name: "Gron Koncert", dates: "16-20 Jul 2026", status: "upcoming" as const },
  { slug: "syd-for-solen", name: "Syd For Solen", dates: "10-16 Aug 2026", status: "upcoming" as const },
  { slug: "suset", name: "Suset", dates: "17-25 Aug 2026", status: "upcoming" as const },
  { slug: "tonder", name: "Tonder Festival", dates: "24-30 Aug 2026", status: "upcoming" as const },
  { slug: "fyr-festen", name: "Fyr Festen", dates: "29 Aug-1 Sep 2026", status: "upcoming" as const },
  { slug: "aarhus-festuge", name: "Aarhus Festuge", dates: "29 Aug-7 Sep 2026", status: "upcoming" as const },
] as const;

type Tab = "chat" | "lessons" | "stats";

// ── Category colors ──────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  order: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  staff: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  logistics: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  timing: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  finance: "bg-green-500/20 text-green-300 border-green-500/30",
  ops: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  safety: "bg-red-500/20 text-red-300 border-red-500/30",
  quality: "bg-pink-500/20 text-pink-300 border-pink-500/30",
};

function confidenceBadge(confidence: number) {
  if (confidence >= 80) return "bg-green-500/20 text-green-300";
  if (confidence >= 70) return "bg-yellow-500/20 text-yellow-300";
  if (confidence >= 60) return "bg-orange-500/20 text-orange-300";
  return "bg-red-500/20 text-red-300";
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function FestivalBrain() {
  const [, setLocation] = useLocation();
  const [selectedFestival, setSelectedFestival] = useState(FESTIVALS[0]);
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [festivalDropdownOpen, setFestivalDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/festival-command-centre")}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Brain className="w-5 h-5 text-amber-500" />
            <h1 className="text-lg font-semibold tracking-tight">Festival Brain</h1>
            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-medium">
              Shadow Mode
            </span>
          </div>

          {/* Festival selector */}
          <div className="relative">
            <button
              onClick={() => setFestivalDropdownOpen(!festivalDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm transition-colors"
            >
              <span className="font-medium">{selectedFestival.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {festivalDropdownOpen && (
              <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 max-h-80 overflow-y-auto">
                {FESTIVALS.map(f => (
                  <button
                    key={f.slug}
                    onClick={() => { setSelectedFestival(f); setFestivalDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                      f.slug === selectedFestival.slug ? "bg-slate-700/50 text-amber-300" : ""
                    }`}
                  >
                    <div className="font-medium">{f.name}</div>
                    <div className="text-xs text-slate-400">{f.dates}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          {[
            { id: "chat" as Tab, icon: MessageCircle, label: "Shadow Chat" },
            { id: "lessons" as Tab, icon: BookOpen, label: "Lessons" },
            { id: "stats" as Tab, icon: BarChart3, label: "Brain Stats" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-300"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto">
        {activeTab === "chat" && <ShadowChat festival={selectedFestival} />}
        {activeTab === "lessons" && <LessonViewer festivalSlug={selectedFestival.slug} />}
        {activeTab === "stats" && <BrainStats festivalSlug={selectedFestival.slug} />}
      </main>
    </div>
  );
}

// ── Shadow Chat ──────────────────────────────────────────────────────────

function ShadowChat({ festival }: { festival: typeof FESTIVALS[number] }) {
  const [message, setMessage] = useState("");
  const [dayNumber, setDayNumber] = useState<number | undefined>();
  const [concept, setConcept] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: history, refetch: refetchHistory } = trpc.brain.chatHistory.useQuery({
    festivalSlug: festival.slug,
    limit: 100,
  });

  const chatMutation = trpc.brain.chat.useMutation({
    onSuccess: () => {
      refetchHistory();
      setMessage("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSend = () => {
    if (!message.trim() || chatMutation.isPending) return;
    chatMutation.mutate({
      festivalSlug: festival.slug,
      festivalName: festival.name,
      message: message.trim(),
      concept: concept || undefined,
      dayNumber,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Context bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Day:</label>
          <input
            type="number"
            min={1}
            max={10}
            value={dayNumber ?? ""}
            onChange={e => setDayNumber(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="—"
            className="w-12 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-center"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Concept:</label>
          <select
            value={concept}
            onChange={e => setConcept(e.target.value)}
            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded"
          >
            <option value="">All concepts</option>
            <option value="Fish Project">Fish Project</option>
            <option value="Gyros by Gaia">Gyros by Gaia</option>
            <option value="La Creperie">La Creperie</option>
            <option value="Chicks & Buns">Chicks & Buns</option>
            <option value="Gyropolis">Gyropolis</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {(!history || history.length === 0) && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Brain className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Shadow Mode Active</h3>
              <p className="text-sm text-slate-400 max-w-md">
                Talk to the brain as you work at <span className="text-amber-300">{festival.name}</span>.
                Every message teaches it something. Quick decisions, stock updates, timing observations — it all becomes a rule.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                "Ordered 45kg fish — 40k attendance"
              </div>
              <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                "3 FoH, 2 kitchen — Saturday busy"
              </div>
              <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                "Ran out of flatbread at 22:00"
              </div>
              <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                "Gas check passed — inspector early"
              </div>
            </div>
          </div>
        )}

        {history?.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === "user"
                  ? "bg-amber-600/80 text-white rounded-br-md"
                  : "bg-slate-800 border border-slate-700 rounded-bl-md"
              }`}
            >
              {msg.role === "brain" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Brain className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-medium uppercase tracking-wider">Brain</span>
                  {msg.lessonsExtracted && (msg.lessonsExtracted as number[]).length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded-full">
                      +{(msg.lessonsExtracted as number[]).length} lessons
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className="text-[10px] text-slate-400 mt-1 text-right">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                Brain is thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 px-4 py-3 bg-slate-900/50">
        {chatMutation.error && (
          <div className="text-xs text-red-400 mb-2 px-2">
            Error: {chatMutation.error.message}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Tell the brain what's happening..."
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
            disabled={chatMutation.isPending}
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || chatMutation.isPending}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Lesson Viewer ────────────────────────────────────────────────────────

function LessonViewer({ festivalSlug }: { festivalSlug: string }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showAll, setShowAll] = useState(false);

  const { data: lessons, isLoading } = trpc.brain.lessons.useQuery({
    festivalSlug: showAll ? undefined : festivalSlug,
    category: categoryFilter || undefined,
    limit: 200,
  });

  const categories = useMemo(() => {
    if (!lessons) return [];
    const cats = new Set(lessons.map(l => l.category));
    return Array.from(cats).sort();
  }, [lessons]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded"
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500/20"
          />
          All festivals
        </label>
        <span className="text-xs text-slate-500 ml-auto">
          {lessons?.length ?? 0} lessons
        </span>
      </div>

      {/* Lessons list */}
      {(!lessons || lessons.length === 0) ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No lessons yet. Start chatting with the brain!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map(lesson => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 hover:border-slate-600 transition-colors cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider ${CATEGORY_COLORS[lesson.category] || "bg-slate-600/20 text-slate-300"}`}>
              {lesson.category}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${confidenceBadge(lesson.confidence)}`}>
              {lesson.confidence}%
            </span>
            {lesson.humanOverridden && (
              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded">
                overridden
              </span>
            )}
            <span className="text-[10px] text-slate-500 ml-auto">
              {lesson.festivalSlug}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-200">{lesson.rule}</p>
          {lesson.ruleCondition && (
            <p className="text-xs text-slate-400 mt-0.5">When: {lesson.ruleCondition}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Action next time</span>
            <p className="text-xs text-slate-300">{lesson.actionNextTime}</p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Source</span>
            <p className="text-xs text-slate-400">{lesson.source}: "{lesson.rawInput?.substring(0, 200)}"</p>
          </div>
          {(lesson.forecastValue || lesson.actualValue) && (
            <div className="flex gap-4 text-xs">
              {lesson.forecastValue && <span>Forecast: {lesson.forecastValue}</span>}
              {lesson.actualValue && <span>Actual: {lesson.actualValue}</span>}
              {lesson.deviationPct && <span className={Number(lesson.deviationPct) > 0 ? "text-red-400" : "text-green-400"}>
                {Number(lesson.deviationPct) > 0 ? "+" : ""}{lesson.deviationPct}%
              </span>}
            </div>
          )}
          <div className="flex items-center gap-4 text-[10px] text-slate-500">
            <span>Applied {lesson.timesApplied}x</span>
            <span>Correct {lesson.timesCorrect}x</span>
            <span>{new Date(lesson.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Brain Stats ──────────────────────────────────────────────────────────

function BrainStats({ festivalSlug }: { festivalSlug: string }) {
  const { data: stats, isLoading: statsLoading } = trpc.brain.stats.useQuery({ festivalSlug });
  const { data: allStats } = trpc.brain.stats.useQuery({});
  const { data: logs } = trpc.brain.agentLogs.useQuery({ festivalSlug, limit: 20 });

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={BookOpen}
          label="Lessons (this festival)"
          value={stats?.totalLessons ?? 0}
        />
        <StatCard
          icon={Target}
          label="Avg Confidence"
          value={`${stats?.avgConfidence ?? 0}%`}
          color={stats?.avgConfidence && stats.avgConfidence >= 70 ? "text-green-400" : "text-orange-400"}
        />
        <StatCard
          icon={TrendingUp}
          label="High confidence (80+)"
          value={stats?.highConfidence ?? 0}
          color="text-green-400"
        />
        <StatCard
          icon={Zap}
          label="Total lessons (all)"
          value={allStats?.totalLessons ?? 0}
          color="text-amber-400"
        />
      </div>

      {/* Category breakdown */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            Lessons by Category
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <div
                key={cat}
                className={`px-3 py-2 rounded-lg border text-sm ${CATEGORY_COLORS[cat] || "bg-slate-700/50 border-slate-600"}`}
              >
                <div className="text-xs uppercase tracking-wider opacity-70">{cat}</div>
                <div className="text-lg font-bold">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence scale */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Confidence Scale</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-16 text-right font-mono text-red-400">{"< 60"}</div>
            <div className="flex-1 h-2 bg-red-500/20 rounded-full" />
            <span className="text-slate-400">Unknown — always asks</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 text-right font-mono text-orange-400">60</div>
            <div className="flex-1 h-2 bg-orange-500/20 rounded-full" />
            <span className="text-slate-400">Learned once — needs approval</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 text-right font-mono text-yellow-400">70</div>
            <div className="flex-1 h-2 bg-yellow-500/20 rounded-full" />
            <span className="text-slate-400">Validated — acts alone, notifies you</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-16 text-right font-mono text-green-400">80+</div>
            <div className="flex-1 h-2 bg-green-500/20 rounded-full" />
            <span className="text-slate-400">Battle-tested — fully autonomous</span>
          </div>
        </div>
      </div>

      {/* Agent activity log */}
      {logs && logs.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Agent Activity
          </h3>
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <div className="w-16 text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${log.success ? "bg-green-500" : "bg-red-500"}`} />
                <div className="min-w-0">
                  <span className="text-slate-300 font-medium">{log.agent}</span>
                  <span className="text-slate-500"> — {log.action}</span>
                  {log.outputSummary && (
                    <p className="text-slate-500 truncate">{log.outputSummary}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color || "text-slate-200"}`}>{value}</div>
    </div>
  );
}
