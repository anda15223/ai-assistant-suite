import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, AlertCircle } from "lucide-react";

/**
 * QuestionInput — the single reusable editor for scalar questions in a
 * festival section. Handles all six question kinds, autosaves via the
 * parent's `onChange` callback, and renders a subtle per-field status
 * indicator so Fif can see at a glance whether an edit has been persisted.
 *
 * Autosave semantics:
 * - text / number: debounced 500ms after the user stops typing
 * - date / datetime / single_select / multi_select: immediate
 *
 * The parent is expected to return a thenable from `onChange` so the
 * "saving" state resolves correctly after the mutation completes.
 */

export type QuestionKind =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "single_select"
  | "multi_select";

export type QuestionOption = { label: string; value: string };

export type Question = {
  id: number;
  key: string;
  prompt: string;
  kind: QuestionKind;
  options: QuestionOption[] | null;
  helpText: string | null;
  required: boolean;
};

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

type Props = {
  question: Question;
  currentValue: unknown;
  onChange: (value: unknown) => Promise<unknown> | unknown;
};

const DEBOUNCE_MS = 500;

export function QuestionInput({ question, currentValue, onChange }: Props) {
  // `local` tracks what the input visually shows; `currentValue` is the
  // last persisted value from the server. They diverge during editing and
  // reconverge once the debounced save lands.
  const [local, setLocal] = useState<unknown>(currentValue);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset local value when the server-side value changes (e.g. first load,
    // or another window updated it). Only sync when we're not mid-edit.
    if (status === "idle" || status === "saved") {
      setLocal(currentValue);
    }
  }, [currentValue, status]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function persist(value: unknown) {
    setStatus("saving");
    try {
      await Promise.resolve(onChange(value));
      setStatus("saved");
      // Clear the "saved" indicator after a short delay so it reads as
      // confirmation, not permanent state.
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1200);
    } catch {
      setStatus("error");
    }
  }

  function scheduleDebounced(value: unknown) {
    setLocal(value);
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(value), DEBOUNCE_MS);
  }

  function applyImmediate(value: unknown) {
    setLocal(value);
    persist(value);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-[#111827]">
          {question.prompt}
          {question.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        <SaveIndicator status={status} />
      </div>
      {renderControl(question, local, scheduleDebounced, applyImmediate)}
      {question.helpText && (
        <p className="text-xs text-[#6b7280]">{question.helpText}</p>
      )}
    </div>
  );
}

function renderControl(
  question: Question,
  local: unknown,
  scheduleDebounced: (v: unknown) => void,
  applyImmediate: (v: unknown) => void,
) {
  switch (question.kind) {
    case "text": {
      const v = typeof local === "string" ? local : "";
      // Long-form text gets a textarea, short fields get an input. Heuristic
      // based on key name since we don't have a length hint in the schema.
      const multiline = /notes|summary|description|list|freeform/i.test(question.key);
      return multiline ? (
        <Textarea
          value={v}
          onChange={(e) => scheduleDebounced(e.target.value)}
          rows={3}
        />
      ) : (
        <Input value={v} onChange={(e) => scheduleDebounced(e.target.value)} />
      );
    }

    case "number": {
      const v = local === null || local === undefined ? "" : String(local);
      return (
        <Input
          type="number"
          value={v}
          onChange={(e) => {
            const next = e.target.value === "" ? null : Number(e.target.value);
            scheduleDebounced(next);
          }}
        />
      );
    }

    case "date": {
      const v = typeof local === "string" ? local : "";
      return (
        <Input
          type="date"
          value={v}
          onChange={(e) => applyImmediate(e.target.value)}
        />
      );
    }

    case "datetime": {
      const v = typeof local === "string" ? local : "";
      // datetime-local expects "YYYY-MM-DDTHH:MM"; we pass through as-is.
      return (
        <Input
          type="datetime-local"
          value={v}
          onChange={(e) => applyImmediate(e.target.value)}
        />
      );
    }

    case "single_select": {
      const v = typeof local === "string" ? local : "";
      const options = question.options ?? [];
      return (
        <Select value={v} onValueChange={(next) => applyImmediate(next)}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    case "multi_select": {
      const current: string[] = Array.isArray(local) ? (local as string[]) : [];
      const options = question.options ?? [];
      return (
        <div className="space-y-2 rounded-md border border-[#e5e7eb] p-3">
          {options.map((opt) => {
            const checked = current.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 text-sm text-[#111827] cursor-pointer"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => {
                    const set = new Set(current);
                    if (next) set.add(opt.value);
                    else set.delete(opt.value);
                    applyImmediate(Array.from(set));
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      );
    }
  }
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return <span className="w-3 h-3" />;
  if (status === "dirty")
    return <span className="text-xs text-[#6b7280]">editing…</span>;
  if (status === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-[#6b7280]">
        <Loader2 className="w-3 h-3 animate-spin" />
        saving
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <Check className="w-3 h-3" />
        saved
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-red-600">
      <AlertCircle className="w-3 h-3" />
      error
    </span>
  );
}
