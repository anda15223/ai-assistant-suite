import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Check, Pencil, ChevronDown, ChevronRight, Sparkles,
  Upload, Loader2, FileText, File as FileIcon, Download, Brain,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SmartCardChat } from "./SmartCardChat";
import { BrainGrabDialog } from "./BrainGrabDialog";

// File upload: allowed extensions and hard cap. Matches the Lovable source.
const ACCEPTED_FILE_TYPES = ".pdf,.xlsx,.xls,.docx,.doc,.csv,.txt,.png,.jpg,.jpeg,.webp";
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 MB

// Read a File to a raw base64 string (no data: prefix).
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * SmartCard — reusable card primitive for any structured-but-fuzzy area of
 * a festival plan (equipment, cooling, cooking gear, safety…). One card per
 * (festival × card_key × optional concept). Contains sections → lines and
 * a todo list.
 *
 * Chunk 1 scope: manual editing only. File upload, AI extract, per-card AI
 * chat, and Brain grab live in later sessions.
 */

type Props = {
  festivalId: number;
  cardKey: string;
  conceptId?: number | null;
  title: string;
  subtitle?: string;
  emptyStateWarning?: { label: string; description?: string };
};

const sourceColor = (s: string) => {
  switch (s) {
    case "ai":
      return "bg-violet-100 text-violet-700 border-violet-300/40";
    case "brain":
      return "bg-amber-100 text-amber-700 border-amber-300/40";
    case "upload":
      return "bg-blue-100 text-blue-700 border-blue-300/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

const sourceLabel = (s: string) => {
  switch (s) {
    case "ai": return "AI";
    case "brain": return "Brain";
    case "upload": return "Upload";
    default: return "Manual";
  }
};

export function SmartCard({ festivalId, cardKey, conceptId = null, title, subtitle, emptyStateWarning }: Props) {
  const utils = trpc.useUtils();

  // Get-or-create card on mount
  const [cardId, setCardId] = useState<number | null>(null);
  const getOrCreate = trpc.smartCard.getOrCreate.useMutation();
  useEffect(() => {
    let cancelled = false;
    getOrCreate
      .mutateAsync({ festivalId, cardKey, conceptId: conceptId ?? null, title })
      .then((card) => {
        if (!cancelled) setCardId(card.id);
      })
      .catch((err) => toast.error(`Could not load card: ${err.message}`));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [festivalId, cardKey, conceptId]);

  const full = trpc.smartCard.getFull.useQuery(
    { cardId: cardId ?? -1 },
    { enabled: cardId != null },
  );

  const invalidate = () => {
    if (cardId != null) utils.smartCard.getFull.invalidate({ cardId });
  };

  const addSection = trpc.smartCard.addSection.useMutation({ onSuccess: invalidate });
  const updateSection = trpc.smartCard.updateSection.useMutation({ onSuccess: invalidate });
  const deleteSection = trpc.smartCard.deleteSection.useMutation({ onSuccess: invalidate });
  const addLine = trpc.smartCard.addLine.useMutation({ onSuccess: invalidate });
  const updateLine = trpc.smartCard.updateLine.useMutation({ onSuccess: invalidate });
  const deleteLine = trpc.smartCard.deleteLine.useMutation({ onSuccess: invalidate });
  const addTodo = trpc.smartCard.addTodo.useMutation({ onSuccess: invalidate });
  const updateTodo = trpc.smartCard.updateTodo.useMutation({ onSuccess: invalidate });
  const deleteTodo = trpc.smartCard.deleteTodo.useMutation({ onSuccess: invalidate });
  const uploadFile = trpc.smartCard.file.upload.useMutation();
  const deleteFile = trpc.smartCard.file.delete.useMutation({ onSuccess: invalidate });
  const extractFile = trpc.smartCard.file.extract.useMutation({ onSuccess: invalidate });
  const dismissWarning = trpc.smartCard.file.dismissWarning.useMutation({ onSuccess: invalidate });
  const restoreWarning = trpc.smartCard.file.restoreWarning.useMutation({ onSuccess: invalidate });

  const [editMode, setEditMode] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [extractingIds, setExtractingIds] = useState<Set<number>>(new Set());
  const [brainGrabOpen, setBrainGrabOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const runExtract = async (fileId: number, filename?: string | null) => {
    setExtractingIds((s) => new Set(s).add(fileId));
    try {
      const result = await extractFile.mutateAsync({ fileId });
      const wc = result.warnings?.length ?? 0;
      if (wc > 0) {
        toast.warning(
          `AI extracted ${result.sectionsCreated} sections from ${filename ?? "file"} — ${wc} issue${wc === 1 ? "" : "s"} need attention`,
        );
      } else {
        toast.success(`AI extracted ${result.sectionsCreated} sections from ${filename ?? "file"}`);
      }
    } catch (err: any) {
      toast.error(`Extract failed: ${err?.message || "unknown error"}`);
    } finally {
      setExtractingIds((s) => {
        const n = new Set(s);
        n.delete(fileId);
        return n;
      });
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || cardId == null) return;
    setUploading(true);
    const uploadedIds: Array<{ id: number; filename: string }> = [];
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large (max 30 MB)`);
          continue;
        }
        try {
          const base64 = await fileToBase64(file);
          const row = await uploadFile.mutateAsync({
            cardId,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            base64,
          });
          toast.success(`Uploaded ${file.name}`);
          uploadedIds.push({ id: row.id, filename: file.name });
        } catch (err: any) {
          toast.error(`Upload failed: ${err?.message || file.name}`);
        }
      }
      invalidate();
    } finally {
      setUploading(false);
    }
    // Auto-trigger extraction for every successfully uploaded file.
    // Sequential so we don't flood the Anthropic rate limit on a big batch.
    for (const { id, filename } of uploadedIds) {
      await runExtract(id, filename);
    }
  };

  if (cardId == null || full.isLoading) {
    return (
      <Card className="p-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        Loading card…
      </Card>
    );
  }

  if (!full.data) {
    return <Card className="p-5 text-sm text-destructive">Card not found.</Card>;
  }

  const { sections, lines, todos, files } = full.data;
  const showWarning = emptyStateWarning && sections.length === 0 && files.length === 0;

  const handleAddTodo = () => {
    const t = newTodoTitle.trim();
    if (!t) return;
    addTodo.mutate({ cardId: cardId!, title: t });
    setNewTodoTitle("");
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {editMode && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setBrainGrabOpen(true)}
              >
                <Brain className="h-3.5 w-3.5 mr-1" /> Grab from Brain
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1" />
                )}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              <Button
                size="sm"
                onClick={() => addSection.mutate({ cardId: cardId!, title: "New section" })}
                className="h-8"
                disabled={addSection.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Section
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant={editMode ? "default" : "outline"}
            className="h-8"
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Done
              </>
            ) : (
              <>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </>
            )}
          </Button>
        </div>
      </div>

      {showWarning && (
        <div className="m-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-semibold text-destructive">⚠️ {emptyStateWarning!.label}</p>
          {emptyStateWarning!.description && (
            <p className="text-xs text-destructive/80 mt-1">{emptyStateWarning!.description}</p>
          )}
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="px-5 py-3 border-b border-border/50 bg-muted/10 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source files</p>
          {files.map((f) => {
            const isPdf = f.mimeType === "application/pdf" || /\.pdf$/i.test(f.filename || "");
            const isExtracting = extractingIds.has(f.id) || f.parseStatus === "processing";
            const rawWarnings = Array.isArray(f.warnings) ? f.warnings : [];
            const dismissedMap = (f.meta as any)?.dismissed_warnings ?? {};
            const wList = rawWarnings.map((w: any) => ({
              ...w,
              dismissed: !!dismissedMap[w.field],
              dismissReason: dismissedMap[w.field] ?? null,
            }));
            const activeCount = wList.filter((w) => !w.dismissed).length;
            const errCount = wList.filter((w) => !w.dismissed && w.severity === "error").length;
            return (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center gap-2 text-sm group">
                  {isPdf ? (
                    <FileText className="h-4 w-4 text-red-600 shrink-0" />
                  ) : (
                    <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <a
                    href={f.url ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate flex-1 hover:text-primary hover:underline"
                    title={f.filename ?? undefined}
                  >
                    {f.filename || "File"}
                  </a>
                  {typeof f.size === "number" && (
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {f.size > 1024 * 1024
                        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(f.size / 1024))} KB`}
                    </span>
                  )}
                  {isExtracting ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-1.5 text-[10px] bg-violet-100 text-violet-700 border-violet-300/40"
                    >
                      <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" /> extracting
                    </Badge>
                  ) : f.parseStatus === "pending" ? (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      pending
                    </Badge>
                  ) : f.parseStatus === "done" ? (
                    activeCount === 0 ? (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 border-emerald-300/40"
                      >
                        parsed
                      </Badge>
                    ) : errCount > 0 ? (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                        {errCount} missing
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 px-1.5 text-[10px] bg-amber-100 text-amber-800 border-amber-300/40"
                      >
                        {activeCount} warning{activeCount === 1 ? "" : "s"}
                      </Badge>
                    )
                  ) : f.parseStatus === "error" ? (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                      error
                    </Badge>
                  ) : null}
                  {(f.parseStatus === "pending" || f.parseStatus === "error") && !isExtracting && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => runExtract(f.id, f.filename)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" /> Extract
                    </Button>
                  )}
                  {f.url && (
                    <a
                      href={f.url}
                      download={f.filename ?? undefined}
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-foreground shrink-0"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {editMode && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete ${f.filename}?`)) {
                          deleteFile.mutate({ fileId: f.id });
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 transition text-destructive shrink-0"
                      aria-label="Delete file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {f.parseStatus === "error" && f.parseError && (
                  <p className="ml-6 text-[11px] text-destructive">{f.parseError}</p>
                )}

                {wList.length > 0 && (
                  <ul className="ml-6 space-y-0.5">
                    {wList.map((w, i) => (
                      <li
                        key={i}
                        className={cn(
                          "text-[11px] flex items-start gap-1.5 group/w",
                          w.dismissed
                            ? "text-muted-foreground opacity-80"
                            : w.severity === "error"
                              ? "text-destructive"
                              : "text-amber-700",
                        )}
                      >
                        <span className="shrink-0 mt-0.5">
                          {w.dismissed ? "✓" : w.severity === "error" ? "❌" : "⚠️"}
                        </span>
                        <span className="flex-1">
                          <span className={w.dismissed ? "line-through" : ""}>{w.message}</span>
                          {w.dismissed && w.dismissReason && (
                            <span className="ml-1 italic text-muted-foreground">→ {w.dismissReason}</span>
                          )}
                        </span>
                        {w.dismissed ? (
                          <button
                            type="button"
                            onClick={() => restoreWarning.mutate({ fileId: f.id, field: w.field })}
                            className="opacity-0 group-hover/w:opacity-100 underline hover:text-foreground transition"
                            title="Restore this warning"
                          >
                            restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              const reason = window.prompt(
                                `Why is "${w.field}" not actually missing? (short note)`,
                                "",
                              );
                              if (reason && reason.trim()) {
                                dismissWarning.mutate({
                                  fileId: f.id,
                                  field: w.field,
                                  reason: reason.trim(),
                                });
                              }
                            }}
                            className="opacity-0 group-hover/w:opacity-100 underline hover:text-foreground transition"
                            title="Mark as not actually missing"
                          >
                            mark as OK
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sections */}
      <div className="divide-y divide-border/60">
        {sections.map((section) => {
          const sectionLines = lines.filter((l) => l.sectionId === section.id);
          const isCollapsed = !!collapsed[section.id];
          return (
            <div key={section.id} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCollapsed((p) => ({ ...p, [section.id]: !p[section.id] }))}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {editMode ? (
                  <Input
                    defaultValue={section.title}
                    onBlur={(e) => {
                      if (e.target.value !== section.title) {
                        updateSection.mutate({ sectionId: section.id, title: e.target.value });
                      }
                    }}
                    className="h-8 text-base font-semibold border-transparent bg-transparent focus-visible:bg-background flex-1"
                  />
                ) : (
                  <h4 className="text-base font-semibold flex-1 truncate">{section.title}</h4>
                )}
                <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] shrink-0", sourceColor(section.source))}>
                  {sourceLabel(section.source)}
                </Badge>
                {editMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Delete this section and all its lines?")) {
                        deleteSection.mutate({ sectionId: section.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {!isCollapsed && (
                <div className="pl-6 space-y-1.5">
                  {sectionLines.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No lines yet.</p>
                  )}

                  {editMode ? (
                    sectionLines.map((line) => (
                      <div
                        key={line.id}
                        className="grid grid-cols-[1fr_1.4fr_70px_1fr_60px_24px] gap-1.5 items-center group"
                      >
                        <Input
                          defaultValue={line.label ?? ""}
                          onBlur={(e) =>
                            updateLine.mutate({ lineId: line.id, label: e.target.value || null })
                          }
                          placeholder="Label"
                          className="h-7 text-xs"
                        />
                        <Input
                          defaultValue={line.value ?? ""}
                          onBlur={(e) =>
                            updateLine.mutate({ lineId: line.id, value: e.target.value || null })
                          }
                          placeholder="Value"
                          className="h-7 text-xs"
                        />
                        <Input
                          defaultValue={line.quantity ?? ""}
                          onBlur={(e) =>
                            updateLine.mutate({ lineId: line.id, quantity: e.target.value || null })
                          }
                          placeholder="Qty"
                          className="h-7 text-xs"
                        />
                        <Input
                          defaultValue={line.notes ?? ""}
                          onBlur={(e) =>
                            updateLine.mutate({ lineId: line.id, notes: e.target.value || null })
                          }
                          placeholder="Notes"
                          className="h-7 text-xs"
                        />
                        <Badge
                          variant="outline"
                          className={cn("h-5 px-1 text-[9px] justify-center", sourceColor(line.source))}
                        >
                          {sourceLabel(line.source)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100"
                          onClick={() => deleteLine.mutate({ lineId: line.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : sectionLines.length > 0 ? (
                    <ul className="space-y-1">
                      {sectionLines.map((line) => {
                        const hasLabel = !!line.label?.trim();
                        const hasValue = !!line.value?.trim();
                        const hasQty = !!line.quantity?.trim();
                        const hasNotes = !!line.notes?.trim();
                        if (!hasLabel && !hasValue && !hasQty && !hasNotes) return null;
                        return (
                          <li
                            key={line.id}
                            className="text-sm flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-snug"
                          >
                            {hasLabel && (
                              <span className="font-medium text-foreground">
                                {line.label}
                                {hasValue ? ":" : ""}
                              </span>
                            )}
                            {hasValue && <span className="text-foreground/90">{line.value}</span>}
                            {hasQty && <span className="text-xs text-muted-foreground">× {line.quantity}</span>}
                            {hasNotes && (
                              <span className="text-xs text-muted-foreground italic">— {line.notes}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}

                  {editMode && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => addLine.mutate({ sectionId: section.id })}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add line
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {sections.length === 0 && !showWarning && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-50" />
            <p>
              No sections yet. Click <strong>Edit</strong> then <strong>Section</strong> to start.
            </p>
          </div>
        )}
      </div>

      {/* Todos */}
      <div className="px-5 py-3 border-t border-border/60 bg-amber-50/40 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">✅ Todos</p>

        {todos.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No todos yet.</p>
        )}

        {todos.map((t) => {
          const overdue =
            t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date(new Date().toDateString());
          return (
            <div key={t.id} className="flex items-start gap-2 text-sm group">
              <input
                type="checkbox"
                checked={t.status === "done"}
                onChange={() =>
                  updateTodo.mutate({
                    todoId: t.id,
                    status: t.status === "done" ? "open" : "done",
                  })
                }
                className="mt-1 shrink-0 cursor-pointer"
              />
              <div className="flex-1 min-w-0">
                <div className={cn("leading-snug", t.status === "done" && "line-through text-muted-foreground")}>
                  {t.title}
                </div>
                {(t.dueDate || t.owner) && (
                  <div
                    className={cn(
                      "text-[11px] mt-0.5",
                      overdue ? "text-destructive font-medium" : "text-muted-foreground",
                    )}
                  >
                    {t.dueDate && <span>📅 {new Date(t.dueDate).toLocaleDateString()}</span>}
                    {t.dueDate && t.owner && <span> · </span>}
                    {t.owner && <span>👤 {t.owner}</span>}
                    {overdue && <span className="ml-1">· overdue</span>}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteTodo.mutate({ todoId: t.id })}
                className="opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                aria-label="Delete todo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}

        <div className="flex gap-2 items-center pt-1">
          <Input
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddTodo();
            }}
            placeholder="Add a todo…"
            className="h-8 text-sm"
          />
          <Button size="sm" onClick={handleAddTodo} disabled={!newTodoTitle.trim()} className="h-8">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Per-card AI chat — collapsible, loads history on first open */}
      <SmartCardChat cardId={cardId} cardTitle={title} />

      {/* Brain-grab dialog */}
      <BrainGrabDialog
        open={brainGrabOpen}
        onOpenChange={setBrainGrabOpen}
        cardId={cardId}
        cardKey={cardKey}
        excludeFestivalId={festivalId}
        onApplied={invalidate}
      />
    </Card>
  );
}
