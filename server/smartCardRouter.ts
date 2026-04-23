import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as sdb from "./smartCardDb";
import { storagePut, storageDelete, storageGet } from "./storage";
import { extractSmartCardFile, dismissFileWarning, restoreFileWarning } from "./smartCardExtract";
import { sendChatMessage } from "./smartCardChat";

/**
 * SmartCard tRPC router — mount path `smartCard.*`.
 *
 * Covers the manual-editing surface of a SmartCard (card get-or-create,
 * sections + lines CRUD, todos, contacts, extra details). File upload,
 * AI extraction and per-card chat are deliberately NOT in chunk 1 —
 * they land in later sessions as the AI plumbing matures.
 */

const sectionSource = z.enum(["manual", "upload", "brain", "ai"]);
const lineSource = z.enum(["manual", "upload", "brain", "ai"]);
const todoStatus = z.enum(["open", "in_progress", "done", "blocked"]);

export const smartCardRouter = router({
  // ===== CARD =====
  getOrCreate: protectedProcedure
    .input(
      z.object({
        festivalId: z.number().int().positive(),
        cardKey: z.string().min(1),
        conceptId: z.number().int().positive().nullable().optional(),
        title: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return sdb.getOrCreateCard({
        festivalId: input.festivalId,
        cardKey: input.cardKey,
        conceptId: input.conceptId ?? null,
        title: input.title ?? null,
      });
    }),

  getFull: protectedProcedure
    .input(z.object({ cardId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const full = await sdb.getCardFull(input.cardId);
      if (!full) throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
      return full;
    }),

  // ===== SECTIONS =====
  addSection: protectedProcedure
    .input(
      z.object({
        cardId: z.number().int().positive(),
        title: z.string().min(1).default("New section"),
        description: z.string().optional(),
        source: sectionSource.default("manual"),
      }),
    )
    .mutation(async ({ input }) => {
      const orderIndex = await sdb.nextSectionOrderIndex(input.cardId);
      return sdb.addSection({
        cardId: input.cardId,
        title: input.title,
        description: input.description ?? null,
        orderIndex,
        source: input.source,
      });
    }),

  updateSection: protectedProcedure
    .input(
      z.object({
        sectionId: z.number().int().positive(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        orderIndex: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { sectionId, ...patch } = input;
      await sdb.updateSection(sectionId, patch);
      return { ok: true as const };
    }),

  deleteSection: protectedProcedure
    .input(z.object({ sectionId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await sdb.deleteSection(input.sectionId);
      return { ok: true as const };
    }),

  // ===== LINES =====
  addLine: protectedProcedure
    .input(
      z.object({
        sectionId: z.number().int().positive(),
        label: z.string().optional(),
        value: z.string().optional(),
        quantity: z.string().optional(),
        notes: z.string().optional(),
        source: lineSource.default("manual"),
      }),
    )
    .mutation(async ({ input }) => {
      const orderIndex = await sdb.nextLineOrderIndex(input.sectionId);
      return sdb.addLine({
        sectionId: input.sectionId,
        label: input.label ?? null,
        value: input.value ?? null,
        quantity: input.quantity ?? null,
        notes: input.notes ?? null,
        orderIndex,
        source: input.source,
      });
    }),

  updateLine: protectedProcedure
    .input(
      z.object({
        lineId: z.number().int().positive(),
        label: z.string().nullable().optional(),
        value: z.string().nullable().optional(),
        quantity: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(), // ISO date string
        orderIndex: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { lineId, dueDate, ...rest } = input;
      const patch: Parameters<typeof sdb.updateLine>[1] = { ...rest };
      if (dueDate !== undefined) {
        patch.dueDate = dueDate === null ? null : new Date(dueDate);
      }
      await sdb.updateLine(lineId, patch);
      return { ok: true as const };
    }),

  deleteLine: protectedProcedure
    .input(z.object({ lineId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await sdb.deleteLine(input.lineId);
      return { ok: true as const };
    }),

  // ===== TODOS =====
  addTodo: protectedProcedure
    .input(
      z.object({
        cardId: z.number().int().positive(),
        title: z.string().min(1),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        owner: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const orderIndex = await sdb.nextTodoOrderIndex(input.cardId);
      return sdb.addTodo({
        cardId: input.cardId,
        title: input.title,
        description: input.description ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        owner: input.owner ?? null,
        orderIndex,
      });
    }),

  updateTodo: protectedProcedure
    .input(
      z.object({
        todoId: z.number().int().positive(),
        title: z.string().optional(),
        description: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
        owner: z.string().nullable().optional(),
        status: todoStatus.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { todoId, dueDate, ...rest } = input;
      const patch: Parameters<typeof sdb.updateTodo>[1] = { ...rest };
      if (dueDate !== undefined) {
        patch.dueDate = dueDate === null ? null : new Date(dueDate);
      }
      await sdb.updateTodo(todoId, patch);
      return { ok: true as const };
    }),

  deleteTodo: protectedProcedure
    .input(z.object({ todoId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await sdb.deleteTodo(input.todoId);
      return { ok: true as const };
    }),

  // ===== CONTACTS =====
  contacts: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int().positive() }))
      .query(async ({ input }) => sdb.listContacts(input.festivalId)),

    add: protectedProcedure
      .input(
        z.object({
          festivalId: z.number().int().positive(),
          name: z.string().min(1).default(""),
          role: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          notes: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const existing = await sdb.listContacts(input.festivalId);
        const orderIndex = existing.length ? Math.max(...existing.map(c => c.orderIndex)) + 1 : 0;
        return sdb.addContact({
          festivalId: input.festivalId,
          name: input.name || "",
          role: input.role ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          notes: input.notes ?? null,
          orderIndex,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          name: z.string().optional(),
          role: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
          email: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { id, ...patch } = input;
        await sdb.updateContact(id, patch);
        return { ok: true as const };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await sdb.deleteContact(input.id);
        return { ok: true as const };
      }),
  }),

  // ===== EXTRA DETAILS =====
  extraDetails: router({
    list: protectedProcedure
      .input(z.object({ festivalId: z.number().int().positive() }))
      .query(async ({ input }) => sdb.listExtraDetails(input.festivalId)),

    add: protectedProcedure
      .input(z.object({ festivalId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const existing = await sdb.listExtraDetails(input.festivalId);
        const orderIndex = existing.length ? Math.max(...existing.map(d => d.orderIndex)) + 1 : 0;
        return sdb.addExtraDetail({
          festivalId: input.festivalId,
          label: "",
          value: null,
          notes: null,
          orderIndex,
        });
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          label: z.string().optional(),
          value: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { id, ...patch } = input;
        await sdb.updateExtraDetail(id, patch);
        return { ok: true as const };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await sdb.deleteExtraDetail(input.id);
        return { ok: true as const };
      }),
  }),

  // ===== FILES =====
  // Upload flow: client reads file → base64 → sends to `uploadFile`. Server
  // decodes, puts to S3, inserts smart_files row, returns it with a fresh
  // presigned GET URL. 30 MB hard limit enforced server-side (Express body
  // parser is capped at 50 MB so this leaves headroom for JSON overhead).
  file: router({
    upload: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          filename: z.string().min(1).max(512),
          mimeType: z.string().min(1).max(128),
          size: z.number().int().nonnegative().max(30 * 1024 * 1024, "File exceeds 30 MB limit"),
          base64: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Decode base64 (strip any data-URL prefix if present)
        const commaIdx = input.base64.indexOf(",");
        const raw = commaIdx >= 0 && input.base64.slice(0, commaIdx).includes("base64")
          ? input.base64.slice(commaIdx + 1)
          : input.base64;
        const buffer = Buffer.from(raw, "base64");
        if (buffer.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Empty file" });
        }
        if (buffer.length > 30 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File exceeds 30 MB limit" });
        }

        // Safe filename + deterministic S3 key
        const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
        const suffix = Math.random().toString(36).slice(2, 8);
        const s3Key = `smart-cards/${input.cardId}/${ctx.user.id}/${Date.now()}-${suffix}-${safeName}`;

        const { url } = await storagePut(s3Key, buffer, input.mimeType);

        // Insert DB row — parseStatus stays `pending` until AI extract (chunk 3) runs.
        const row = await sdb.addFile({
          cardId: input.cardId,
          s3Key,
          url, // cached presigned URL; refreshed on each getFull read
          filename: input.filename,
          mimeType: input.mimeType,
          size: buffer.length,
          parseStatus: "pending",
        });

        return { ...row, url };
      }),

    delete: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const file = await sdb.getFileById(input.fileId);
        if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        // Best-effort S3 delete; DB row must go even if S3 fails.
        try {
          await storageDelete(file.s3Key);
        } catch (e) {
          console.error("[SmartCardFile] S3 delete failed:", (e as Error).message);
        }
        await sdb.deleteFile(input.fileId);
        return { ok: true as const };
      }),

    // Generate a fresh 1-hour presigned GET URL for a file. Used by the UI
    // when a stale URL starts returning 403.
    refreshUrl: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .query(async ({ input }) => {
        const file = await sdb.getFileById(input.fileId);
        if (!file) throw new TRPCError({ code: "NOT_FOUND", message: "File not found" });
        const { url } = await storageGet(file.s3Key);
        return { url };
      }),

    // Run Claude Vision extraction on the file. Fills smart_sections +
    // smart_lines, updates parseStatus + warnings. Client should invalidate
    // `getFull` after this resolves.
    extract: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        try {
          return await extractSmartCardFile(input.fileId);
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }),

    // Mark a validation warning as "actually fine" with a user-supplied reason.
    dismissWarning: protectedProcedure
      .input(
        z.object({
          fileId: z.number().int().positive(),
          field: z.string().min(1),
          reason: z.string().min(1),
        }),
      )
      .mutation(async ({ input }) => {
        await dismissFileWarning(input.fileId, input.field, input.reason);
        return { ok: true as const };
      }),

    restoreWarning: protectedProcedure
      .input(z.object({ fileId: z.number().int().positive(), field: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await restoreFileWarning(input.fileId, input.field);
        return { ok: true as const };
      }),
  }),

  // ===== FESTIVAL-WIDE LIST (PDF report) =====
  listByFestival: protectedProcedure
    .input(z.object({ festivalId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return sdb.listCardsByFestival(input.festivalId);
    }),

  // ===== BRAIN-GRAB =====
  // Pull reusable knowledge from past festivals for this card type, then
  // let the user one-click-apply selected suggestions.
  brain: router({
    grab: protectedProcedure
      .input(
        z.object({
          cardKey: z.string().min(1),
          excludeFestivalId: z.number().int().positive().optional(),
          conceptId: z.number().int().positive().nullable().optional(),
        }),
      )
      .query(async ({ input }) => {
        return sdb.grabBrainSuggestions({
          cardKey: input.cardKey,
          excludeFestivalId: input.excludeFestivalId,
          conceptId: input.conceptId ?? null,
        });
      }),

    applySuggestions: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
          suggestions: z.array(
            z.object({
              title: z.string().min(1),
              lines: z.array(
                z.object({
                  label: z.string().min(1),
                  value: z.string().nullable().optional(),
                  quantity: z.string().nullable().optional(),
                  notes: z.string().nullable().optional(),
                }),
              ),
            }),
          ),
        }),
      )
      .mutation(async ({ input }) => {
        return sdb.applyBrainSuggestions({
          cardId: input.cardId,
          suggestions: input.suggestions,
        });
      }),
  }),

  // ===== CHAT =====
  // Per-card AI chat. Claude is given the card state as context and a
  // fixed tool set so it can mutate exactly this card via tool_use calls.
  chat: router({
    history: protectedProcedure
      .input(z.object({ cardId: z.number().int().positive(), limit: z.number().int().min(1).max(200).optional() }))
      .query(async ({ input }) => {
        const rows = await sdb.listChatMessages(input.cardId, input.limit ?? 50);
        return rows.map((r) => ({
          id: r.id,
          role: r.role,
          content: r.content,
          toolCalls: r.toolCalls,
          createdAt: r.createdAt,
        }));
      }),

    send: protectedProcedure
      .input(
        z.object({
          cardId: z.number().int().positive(),
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
        // Persist user message first
        await sdb.insertChatMessage({
          cardId: input.cardId,
          role: "user",
          content: input.message,
        });

        let result;
        try {
          result = await sendChatMessage({
            cardId: input.cardId,
            message: input.message,
            history: input.history ?? [],
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await sdb.insertChatMessage({
            cardId: input.cardId,
            role: "assistant",
            content: `(Chat failed: ${msg})`,
          });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg });
        }

        // Persist assistant reply
        await sdb.insertChatMessage({
          cardId: input.cardId,
          role: "assistant",
          content: result.reply,
          toolCalls: result.actions.length ? result.actions : null,
        });

        return result;
      }),
  }),
});
