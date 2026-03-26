import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { fetchEmails, testConnection, sendEmail } from "./emailService";
import { classifyEmail, generateDraftReply, scoreTaskUrgency, computeEscalation } from "./aiService";
import { sendWhatsAppMessage } from "./whatsappService";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  emailAccount: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const account = await db.getEmailAccount(ctx.user.id);
      if (!account) return null;
      return {
        id: account.id,
        emailAddress: account.emailAddress,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
        smtpHost: account.smtpHost,
        smtpPort: account.smtpPort,
        isActive: account.isActive,
        lastSyncAt: account.lastSyncAt,
      };
    }),
    save: protectedProcedure
      .input(z.object({
        emailAddress: z.string().email(),
        password: z.string().min(1),
        imapHost: z.string().default("imap.one.com"),
        imapPort: z.number().default(993),
        smtpHost: z.string().default("send.one.com"),
        smtpPort: z.number().default(465),
      }))
      .mutation(async ({ ctx, input }) => {
        const connected = await testConnection({
          emailAddress: input.emailAddress,
          password: input.password,
          imapHost: input.imapHost,
          imapPort: input.imapPort,
        });
        if (!connected) {
          throw new Error("Could not connect to email server. Please check your credentials.");
        }
        const accountId = await db.upsertEmailAccount({
          userId: ctx.user.id,
          emailAddress: input.emailAddress,
          password: input.password,
          imapHost: input.imapHost,
          imapPort: input.imapPort,
          smtpHost: input.smtpHost,
          smtpPort: input.smtpPort,
        });
        return { success: true, accountId };
      }),
    testConnection: protectedProcedure.mutation(async ({ ctx }) => {
      const account = await db.getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured");
      const connected = await testConnection({
        emailAddress: account.emailAddress,
        password: account.password,
        imapHost: account.imapHost,
        imapPort: account.imapPort,
      });
      return { connected };
    }),
  }),

  email: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getEmailsByUser(ctx.user.id, input?.limit || 50);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const email = await db.getEmailById(input.id, ctx.user.id);
        if (!email) throw new Error("Email not found");
        if (!email.isRead) await db.markEmailRead(email.id);
        const drafts = await db.getDraftsByEmail(email.id, ctx.user.id);
        return { ...email, drafts };
      }),
    sync: protectedProcedure
      .input(z.object({ fullResync: z.boolean().optional() }).optional())
      .mutation(async ({ ctx, input }) => {
      const account = await db.getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured. Go to Settings to add your email.");
      // March 1, 2026 as the absolute earliest date
      const CATCHUP_DATE = new Date("2026-03-01T00:00:00Z");
      const isFullResync = input?.fullResync === true;
      // For full resync: always go back to CATCHUP_DATE
      // For regular sync: use lastSyncAt but never newer than CATCHUP_DATE as minimum
      const sinceDate = isFullResync ? CATCHUP_DATE : (account.lastSyncAt && account.lastSyncAt > CATCHUP_DATE ? account.lastSyncAt : CATCHUP_DATE);
      console.log(`[Sync] Starting ${isFullResync ? 'FULL ' : ''}email sync for user ${ctx.user.id}, account: ${account.emailAddress}`);
      console.log(`[Sync] Fetching emails since: ${sinceDate.toISOString()}`);
      let fetched;
      try {
        fetched = await fetchEmails(account, 500, sinceDate);
      } catch (fetchErr) {
        console.error("[Sync] Email fetch failed:", fetchErr);
        throw new Error(`Email sync failed: ${(fetchErr as Error).message}. Please check your email credentials in Settings.`);
      }
      console.log(`[Sync] Fetched ${fetched.length} emails, processing...`);
      // Safe date parser — returns undefined for invalid dates instead of crashing
      const safeParseDueDate = (dateStr: string | null | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return undefined;
          return d;
        } catch {
          return undefined;
        }
      };
      let newCount = 0;
      for (const email of fetched) {
        if (email.messageId && await db.emailExistsByMessageId(email.messageId, ctx.user.id)) continue;
        const emailId = await db.insertEmail({
          userId: ctx.user.id,
          accountId: account.id,
          messageId: email.messageId,
          uid: email.uid,
          subject: email.subject,
          fromAddress: email.fromAddress,
          fromName: email.fromName,
          toAddress: email.toAddress,
          body: email.body,
          bodyHtml: email.bodyHtml,
          receivedAt: email.receivedAt,
        });
        newCount++;
        try {
          const classification = await classifyEmail(email.subject, email.body, email.fromAddress, email.fromName);
          await db.updateEmailClassification(emailId, {
            classification: classification.classification,
            aiSummary: classification.summary,
            aiAnalysis: classification,
            isProcessed: true,
          });
          // STRICT 1:1 RULE: EVERY email MUST create exactly one task
          const td = classification.taskData;
          const inv = classification.invoiceData;
          const isInvoice = classification.classification === "invoice";
          const urg = classification.urgency;
          const taskId = await db.insertTask({
            userId: ctx.user.id,
            emailId,
            title: isInvoice && inv
              ? `Invoice: ${inv.vendor} - ${inv.amount}`
              : td?.title || `Review: ${email.subject || 'Untitled email'}`,
            description: isInvoice && inv
              ? `${inv.action}\n\nInvoice #${inv.invoiceNumber}\nDue: ${inv.dueDate}\n\n${td?.description || ''}`
              : td?.description || `Email from ${email.fromName || email.fromAddress}. Please review.`,
            priority: isInvoice ? "high" : (td?.priority || "medium"),
            category: isInvoice ? "invoice" : (td?.category || "correspondence"),
            dueDate: isInvoice && inv
              ? safeParseDueDate(inv.dueDate)
              : safeParseDueDate(td?.dueDate),
            source: "email",
          });
          // Save urgency scores if available
          if (urg && taskId) {
            await db.updateTaskUrgency(taskId, ctx.user.id, {
              urgencyScore: urg.urgencyScore,
              importanceScore: urg.importanceScore,
              priorityScore: Math.round(urg.priorityScore * 10),
              quadrant: urg.quadrant,
              suggestedAction: urg.suggestedAction,
              isOverdue: urg.deadlineDate ? new Date(urg.deadlineDate) < new Date() : false,
            });
          }
        } catch (aiErr) {
          console.error("[AI] Classification failed for email:", emailId, aiErr);
          // Fallback: create a basic task even if AI fails
          try {
            await db.insertTask({
              userId: ctx.user.id,
              emailId,
              title: `Review: ${email.subject || 'Untitled email'}`,
              description: `Email from ${email.fromName || email.fromAddress}. AI classification failed — please review manually.`,
              priority: "medium",
              category: "correspondence",
              source: "email",
            });
          } catch (fallbackErr) {
            console.error("[AI] Fallback task creation also failed:", emailId, fallbackErr);
          }
        }
      }
      await db.updateLastSync(account.id);
      console.log(`[Sync] Sync complete: ${newCount} new emails out of ${fetched.length} fetched`);
      return { synced: newCount, total: fetched.length };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmailStats(ctx.user.id);
    }),
    reclassifyAll: protectedProcedure.mutation(async ({ ctx }) => {
      console.log(`[Reclassify] Starting full reclassification for user ${ctx.user.id}`);
      // Step 1: Delete all existing tasks
      await db.deleteAllTasksByUser(ctx.user.id);
      console.log(`[Reclassify] Deleted all old tasks`);
      // Step 2: Get all emails
      const allEmails = await db.getAllEmailsByUser(ctx.user.id);
      console.log(`[Reclassify] Processing ${allEmails.length} emails...`);
      // Safe date parser
      const safeParseDueDate = (dateStr: string | null | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return undefined;
          return d;
        } catch {
          return undefined;
        }
      };
      let classified = 0;
      let failed = 0;
      // Step 3: Re-classify each email and create exactly one task per email
      for (const email of allEmails) {
        try {
          const classification = await classifyEmail(
            email.subject || "",
            email.body || "",
            email.fromAddress || "",
            email.fromName || ""
          );
          await db.updateEmailClassification(email.id, {
            classification: classification.classification,
            aiSummary: classification.summary,
            aiAnalysis: classification,
            isProcessed: true,
          });
          // Create exactly ONE task per email
          await db.insertTask({
            userId: ctx.user.id,
            emailId: email.id,
            title: classification.classification === "invoice" && classification.invoiceData
              ? `Invoice: ${classification.invoiceData.vendor} - ${classification.invoiceData.amount}`
              : classification.taskData.title,
            description: classification.classification === "invoice" && classification.invoiceData
              ? `${classification.invoiceData.action}\n\nInvoice #${classification.invoiceData.invoiceNumber}\nDue: ${classification.invoiceData.dueDate}\n\n${classification.taskData.description}`
              : classification.taskData.description,
            priority: classification.classification === "invoice" ? "high" : classification.taskData.priority,
            category: classification.classification === "invoice" ? "invoice" : classification.taskData.category,
            dueDate: classification.classification === "invoice" && classification.invoiceData
              ? safeParseDueDate(classification.invoiceData.dueDate)
              : safeParseDueDate(classification.taskData.dueDate),
            source: "email",
          });
          classified++;
          if (classified % 10 === 0) console.log(`[Reclassify] Progress: ${classified}/${allEmails.length}`);
        } catch (aiErr) {
          console.error(`[Reclassify] Failed for email ${email.id}:`, aiErr);
          // Fallback: still create a task so 1:1 match is maintained
          try {
            await db.updateEmailClassification(email.id, {
              classification: "task",
              aiSummary: "AI classification failed — review manually",
              aiAnalysis: {},
              isProcessed: true,
            });
            await db.insertTask({
              userId: ctx.user.id,
              emailId: email.id,
              title: `Review: ${email.subject || 'Untitled email'}`,
              description: `Email from ${email.fromName || email.fromAddress}. AI classification failed — please review manually.`,
              priority: "medium",
              category: "correspondence",
              source: "email",
            });
          } catch (fallbackErr) {
            console.error(`[Reclassify] Fallback also failed for email ${email.id}:`, fallbackErr);
          }
          failed++;
        }
      }
      console.log(`[Reclassify] Complete: ${classified} classified, ${failed} failed, ${allEmails.length} total`);
      return { total: allEmails.length, classified, failed };
    }),
    accounting: protectedProcedure.query(async ({ ctx }) => {
      return db.getAccountingSummary(ctx.user.id);
    }),
  }),

  draft: router({
    generate: protectedProcedure
      .input(z.object({ emailId: z.number(), instructions: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const email = await db.getEmailById(input.emailId, ctx.user.id);
        if (!email) throw new Error("Email not found");
        const replyBody = await generateDraftReply(
          email.subject || "",
          email.body || "",
          email.fromName || email.fromAddress || "",
          email.classification || "general",
          email.aiSummary || "",
          input.instructions
        );
        const draftId = await db.insertDraft({
          userId: ctx.user.id,
          emailId: email.id,
          subject: `Re: ${email.subject || ""}`,
          body: replyBody,
          toAddress: email.fromAddress || "",
        });
        return { draftId, body: replyBody };
      }),
    update: protectedProcedure
      .input(z.object({ draftId: z.number(), body: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDraftBody(input.draftId, ctx.user.id, input.body);
        return { success: true };
      }),
    approve: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDraftStatus(input.draftId, ctx.user.id, "approved");
        return { success: true };
      }),
    reject: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateDraftStatus(input.draftId, ctx.user.id, "rejected");
        return { success: true };
      }),
    send: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const draft = await db.getDraftById(input.draftId, ctx.user.id);
        if (!draft) throw new Error("Draft not found");
        const account = await db.getEmailAccount(ctx.user.id);
        if (!account) throw new Error("No email account configured");
        const email = await db.getEmailById(draft.emailId, ctx.user.id);
        await sendEmail(account, draft.toAddress, draft.subject || "", draft.body, email?.messageId || undefined);
        await db.updateDraftStatus(input.draftId, ctx.user.id, "sent");
        return { success: true };
      }),
    pending: protectedProcedure.query(async ({ ctx }) => {
      return db.getDraftsByUser(ctx.user.id);
    }),
  }),

  whatsapp: router({
    messages: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getWhatsAppMessagesByUser(ctx.user.id, input?.limit || 100);
      }),
    getMessage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const msg = await db.getWhatsAppMessageById(input.id, ctx.user.id);
        if (!msg) throw new Error("Message not found");
        const drafts = await db.getWhatsAppDraftsByMessage(msg.id, ctx.user.id);
        return { ...msg, drafts };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getWhatsAppStats(ctx.user.id);
    }),
    accounting: protectedProcedure.query(async ({ ctx }) => {
      return db.getWhatsAppAccounting(ctx.user.id);
    }),
    pendingDrafts: protectedProcedure.query(async ({ ctx }) => {
      return db.getWhatsAppPendingDrafts(ctx.user.id);
    }),
    updateDraft: protectedProcedure
      .input(z.object({ draftId: z.number(), replyText: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateWhatsAppDraftText(input.draftId, ctx.user.id, input.replyText);
        return { success: true };
      }),
    approveDraft: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateWhatsAppDraftStatus(input.draftId, ctx.user.id, "approved");
        return { success: true };
      }),
    rejectDraft: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.updateWhatsAppDraftStatus(input.draftId, ctx.user.id, "rejected");
        return { success: true };
      }),
    sendDraft: protectedProcedure
      .input(z.object({ draftId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const draft = await db.getWhatsAppDraftById(input.draftId, ctx.user.id);
        if (!draft) throw new Error("Draft not found");
        await sendWhatsAppMessage(draft.toPhone, draft.replyText, draft.originalWaMessageId || undefined);
        await db.updateWhatsAppDraftStatus(input.draftId, ctx.user.id, "sent");
        return { success: true };
      }),
  }),

  employee: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmployeesByUser(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        phone: z.string().min(1),
        name: z.string().min(1),
        role: z.string().optional(),
        department: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.upsertEmployee({
          userId: ctx.user.id,
          phone: input.phone,
          name: input.name,
          role: input.role,
          department: input.department,
        });
        return { id };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteEmployee(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  task: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTasksByUser(ctx.user.id, input?.limit || 100);
      }),
    prioritized: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTasksByUserPrioritized(ctx.user.id, input?.limit || 200);
      }),
    byQuadrant: protectedProcedure
      .input(z.object({ quadrant: z.enum(["do_first", "schedule", "delegate", "archive"]) }))
      .query(async ({ ctx, input }) => {
        return db.getTasksByQuadrant(ctx.user.id, input.quadrant);
      }),
    priorityDistribution: protectedProcedure.query(async ({ ctx }) => {
        return db.getPriorityDistribution(ctx.user.id);
      }),
    reprioritize: protectedProcedure.mutation(async ({ ctx }) => {
        console.log(`[Reprioritize] Starting for user ${ctx.user.id}`);
        const pendingTasks = await db.getPendingTasksForReprioritization(ctx.user.id);
        let updated = 0;
        let failed = 0;
        for (const task of pendingTasks) {
          try {
            // First apply rule-based escalation
            const escalation = computeEscalation({
              dueDate: task.dueDate,
              createdAt: task.createdAt,
              status: task.status,
              urgencyScore: task.urgencyScore,
              escalationLevel: task.escalationLevel,
            });
            // Then re-score with AI
            const scoring = await scoreTaskUrgency(
              task.title,
              task.description || "",
              task.dueDate ? task.dueDate.toISOString().split("T")[0] : null,
              task.category || "other",
              task.createdAt.toISOString().split("T")[0]
            );
            // Apply escalation boost to urgency
            const finalUrgency = Math.min(10, scoring.urgencyScore + escalation.urgencyBoost);
            const finalPriorityScore = finalUrgency * 0.6 + scoring.importanceScore * 0.4;
            const finalQuadrant = finalUrgency >= 6 && scoring.importanceScore >= 6 ? "do_first" as const
              : finalUrgency < 6 && scoring.importanceScore >= 6 ? "schedule" as const
              : finalUrgency >= 6 && scoring.importanceScore < 6 ? "delegate" as const
              : "archive" as const;
            await db.updateTaskUrgency(task.id, ctx.user.id, {
              urgencyScore: finalUrgency,
              importanceScore: scoring.importanceScore,
              priorityScore: Math.round(finalPriorityScore * 10),
              quadrant: finalQuadrant,
              escalationLevel: escalation.newEscalationLevel,
              suggestedAction: scoring.suggestedAction,
              isOverdue: escalation.isOverdue,
            });
            updated++;
            if (updated % 10 === 0) console.log(`[Reprioritize] Progress: ${updated}/${pendingTasks.length}`);
          } catch (err) {
            console.error(`[Reprioritize] Failed for task ${task.id}:`, err);
            failed++;
          }
        }
        console.log(`[Reprioritize] Complete: ${updated} updated, ${failed} failed`);
        return { total: pendingTasks.length, updated, failed };
      }),
    snooze: protectedProcedure
      .input(z.object({ taskId: z.number(), hours: z.number().default(24) }))
      .mutation(async ({ ctx, input }) => {
        const until = new Date(Date.now() + input.hours * 60 * 60 * 1000);
        await db.snoozeTask(input.taskId, ctx.user.id, until);
        return { success: true, snoozedUntil: until };
      }),
    create: protectedProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        category: z.string().optional(),
        dueDate: z.number().optional(),
        source: z.enum(["email", "whatsapp", "manual"]).default("manual"),
      }))
      .mutation(async ({ ctx, input }) => {
        const taskId = await db.insertTask({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          priority: input.priority,
          category: input.category,
          dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
          source: input.source,
        });
        return { taskId };
      }),
    updateStatus: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        status: z.enum(["pending", "in_progress", "completed", "dismissed"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskStatus(input.taskId, ctx.user.id, input.status);
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getTaskStats(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
