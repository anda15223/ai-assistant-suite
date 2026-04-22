import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Plus, Trash2, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * /admin/sections — CRUD for the master schema (sections + questions).
 *
 * Edits here apply to FUTURE festivals only. Existing festivals keep their
 * answers even when a question is renamed or deleted; historical reports
 * will freeze the schema at generation time (Sprint 5 concern, not here).
 * The banner at the top of this page makes that explicit.
 */

const QUESTION_KINDS = [
  "single_select",
  "multi_select",
  "text",
  "number",
  "date",
  "datetime",
] as const;

type QuestionKind = (typeof QUESTION_KINDS)[number];

export default function AdminSections() {
  const me = trpc.auth.me.useQuery();
  const sections = trpc.plan.section.list.useQuery();
  const questions = trpc.plan.question.list.useQuery();
  const utils = trpc.useUtils();

  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const createSection = trpc.plan.section.create.useMutation({
    onSuccess: () => {
      toast.success("Section created");
      utils.plan.section.list.invalidate();
      setShowAddSection(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSection = trpc.plan.section.update.useMutation({
    onSuccess: () => utils.plan.section.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const deleteSection = trpc.plan.section.delete.useMutation({
    onSuccess: () => {
      toast.success("Section deleted");
      utils.plan.section.list.invalidate();
      utils.plan.question.list.invalidate();
      setActiveSectionId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const createQuestion = trpc.plan.question.create.useMutation({
    onSuccess: () => {
      toast.success("Question added");
      utils.plan.question.list.invalidate();
      setShowAddQuestion(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateQuestion = trpc.plan.question.update.useMutation({
    onSuccess: () => utils.plan.question.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const deleteQuestion = trpc.plan.question.delete.useMutation({
    onSuccess: () => {
      toast.success("Question deleted");
      utils.plan.question.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (me.data && me.data.role !== "admin") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Admin access required. This page lets you edit the master question
            schema used by every festival.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sortedSections = (sections.data ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
  const activeSection = sortedSections.find((s) => s.id === activeSectionId) ?? sortedSections[0];
  const activeQuestions = (questions.data ?? [])
    .filter((q) => q.sectionId === activeSection?.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">
          Sections & Questions
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Master schema for the Festival Operations Planner.
        </p>
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <Info className="w-4 h-4" />
        <AlertDescription className="text-amber-900">
          <strong>Future festivals only.</strong> Changes here do not
          retroactively mutate any existing festival's answers. If you add a
          new question, existing festivals will see it as unanswered.
          Historical reports are frozen at generation time.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* Left rail — sections list */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Sections</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setShowAddSection(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {sortedSections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSectionId(s.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                  s.id === activeSection?.id
                    ? "bg-[#111827] text-white"
                    : "text-[#111827] hover:bg-[#f3f4f6]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{s.title}</span>
                  {s.subEditorRoute && (
                    <Badge variant="outline" className="ml-2 text-[10px] border-current">
                      sub
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right pane — section details + questions */}
        {activeSection ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{activeSection.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input
                      defaultValue={activeSection.title}
                      onBlur={(e) => {
                        if (e.target.value !== activeSection.title) {
                          updateSection.mutate({
                            id: activeSection.id,
                            patch: { title: e.target.value },
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Category</Label>
                    <Input
                      defaultValue={activeSection.category}
                      onBlur={(e) => {
                        if (e.target.value !== activeSection.category) {
                          updateSection.mutate({
                            id: activeSection.id,
                            patch: { category: e.target.value },
                          });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    defaultValue={activeSection.description ?? ""}
                    rows={2}
                    onBlur={(e) => {
                      if (e.target.value !== (activeSection.description ?? "")) {
                        updateSection.mutate({
                          id: activeSection.id,
                          patch: { description: e.target.value },
                        });
                      }
                    }}
                  />
                </div>
                {activeSection.subEditorRoute && (
                  <p className="text-xs text-[#6b7280]">
                    Sub-editor route:{" "}
                    <code className="text-[11px]">{activeSection.subEditorRoute}</code>{" "}
                    — questions here are optional; sub-editor owns the data.
                  </p>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Delete section "${activeSection.title}"? Any questions inside will remain in the database but orphaned.`)) {
                        deleteSection.mutate({ id: activeSection.id });
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete section
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Questions ({activeQuestions.length})
                </CardTitle>
                <Button size="sm" onClick={() => setShowAddQuestion(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add question
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeQuestions.length === 0 ? (
                  <p className="text-sm text-[#6b7280]">
                    No questions yet. Add one with the button above.
                  </p>
                ) : (
                  activeQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-md border border-[#e5e7eb] p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-[#6b7280]">{q.key}</code>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {q.kind}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Delete question "${q.prompt}"? Existing answers stay.`)) {
                                deleteQuestion.mutate({ id: q.id });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        defaultValue={q.prompt}
                        onBlur={(e) => {
                          if (e.target.value !== q.prompt) {
                            updateQuestion.mutate({
                              id: q.id,
                              patch: { prompt: e.target.value },
                            });
                          }
                        }}
                      />
                      <div className="grid grid-cols-[200px_1fr] gap-2">
                        <Select
                          defaultValue={q.kind}
                          onValueChange={(next) =>
                            updateQuestion.mutate({
                              id: q.id,
                              patch: { kind: next as QuestionKind },
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {QUESTION_KINDS.map((k) => (
                              <SelectItem key={k} value={k}>
                                {k}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Help text (optional)"
                          defaultValue={q.helpText ?? ""}
                          onBlur={(e) => {
                            if (e.target.value !== (q.helpText ?? "")) {
                              updateQuestion.mutate({
                                id: q.id,
                                patch: { helpText: e.target.value || null },
                              });
                            }
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-[#6b7280]">
              No sections yet. Add one with the + button on the left.
            </CardContent>
          </Card>
        )}
      </div>

      <AddSectionDialog
        open={showAddSection}
        onOpenChange={setShowAddSection}
        nextOrderIndex={sortedSections.length}
        onSubmit={(payload) => createSection.mutate(payload)}
      />
      {activeSection && (
        <AddQuestionDialog
          open={showAddQuestion}
          onOpenChange={setShowAddQuestion}
          sectionId={activeSection.id}
          nextOrderIndex={activeQuestions.length}
          onSubmit={(payload) => createQuestion.mutate(payload)}
        />
      )}
    </div>
  );
}

function AddSectionDialog({
  open,
  onOpenChange,
  nextOrderIndex,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextOrderIndex: number;
  onSubmit: (payload: {
    key: string;
    title: string;
    category: string;
    orderIndex: number;
  }) => void;
}) {
  const [key, setKey] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("planning");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New section</DialogTitle>
          <DialogDescription>
            Sections organise the scalar questions on a festival's Operations Plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Key</Label>
            <Input placeholder="lowercase_underscore" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!key || !title) return;
              onSubmit({ key, title, category, orderIndex: nextOrderIndex });
              setKey("");
              setTitle("");
              setCategory("planning");
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddQuestionDialog({
  open,
  onOpenChange,
  sectionId,
  nextOrderIndex,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sectionId: number;
  nextOrderIndex: number;
  onSubmit: (payload: {
    sectionId: number;
    key: string;
    prompt: string;
    kind: QuestionKind;
    orderIndex: number;
  }) => void;
}) {
  const [key, setKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<QuestionKind>("text");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New question</DialogTitle>
          <DialogDescription>
            New questions appear as unanswered on existing festivals until answered.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Key</Label>
            <Input placeholder="lowercase_underscore" value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Prompt</Label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Kind</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as QuestionKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!key || !prompt) return;
              onSubmit({ sectionId, key, prompt, kind, orderIndex: nextOrderIndex });
              setKey("");
              setPrompt("");
              setKind("text");
            }}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
