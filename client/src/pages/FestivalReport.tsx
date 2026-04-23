import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

/**
 * Festival Operations Plan PDF.
 *
 * Generated entirely in the browser via `@react-pdf/renderer`. Fetches all
 * the data for the festival via the existing tRPC queries, then renders a
 * cover page + one page per section, plus staffing and transportation
 * detail pages.
 */

type Props = { slug: string };

// ===== Styles =====

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  cover: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 12, color: "#555", textAlign: "center" },
  h1: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 18,
    marginBottom: 8,
    borderBottom: "1pt solid #ccc",
    paddingBottom: 4,
  },
  h2: { fontSize: 12, fontWeight: "bold", marginTop: 12, marginBottom: 6 },
  row: { flexDirection: "row", borderBottom: "0.5pt solid #eee", paddingVertical: 3 },
  label: { width: 180, color: "#666" },
  value: { flex: 1 },
  th: { padding: 4, fontWeight: "bold", fontSize: 9, backgroundColor: "#eee" },
  td: { padding: 4, fontSize: 9, borderBottom: "0.5pt solid #eee" },
  small: { fontSize: 9, color: "#666" },
  conceptBox: { marginTop: 8, padding: 6, border: "0.5pt solid #ccc" },
  cardSection: { marginTop: 6, padding: 4, border: "0.5pt solid #ddd" },
});

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return String(d);
  }
}

type ReportData = {
  festival: any;
  sections: any[];
  questions: any[];
  answers: any[];
  concepts: any[];
  staff: any[];
  shifts: any[];
  actionItems: any[];
  vehicles: any[];
  accommodation: any[];
  smartCards: any[];
};

// ===== Document =====

