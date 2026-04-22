import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { QuestionInput, type Question, type QuestionKind } from "@/components/festival/QuestionInput";
import { toast } from "sonner";

type Props = { slug: string; sectionKey: string };

/**
 * Generic scalar editor for any section whose questions are simple fields
 * (non-sub-editor sections). Renders one QuestionInput per question, wires
 * autosave through trpc.plan.answer.upsert, and also shows the action items
 * scoped to this section in a side panel.
 */
export default function FestivalPlanSectionDetail({ slug, sectionKey }: Props) {
  const utils = trpc.useUtils();
  const overview = trpc.plan.festival.overview.useQuery({ slug });
  const questions = trpc.plan.question.list.useQuery();
  const answersByFestival = trpc.plan.answer.listByFestival.useQuery(
    { festivalId: overview.data?.festival.id ?? -1 },
    { enabled: !!overview.data?.festival.id },
  );
  const actionItems = trpc.plan.actionItem.list.useQuery(
    { festivalId: overview.data?.festival.id ?? -1, sectionKey },
    { enabled: !!overview.data?.festival.id },
  );

  const upsertAnswer = trpc.plan.answer.upsert.useMutation({
    onSuccess: () => {
      if (overview.data?.festival.id) {
        utils.plan.answer.listByFestival.invalidate({ festivalId: overview.data.festival.id });
        utils.plan.festival.overview.invalidate({ slug });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  if (overview.isLoading || questions.isLoading) {
    return <div className="p-6 text-[#6b7280]">Loading…</div>;
  }

  if (!overview.data) {
    return <div className="p-6 text-red-600">Festival not found.</div>;
  }

  const section = overview.data.sections.find((s) => s.key === sectionKey);
  if (!section) {
    return <div className="p-6 text-red-600">Section “{sectionKey}” not found.</div>;
  }

  if (section.subEditorRoute) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Link
          href={`/festivals/${slug}/sections`}
          className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sections
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-[#6b7280]">
              This section is backed by a dedicated sub-editor (not built yet in
              Sprint 1 + 2).
            </p>
            <p className="text-sm text-[#6b7280]">
              Planned route:{" "}
              <code className="text-xs">
                {section.subEditorRoute.replace(":slug", slug)}
              </code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sectionQuestions = (questions.data ?? [])
    .filter((q) => q.sectionId === section.id)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const answersByQ = new Map<number, unknown>();
  for (const a of answersByFestival.data ?? []) answersByQ.set(a.questionId, a.value);

  const festivalId = overview.data.festival.id;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link
        href={`/festivals/${slug}/sections`}
        className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sections
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">{section.title}</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          {sectionQuestions.length} question{sectionQuestions.length === 1 ? "" : "s"}
          · Autosaves
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {sectionQuestions.length === 0 ? (
            <p className="text-sm text-[#6b7280]">No questions defined for this section yet.</p>
          ) : (
            sectionQuestions.map((q) => (
              <QuestionInput
                key={q.id}
                question={toClientQuestion(q)}
                currentValue={answersByQ.get(q.id)}
                onChange={(value) =>
                  upsertAnswer.mutateAsync({
                    festivalId,
                    questionId: q.id,
                    valueType: q.kind as QuestionKind,
                    value,
                  })
                }
              />
            ))
          )}
        </CardContent>
      </Card>

      {actionItems.data && actionItems.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Action items — {section.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actionItems.data.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2 rounded border border-[#e5e7eb]"
              >
                <Badge variant={priorityVariant(item.priority)} className="text-xs">
                  {item.priority}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-[#111827]">{item.title}</p>
                  <div className="flex items-center gap-3 text-xs text-[#6b7280] mt-1">
                    {item.deadline && (
                      <span>
                        Due{" "}
                        {new Date(item.deadline).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                    {item.owner && <span>Owner: {item.owner}</span>}
                    <span>Status: {item.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type ServerQuestion = {
  id: number;
  key: string;
  prompt: string;
  kind: string;
  options: unknown;
  helpText: string | null;
  required: boolean;
};

function toClientQuestion(q: ServerQuestion): Question {
  return {
    id: q.id,
    key: q.key,
    prompt: q.prompt,
    kind: q.kind as QuestionKind,
    options: Array.isArray(q.options)
      ? (q.options as { label: string; value: string }[])
      : null,
    helpText: q.helpText,
    required: q.required,
  };
}

function priorityVariant(
  p: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (p === "hard_deadline") return "destructive";
  if (p === "high") return "default";
  return "secondary";
}
