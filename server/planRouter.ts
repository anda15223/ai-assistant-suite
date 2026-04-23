import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import * as pdb from "./planDb";
import { sendSectionChatMessage } from "./sectionPageChat";

/**
 * Festival Planner tRPC router.
 *
 * Mount path: `plan.*` on the root appRouter. Protected procedures require
 * an authenticated session. Admin procedures gate the master-schema
 * mutations (sections + questions) — the same admin check the rest of the
 * app uses via adminProcedure.
 */

const questionKind = z.enum([
  "single_select",
  "multi_select",
  "text",
  "number",
  "date",
  "datetime",
]);

const questionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const planRouter = router({
  // ===== FESTIVALS =====
  festival: router({
    list: protectedProcedure.query(async () => {
      return pdb.listFestivals();
    }),

    bySlug: protectedProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const festival = await pdb.getFestivalBySlug(input.slug);
        if (!festival) throw new TRPCError({ code: "NOT_FOUND", message: "Festival not found" });
        return festival;
      }),

    overview: protectedProcedure
      .input(z.object({ slug: z.string().min(1) }))
      .query(async ({ input }) => {
        const festival = await pdb.getFestivalBySlug(input.slug);
        if (!festival) throw new TRPCError({ code: "NOT_FOUND", message: "Festival not found" });
        const [sections, completion, counts] = await Promise.all([
          pdb.listSections(),
          pdb.sectionCompletion(festival.id),
          pdb.countPlannerRows(festival.id),
        ]);
        return { festival, sections, completion, counts };
      }),

    create: protectedProcedure
      .input(
        z.object({
          slug: z
            .string()
            .min(2)
            .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, or hyphens"),
          name: z.string().min(1),
          year: z.number().int().min(2020).max(2100),
          startDate: z.string(),
          endDate: z.string(),
          location: z.string().optional(),
          organiserName: z.string().optional(),
          organiserPhone: z.string().optional(),
          organiserEmail: z.string().email().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const existing = await pdb.getFestivalBySlug(input.slug);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" });
        const orgId = await pdb.ensureDefaultOrg();
        const id = await pdb.insertFestival({
          orgId,
          slug: input.slug,
          name: input.name,
          year: input.year,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          location: input.location,
          organiserName: input.organiserName,
          organiserPhone: input.organiserPhone,
          organiserEmail: input.organiserEmail,
          status: "planning",
        });
        return { id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int(),
          patch: z.object({
            name: z.string().optional(),
            location: z.string().optional(),
            organiserName: z.string().optional(),
            organiserPhone: z.string().optional(),
            organiserEmail: z.string().optional(),
            status: z.enum(["planning", "active", "complete"]).optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
          }),
        }),
      )
      .mutation(async ({ input }) => {
        const patch: Record<string, unknown> = { ...input.patch };
        if (input.patch.startDate) patch.startDate = new Date(input.patch.startDate);
        if (input.patch.endDate) patch.endDate = new Date(input.patch.endDate);
        await pdb.updateFestival(input.id, patch);
        return { success: true };
      }),
  }),

  // ===== SECTIONS (master schema) =====
  section: router({
    list: protectedProcedure.query(async () => {
      return pdb.listSections();
    }),

    create: adminProcedure
      .input(
        z.object({
          key: z.string().min(1),
          title: z.string().min(1),
          description: z.string().optional(),
          orderIndex: z.number().int(),
          category: z.string().min(1),
          subEditorRoute: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const id = await pdb.insertSection(input);
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number().int(),
          patch: z.object({
            title: z.string().optional(),
            description: z.string().optional(),
            orderIndex: z.number().int().optional(),
            category: z.string().optional(),
            subEditorRoute: z.string().optional(),
          }),
        }),
      )
      .mutation(async ({ input }) => {
        await pdb.updateSection(input.id, input.patch);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await pdb.deleteSection(input.id);
        return { success: true };
      }),

    // Per-section AI chat — Claude tool-loop that can update scalar answers,
    // create action items, and (if the section has a SmartCard) mutate that
    // card's lines and file warnings. Stateless: no chat history is stored
    // on the server; the client passes the last ~12 turns with each send.
    chat: router({
      send: protectedProcedure
        .input(
          z.object({
            festivalId: z.number().int().positive(),
            sectionKey: z.string().min(1),
            message: z.string().min(1).max(5000),
            history: z
              .array(
                z.object({
                  role: z.enum(["user", "assistant"]),
                  content: z.string(),
                }),
              )
              .optional(),
          }),
        )
        .mutation(async ({ input }) => {
          try {
            return await sendSectionChatMessage({
              festivalId: input.festivalId,
              sectionKey: input.sectionKey,
              message: input.message,
              history: input.history ?? [],
            });
          } catch (err) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: err instanceof Error ? err.message : String(err),
            });
          }
        }),
    }),
  }),

  // ===== QUESTIONS (master schema) =====
  question: router({
    list: protectedProcedure
      .input(z.object({ sectionId: z.number().int().optional() }).optional())
      .query(async ({ input }) => {
        return pdb.listQuestions(input?.sectionId);
      }),

    create: adminProcedure
      .input(
        z.object({
          sectionId: z.number().int(),
          key: z.string().min(1),
          prompt: z.string().min(1),
          kind: questionKind,
          options: z.array(questionOptionSchema).optional(),
          helpText: z.string().optional(),
          required: z.boolean().optional(),
          orderIndex: z.number().int(),
        }),
      )
      .mutation(async ({ input }) => {
        const id = await pdb.insertQuestion({
          sectionId: input.sectionId,
          key: input.key,
          prompt: input.prompt,
          kind: input.kind,
          options: input.options ?? null,
          helpText: input.helpText ?? null,
          required: input.required ?? false,
          orderIndex: input.orderIndex,
        });
        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.number().int(),
          patch: z.object({
            prompt: z.string().optional(),
            kind: questionKind.optional(),
            options: z.array(questionOptionSchema).nullable().optional(),
            helpText: z.string().nullable().optional(),
            required: z.boolean().optional(),
            orderIndex: z.number().int().optional(),
          }),
        }),
      )
      .mutation(async ({ input }) => {
        await pdb.updateQuestion(input.id, input.patch);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await pdb.deleteQuestion(input.id);
        return { success: true };
      }),
  }),

  // ===== ANSWERS =====
  answer: router({
    listByFestival: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listAnswersByFestival(input.festivalId);
      }),

    upsert: protectedProcedure
      .input(
        z.object({
          festivalId: z.number().int(),
          questionId: z.number().int(),
          valueType: questionKind,
          // Zod doesn't do "any JSON" cleanly; accept unknown and trust the
          // section editor client-side (it already validates kind + shape).
          value: z.unknown(),
        }),
      )
      .mutation(async ({ input }) => {
        const id = await pdb.upsertAnswer({
          festivalId: input.festivalId,
          questionId: input.questionId,
          valueType: input.valueType,
          value: input.value as unknown as object,
        });
        return { id };
      }),
  }),

  // ===== CONCEPTS =====
  concept: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listConcepts(input.festivalId);
      }),
  }),

  // ===== STAFF =====
  staff: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listStaff(input.festivalId);
      }),
  }),

  // ===== VAGTPLAN =====
  shift: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listVagtplanShifts(input.festivalId);
      }),
    totalHours: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return { hours: await pdb.totalVagtplanHours(input.festivalId) };
      }),
  }),

  // ===== ACTION ITEMS =====
  actionItem: router({
    list: protectedProcedure
      .input(
        z.object({
          festivalId: z.number().int(),
          sectionKey: z.string().optional(),
        }),
      )
      .query(async ({ input }) => {
        return pdb.listActionItems(input.festivalId, input.sectionKey);
      }),
  }),

  // ===== VEHICLES / ACCOMMODATION / TROLLEYS =====
  vehicle: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listVehicles(input.festivalId);
      }),
  }),

  accommodation: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listAccommodation(input.festivalId);
      }),
  }),

  trolley: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int() }))
      .query(async ({ input }) => {
        return pdb.listBcTrolleys(input.festivalId);
      }),
  }),
});
