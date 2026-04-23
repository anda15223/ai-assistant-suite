import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * "Grab from Brain" dialog for a SmartCard.
 *
 * Reads `brain_entries` (populated by past AI extractions on other
 * festivals) for this card's cardKey, groups by section title, and lets
 * the user pick which suggested lines to insert. Applied lines are tagged
 * source='brain' so they're visually distinct.
 */

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cardId: number;
  cardKey: string;
  excludeFestivalId: number;
  onApplied?: () => void;
};

type LineSuggestion = {
  label: string;
  value: string | null;
  quantity: string | null;
  notes: string | null;
  frequency: number;
};

type SectionSuggestion = {
  title: string;
  lines: LineSuggestion[];
};

export function BrainGrabDialog({ open, onOpenChange, cardId, cardKey, excludeFestivalId, onApplied }: Props) {
  const grabQ = trpc.smartCard.brain.grab.useQuery(
    { cardKey, excludeFestivalId },
    { enabled: open },
  );
  const apply = trpc.smartCard.brain.applySuggestions.useMutation();

  // Selection state: sectionTitle → labels selected
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!grabQ.data) return;
    // On fresh load, default-select everything
    const next: Record<string, Set<string>> = {};
    for (const sec of grabQ.data) {
      next[sec.title] = new Set(sec.lines.map((l) => l.label));
    }
    setSelected(next);
  }, [grabQ.data]);

  const toggle = (sectionTitle: string, label: string) => {
    setSelected((prev) => {
      const set = new Set(prev[sectionTitle] ?? []);
      if (set.has(label)) set.delete(label);
      else set.add(label);
      return { ...prev, [sectionTitle]: set };
    });
  };

  const toggleSection = (sec: SectionSuggestion) => {
    setSelected((prev) => {
      const current = prev[sec.title] ?? new Set<string>();
      const allSelected = sec.lines.every((l) => current.has(l.label));
      const next = allSelected ? new Set<string>() : new Set(sec.lines.map((l) => l.label));
      return { ...prev, [sec.title]: next };
    });
  };

  const totalSelected = Object.values(selected).reduce((n, set) => n + set.size, 0);
  const suggestions: SectionSuggestion[] = (grabQ.data ?? []) as SectionSuggestion[];

  const handleApply = async () => {
    const payload = suggestions
      .map((sec) => ({
        title: sec.title,
        lines: sec.lines
          .filter((l) => selected[sec.title]?.has(l.label))
          .map((l) => ({
            label: l.label,
            value: l.value,
            quantity: l.quantity,
            notes: l.notes,
          })),
      }))
      .filter((s) => s.lines.length > 0);

    if (payload.length === 0) {
      toast.error("Nothing selected");
      return;
    }

    try {
      const result = await apply.mutateAsync({ cardId, suggestions: payload });
      toast.success(
        `Brain grabbed ${result.linesCreated} line${result.linesCreated === 1 ? "" : "s"} ` +
          `into ${result.sectionsCreated} new section${result.sectionsCreated === 1 ? "" : "s"}`,
      );
      onApplied?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Apply failed: ${err?.message ?? "unknown error"}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-500" /> Grab from Brain
          </DialogTitle>
          <DialogDescription>
            Suggestions pulled from what worked on past festivals for this card type.
            Select which ones to apply.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 space-y-3">
          {grabQ.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Reading Brain…
            </div>
          )}

          {!grabQ.isLoading && suggestions.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 mx-auto mb-2 opacity-50" />
              Nothing in Brain yet for this card type. It'll start learning from AI-extracted
              uploads on future festivals.
            </div>
          )}

          {suggestions.map((sec) => {
            const selectedSet = selected[sec.title] ?? new Set<string>();
            const allSelected = sec.lines.every((l) => selectedSet.has(l.label));
            return (
              <div key={sec.title} className="border border-border/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{sec.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleSection(sec)}
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </Button>
                </div>
                <ul className="space-y-1">
                  {sec.lines.map((l) => {
                    const isChecked = selectedSet.has(l.label);
                    return (
                      <li key={l.label} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(sec.title, l.label)}
                          className="mt-0.5 shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{l.label}</span>
                          {l.value && <span className="text-muted-foreground">: {l.value}</span>}
                          {l.quantity && (
                            <span className="text-xs text-muted-foreground"> × {l.quantity}</span>
                          )}
                          {l.notes && (
                            <span className="block text-xs text-muted-foreground italic">
                              — {l.notes}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          seen {l.frequency}×
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={apply.isPending || totalSelected === 0}>
            {apply.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Brain className="h-4 w-4 mr-1.5" />
            )}
            Apply {totalSelected ? `${totalSelected} item${totalSelected === 1 ? "" : "s"}` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
