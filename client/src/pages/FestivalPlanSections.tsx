import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronRight } from "lucide-react";

type Props = { slug: string };

export default function FestivalPlanSections({ slug }: Props) {
  const overview = trpc.plan.festival.overview.useQuery({ slug });

  if (overview.isLoading) {
    return <div className="p-6 text-[#6b7280]">Loading planner…</div>;
  }

  if (overview.error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">
          Unable to load planner: {overview.error.message}
        </p>
        <p className="text-xs text-[#6b7280] mt-2">
          If this is a fresh environment, run <code>pnpm seed:jelling</code> to
          populate Jelling 2026.
        </p>
      </div>
    );
  }

  const { festival, sections, completion, counts } = overview.data!;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Link href={`/festivals/${slug}`} className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827]">
          <ArrowLeft className="w-4 h-4" />
          Back to festival dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">
          {festival.name} <span className="text-[#6b7280] font-normal">· Operations Plan</span>
        </h1>
        <p className="text-sm text-[#6b7280] mt-1">
          {new Date(festival.startDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
          {" – "}
          {new Date(festival.endDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {festival.location ? ` · ${festival.location}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountTile label="Concepts" value={counts.concepts} />
        <CountTile label="Staff" value={counts.staff} />
        <CountTile label="Shifts" value={counts.shifts} />
        <CountTile label="Action items" value={counts.actionItems} />
        <CountTile label="Vehicles" value={counts.vehicles} />
        <CountTile label="Accommodation" value={counts.accommodation} />
        <CountTile label="BC trolleys" value={counts.trolleys} />
        <CountTile label="Answers" value={counts.answers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => {
          const c = completion[section.key];
          const pct = c ? Math.round(c.ratio * 100) : 0;
          const target = section.subEditorRoute
            ? section.subEditorRoute.replace(":slug", slug)
            : `/festivals/${slug}/sections/${section.key}`;
          return (
            <Link key={section.id} href={target}>
              <Card className="cursor-pointer hover:border-[#111827] transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{section.title}</span>
                    <ChevronRight className="w-4 h-4 text-[#6b7280]" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs text-[#6b7280] tabular-nums w-12 text-right">
                      {c ? `${c.answered}/${c.total}` : "–"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {section.category}
                    </Badge>
                    {section.subEditorRoute && (
                      <Badge variant="secondary" className="text-xs">
                        sub-editor
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[#e5e7eb] bg-white p-3">
      <div className="text-xs text-[#6b7280]">{label}</div>
      <div className="text-xl font-semibold text-[#111827] mt-1 tabular-nums">
        {value}
      </div>
    </div>
  );
}