function ReportDoc({ data }: { data: ReportData }) {
  const {
    festival,
    sections,
    questions,
    answers,
    concepts,
    staff,
    shifts,
    actionItems,
    vehicles,
    accommodation,
    smartCards,
  } = data;

  const ansByKey = (key: string): string => {
    const q = questions.find((x) => x.key === key);
    if (!q) return "—";
    const a = answers.find((x) => x.questionId === q.id);
    if (!a) return "—";
    if (Array.isArray(a.value)) return a.value.join(", ");
    if (a.value == null) return "—";
    return String(a.value);
  };

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.title}>{festival.name}</Text>
          <Text style={styles.subtitle}>
            {festival.year} · Operations Plan
          </Text>
          <Text style={[styles.subtitle, { marginTop: 12 }]}>
            {formatDate(festival.startDate)} – {formatDate(festival.endDate)}
          </Text>
          {festival.location ? (
            <Text style={styles.subtitle}>{festival.location}</Text>
          ) : null}
          {festival.organiserName ? (
            <Text style={[styles.small, { marginTop: 24 }]}>
              Organiser: {festival.organiserName}
              {festival.organiserPhone ? ` · ${festival.organiserPhone}` : ""}
              {festival.organiserEmail ? ` · ${festival.organiserEmail}` : ""}
            </Text>
          ) : null}
          <Text style={[styles.small, { marginTop: 8 }]}>
            Generated {new Date().toLocaleString()}
          </Text>
        </View>
      </Page>

      {/* One page per section */}
      {sections.map((sec: any) => {
        const qs = questions.filter((q) => q.sectionId === sec.id);
        const sectionActionItems = actionItems.filter(
          (a) => a.sectionKey === sec.key,
        );
        const cardsForSection = smartCards.filter((c) => c.cardKey === sec.key);

        return (
          <Page key={sec.id} size="A4" style={styles.page} wrap>
            <Text style={styles.h1}>
              {sec.orderIndex}. {sec.title}
            </Text>
            {sec.description ? <Text style={styles.small}>{sec.description}</Text> : null}

            {/* Section-specific data blocks */}
            {sec.key === "concepts" && concepts.length > 0 && (
              <View>
                {concepts.map((c: any) => (
                  <View key={c.id} style={styles.conceptBox}>
                    <Text style={styles.h2}>
                      {c.name} ({c.zone})
                    </Text>
                    {c.tentSize ? <Text style={styles.small}>{c.tentSize}</Text> : null}
                    {c.productsSold ? (
                      <Text style={[styles.small, { marginTop: 3 }]}>{c.productsSold}</Text>
                    ) : null}
                    <Text style={[styles.small, { marginTop: 3 }]}>
                      Hours — Thu {c.salesHoursThu || "—"} · Fri {c.salesHoursFri || "—"} · Sat{" "}
                      {c.salesHoursSat || "—"} · Sun {c.salesHoursSun || "—"}
                    </Text>
                    <Text style={styles.small}>
                      Power: {c.powerBaseline || "—"} · Gas: {c.gasRequired ? "Yes" : "No"} ·
                      Wristbands: {c.wristbandMax ?? "—"}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {sec.key === "staffing" && (
              <View>
                <Text style={styles.h2}>Headcount</Text>
                <Text style={styles.small}>
                  Total {staff.length} · {shifts.length} shifts
                </Text>
                {concepts.map((c: any) => {
                  const conceptShifts = shifts.filter((s) => s.conceptId === c.id);
                  if (conceptShifts.length === 0) return null;
                  return (
                    <View key={c.id} style={{ marginTop: 8 }}>
                      <Text style={styles.h2}>{c.name}</Text>
                      <View style={{ flexDirection: "row" }}>
                        <Text style={[styles.th, { flex: 2 }]}>Day</Text>
                        <Text style={[styles.th, { flex: 1 }]}>Shift</Text>
                        <Text style={[styles.th, { flex: 2 }]}>Time</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>People</Text>
                      </View>
                      {conceptShifts.map((s: any) => (
                        <View key={s.id} style={{ flexDirection: "row" }}>
                          <Text style={[styles.td, { flex: 2 }]}>
                            {s.day ? new Date(s.day).toLocaleDateString() : "—"}
                          </Text>
                          <Text style={[styles.td, { flex: 1 }]}>{s.shiftName}</Text>
                          <Text style={[styles.td, { flex: 2 }]}>
                            {s.startTime}–{s.endTime}
                          </Text>
                          <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>
                            {s.peopleCount}
                          </Text>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            )}

            {sec.key === "transportation" && (
              <View>
                {vehicles.length > 0 && (
                  <>
                    <Text style={styles.h2}>Vehicles</Text>
                    {vehicles.map((v: any) => (
                      <Text key={v.id} style={styles.small}>
                        • {v.label} ({v.vehicleType}) — {v.driver || "no driver"} · {v.status}
                      </Text>
                    ))}
                  </>
                )}
                {accommodation.length > 0 && (
                  <>
                    <Text style={[styles.h2, { marginTop: 8 }]}>Accommodation</Text>
                    {accommodation.map((a: any) => (
                      <Text key={a.id} style={styles.small}>
                        • {a.label} · {a.peopleCount ?? "—"} ppl ·{" "}
                        {a.roomConfig || "—"} · {a.status} ·{" "}
                        {formatDate(a.checkIn)} → {formatDate(a.checkOut)}
                      </Text>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* Scalar questions + answers */}
            {qs.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {qs.map((q: any) => (
                  <View key={q.id} style={styles.row}>
                    <Text style={styles.label}>{q.prompt}</Text>
                    <Text style={styles.value}>{ansByKey(q.key)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* SmartCard(s) for this section */}
            {cardsForSection.map((card: any) => (
              <View key={card.id} style={{ marginTop: 10 }}>
                <Text style={styles.h2}>{card.title ?? "SmartCard"}</Text>
                {card.sections.length === 0 && (
                  <Text style={styles.small}>No sections on this card yet.</Text>
                )}
                {card.sections.map((s: any) => (
                  <View key={s.id} style={styles.cardSection}>
                    <Text style={[styles.small, { fontWeight: "bold", fontSize: 10 }]}>
                      {s.title}
                    </Text>
                    {s.lines.map((l: any) => {
                      const parts = [
                        l.label && `${l.label}${l.value ? ":" : ""}`,
                        l.value,
                        l.quantity ? `× ${l.quantity}` : null,
                        l.notes ? `— ${l.notes}` : null,
                      ].filter(Boolean);
                      return (
                        <Text key={l.id} style={styles.small}>
                          • {parts.join(" ")}
                        </Text>
                      );
                    })}
                  </View>
                ))}
              </View>
            ))}

            {sectionActionItems.length > 0 && (
              <View
                style={{
                  marginTop: 12,
                  padding: 6,
                  border: "0.5pt solid #ccc",
                  backgroundColor: "#fafafa",
                }}
              >
                <Text style={styles.h2}>Action items — {sec.title}</Text>
                {sectionActionItems.map((i: any) => (
                  <Text key={i.id} style={styles.small}>
                    [{i.priority}] {i.deadline ? formatDate(i.deadline) : "no deadline"} —{" "}
                    {i.title} ({i.status})
                  </Text>
                ))}
              </View>
            )}
          </Page>
        );
      })}
    </Document>
  );
}

// ===== Page =====

export default function FestivalReport({ slug }: Props) {
  const overview = trpc.plan.festival.overview.useQuery({ slug });
  const festivalId = overview.data?.festival.id;

  const questions = trpc.plan.question.list.useQuery();
  const answers = trpc.plan.answer.listByFestival.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const concepts = trpc.plan.concept.list.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const staff = trpc.plan.staff.list.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const shifts = trpc.plan.shift.list.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const actionItems = trpc.plan.actionItem.list.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const vehicles = trpc.plan.vehicle.list.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const accommodation = trpc.plan.accommodation.list.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );
  const smartCards = trpc.smartCard.listByFestival.useQuery(
    { festivalId: festivalId ?? -1 },
    { enabled: festivalId != null },
  );

  const allLoading =
    overview.isLoading ||
    questions.isLoading ||
    answers.isLoading ||
    concepts.isLoading ||
    staff.isLoading ||
    shifts.isLoading ||
    actionItems.isLoading ||
    vehicles.isLoading ||
    accommodation.isLoading ||
    smartCards.isLoading;

  if (overview.isLoading) {
    return <div className="p-6 text-[#6b7280]">Loading…</div>;
  }
  if (!overview.data) {
    return <div className="p-6 text-red-600">Festival not found.</div>;
  }

  const data: ReportData | null =
    overview.data &&
    questions.data &&
    answers.data &&
    concepts.data &&
    staff.data &&
    shifts.data &&
    actionItems.data &&
    vehicles.data &&
    accommodation.data &&
    smartCards.data
      ? {
          festival: overview.data.festival,
          sections: overview.data.sections,
          questions: questions.data,
          answers: answers.data,
          concepts: concepts.data,
          staff: staff.data,
          shifts: shifts.data,
          actionItems: actionItems.data,
          vehicles: vehicles.data,
          accommodation: accommodation.data,
          smartCards: smartCards.data,
        }
      : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <Link
        href={`/festivals/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-[#6b7280] hover:text-[#111827]"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to festival
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Operations Plan Report</h1>
        <p className="text-sm text-[#6b7280] mt-1">
          Generate a downloadable PDF for {overview.data.festival.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDF Report</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-[#111827]">
              Cover · {overview.data.sections.length} sections ·{" "}
              {(actionItems.data?.length ?? 0)} action items ·{" "}
              {(concepts.data?.length ?? 0)} concepts · {(shifts.data?.length ?? 0)} shifts ·{" "}
              {(smartCards.data?.length ?? 0)} SmartCards
            </p>
            <p className="text-[11px] text-[#6b7280] mt-1">
              Generates in-browser — no data leaves your machine.
            </p>
          </div>
          {data && !allLoading ? (
            <PDFDownloadLink
              document={<ReportDoc data={data} />}
              fileName={`${overview.data.festival.slug}-operations-plan.pdf`}
            >
              {({ loading }) => (
                <Button size="sm" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-1.5" />
                  )}
                  {loading ? "Preparing…" : "Download PDF"}
                </Button>
              )}
            </PDFDownloadLink>
          ) : (
            <Button size="sm" disabled>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              Loading data…
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
