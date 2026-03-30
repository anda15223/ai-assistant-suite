import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { fetchEmails, testConnection, sendEmail, fetchAttachmentsForEmail } from "./emailService";
import { storagePut } from "./storage";
import { classifyEmail, generateDraftReply, scoreTaskUrgency, computeEscalation, extractInvoiceDetails } from "./aiService";
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
        const linkedTasks = await db.getTasksByEmailId(email.id, ctx.user.id);
        return { ...email, drafts, linkedTasks };
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
        // Upload attachments to S3
        if (email.attachments && email.attachments.length > 0) {
          for (const att of email.attachments) {
            try {
              const suffix = Math.random().toString(36).substring(2, 8);
              const s3Key = `attachments/${ctx.user.id}/${emailId}/${suffix}-${att.filename}`;
              const { url } = await storagePut(s3Key, att.content, att.mimeType);
              await db.insertEmailAttachment({
                emailId,
                userId: ctx.user.id,
                filename: att.filename,
                mimeType: att.mimeType,
                size: att.size,
                s3Key,
                s3Url: url,
              });
              console.log(`[Sync] Uploaded attachment: ${att.filename} (${att.size} bytes) for email ${emailId}`);
            } catch (attErr) {
              console.error(`[Sync] Failed to upload attachment ${att.filename}:`, (attErr as Error).message);
            }
          }
        }
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
          // Save AI content category suggestion
          if (classification.contentCategory && taskId) {
            await db.updateTaskSuggestion(taskId, ctx.user.id, {
              suggestedCategory: classification.contentCategory.suggestedCategory,
              suggestionConfidence: Math.round(classification.contentCategory.confidence * 100),
              suggestionReasoning: classification.contentCategory.reasoning,
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
    // Returns how many emails still need tasks
    missingTaskCount: protectedProcedure.query(async ({ ctx }) => {
      const count = await db.countEmailsWithoutTasks(ctx.user.id);
      return { missing: count };
    }),
    // Process a small batch of emails that don't have tasks yet (5 at a time)
    classifyBatch: protectedProcedure.mutation(async ({ ctx }) => {
      const BATCH_SIZE = 5;
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
      const missingEmails = await db.getEmailsWithoutTasks(ctx.user.id, BATCH_SIZE);
      if (missingEmails.length === 0) {
        return { processed: 0, classified: 0, failed: 0, remaining: 0 };
      }
      let classified = 0;
      let failed = 0;
      // Process sequentially with a small delay between each to avoid quota
      for (const email of missingEmails) {
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
          console.log(`[ClassifyBatch] Classified email ${email.id} (${classified}/${missingEmails.length})`);
          // Small delay between API calls to avoid quota issues
          if (classified < missingEmails.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (aiErr: any) {
          const isQuotaError = aiErr?.message?.includes('usage exhausted') || aiErr?.message?.includes('429') || aiErr?.message?.includes('rate limit');
          if (isQuotaError) {
            console.warn(`[ClassifyBatch] API quota hit at email ${email.id}, stopping batch early`);
            // Create fallback task for this email
            try {
              await db.updateEmailClassification(email.id, { classification: "task", aiSummary: "AI classification failed — review manually", aiAnalysis: {}, isProcessed: true });
              await db.insertTask({ userId: ctx.user.id, emailId: email.id, title: `Review: ${email.subject || 'Untitled email'}`, description: `Email from ${email.fromName || email.fromAddress}. AI quota reached — please review manually.`, priority: "medium", category: "correspondence", source: "email" });
            } catch (_) { /* ignore fallback errors */ }
            failed++;
            // Stop processing this batch — let the frontend retry later
            break;
          }
          console.error(`[ClassifyBatch] Failed for email ${email.id}:`, aiErr);
          // Fallback: still create a task so 1:1 match is maintained
          try {
            await db.updateEmailClassification(email.id, { classification: "task", aiSummary: "AI classification failed — review manually", aiAnalysis: {}, isProcessed: true });
            await db.insertTask({ userId: ctx.user.id, emailId: email.id, title: `Review: ${email.subject || 'Untitled email'}`, description: `Email from ${email.fromName || email.fromAddress}. AI classification failed — please review manually.`, priority: "medium", category: "correspondence", source: "email" });
          } catch (fallbackErr) {
            console.error(`[ClassifyBatch] Fallback also failed for email ${email.id}:`, fallbackErr);
          }
          failed++;
        }
      }
      const remaining = await db.countEmailsWithoutTasks(ctx.user.id);
      console.log(`[ClassifyBatch] Batch done: ${classified} classified, ${failed} failed, ${remaining} remaining`);
      return { processed: missingEmails.length, classified, failed, remaining };
    }),
    // Legacy reclassifyAll — now just calls classifyBatch for emails without tasks (no delete)
    reclassifyAll: protectedProcedure.mutation(async ({ ctx }) => {
      const missing = await db.countEmailsWithoutTasks(ctx.user.id);
      return { total: missing, classified: 0, failed: 0, message: "Use the new batch processing button instead. It processes 5 emails at a time to avoid timeouts." };
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
        // Touch activity so the inactivity timer resets on any status change
        await db.touchTaskActivity(input.taskId, ctx.user.id);
        return { success: true };
      }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getTaskStats(ctx.user.id);
    }),

    // ===== AUTO-ARCHIVE FEATURE =====
    autoArchiveStats: protectedProcedure
      .input(z.object({ daysInactive: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        const days = input?.daysInactive || 30;
        return db.getAutoArchiveStats(ctx.user.id, days);
      }),
    autoArchivePreview: protectedProcedure
      .input(z.object({ daysInactive: z.number().min(1).max(365).default(30) }).optional())
      .query(async ({ ctx, input }) => {
        const days = input?.daysInactive || 30;
        const staleTasks = await db.getStaleArchiveTasks(ctx.user.id, days);
        return staleTasks.map(t => ({
          id: t.id,
          title: t.title,
          category: t.category,
          lastActivityAt: t.lastActivityAt,
          createdAt: t.createdAt,
          quadrant: t.quadrant,
          urgencyScore: t.urgencyScore,
          importanceScore: t.importanceScore,
        }));
      }),
    autoArchiveRun: protectedProcedure
      .input(z.object({ daysInactive: z.number().min(1).max(365).default(30) }).optional())
      .mutation(async ({ ctx, input }) => {
        const days = input?.daysInactive || 30;
        const staleTasks = await db.getStaleArchiveTasks(ctx.user.id, days);
        if (staleTasks.length === 0) return { archived: 0, taskIds: [] as number[] };
        const taskIds = staleTasks.map(t => t.id);
        const count = await db.autoArchiveTasks(taskIds, ctx.user.id);
        console.log(`[AutoArchive] Dismissed ${count} stale archive tasks for user ${ctx.user.id} (${days}-day threshold)`);
        return { archived: count, taskIds };
      }),
    touchActivity: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.touchTaskActivity(input.taskId, ctx.user.id);
        return { success: true };
      }),

    // ===== CATEGORY REASSIGNMENT =====
    updateCategory: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        category: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateTaskCategory(input.taskId, ctx.user.id, input.category);
        // Touch activity since user is interacting with this task
        await db.touchTaskActivity(input.taskId, ctx.user.id);
        console.log(`[CategoryUpdate] Task ${input.taskId} → "${input.category}" by user ${ctx.user.id}`);
        return { success: true, category: input.category };
      }),

    // ===== EMAIL LINK =====
    getEmailId: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        const emailId = await db.getTaskEmailId(input.taskId, ctx.user.id);
        return { emailId };
      }),

    // ===== AI CATEGORY SUGGESTIONS =====
    acceptSuggestion: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.acceptTaskSuggestion(input.taskId, ctx.user.id);
        console.log(`[Suggestion] Accepted for task ${input.taskId} by user ${ctx.user.id}`);
        return { success: true };
      }),

    rejectSuggestion: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.rejectTaskSuggestion(input.taskId, ctx.user.id);
        console.log(`[Suggestion] Rejected for task ${input.taskId} by user ${ctx.user.id}`);
        return { success: true };
      }),

    suggestionStats: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getSuggestionStats(ctx.user.id);
      }),
  }),

  // ===== INVOICE DASHBOARD =====
  invoice: router({
    // List all invoice emails (classified as invoice or matching keywords)
    listEmails: protectedProcedure.query(async ({ ctx }) => {
      return db.getInvoiceEmails(ctx.user.id);
    }),

    // List all extracted invoice details (with attachments for PDF links)
    list: protectedProcedure.query(async ({ ctx }) => {
      const invoices = await db.getInvoiceDetailsByUser(ctx.user.id);
      // Batch-fetch attachments for all invoice emailIds
      const emailIds = Array.from(new Set(invoices.map(i => i.emailId).filter(Boolean)));
      const allAttachments = emailIds.length > 0 ? await db.getAttachmentsByEmails(emailIds) : [];
      // Group attachments by emailId
      const attachmentMap = new Map<number, typeof allAttachments>();
      for (const att of allAttachments) {
        const list = attachmentMap.get(att.emailId) || [];
        list.push(att);
        attachmentMap.set(att.emailId, list);
      }
      return invoices.map(inv => ({
        ...inv,
        attachments: attachmentMap.get(inv.emailId) || [],
      }));
    }),

    // Get stats
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getInvoiceStats(ctx.user.id);
    }),

    // Extract invoice details from a specific email using AI
    extract: protectedProcedure
      .input(z.object({ emailId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Check if already extracted
        const existing = await db.getInvoiceDetailByEmailId(input.emailId);
        if (existing) return { invoiceId: existing.id, alreadyExtracted: true };

        // Get the email
        const email = await db.getEmailById(input.emailId, ctx.user.id);
        if (!email) throw new Error("Email not found");

        // Fetch attachments for this email
        const attachments = await db.getAttachmentsByEmail(input.emailId);
        const attachmentUrls = attachments
          .filter(a => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/"))
          .map(a => ({ url: a.s3Url, mimeType: a.mimeType, filename: a.filename }));

        // Extract using AI (with PDF attachments if available)
        const extraction = await extractInvoiceDetails(
          email.subject || "(No subject)",
          email.body || email.bodyHtml || "(No body)",
          email.fromAddress || "unknown",
          email.fromName || "Unknown",
          attachmentUrls.length > 0 ? attachmentUrls : undefined
        );

        // Find linked task
        const linkedTasks = await db.getTasksByEmailId(input.emailId, ctx.user.id);
        const taskId = linkedTasks.length > 0 ? linkedTasks[0].id : null;

        // Save to database
        const result = await db.insertInvoiceDetail({
          userId: ctx.user.id,
          emailId: input.emailId,
          taskId,
          supplier: extraction.supplier,
          invoiceNumber: extraction.invoiceNumber,
          amount: extraction.amount,
          currency: extraction.currency,
          paymentDate: extraction.paymentDate,
          dueDate: extraction.dueDate,
          products: extraction.products,
          lineItems: extraction.lineItems,
          invoiceType: extraction.invoiceType || "unknown",
          rawExtraction: extraction,
        });

        console.log(`[Invoice] Extracted details for email ${input.emailId}: ${extraction.supplier} ${extraction.amount} ${extraction.currency}`);
        return { invoiceId: result?.id, alreadyExtracted: false, extraction };
      }),

    // Batch extract: process multiple invoice emails at once (5 at a time)
    extractBatch: protectedProcedure.mutation(async ({ ctx }) => {
      const invoiceEmails = await db.getInvoiceEmails(ctx.user.id);
      let processed = 0;
      let skipped = 0;
      let failed = 0;

      for (const email of invoiceEmails.slice(0, 5)) {
        try {
          const existing = await db.getInvoiceDetailByEmailId(email.id);
          if (existing) { skipped++; continue; }

          // Fetch attachments for this email
          const attachments = await db.getAttachmentsByEmail(email.id);
          const attachmentUrls = attachments
            .filter(a => a.mimeType === "application/pdf" || a.mimeType.startsWith("image/"))
            .map(a => ({ url: a.s3Url, mimeType: a.mimeType, filename: a.filename }));

          const extraction = await extractInvoiceDetails(
            email.subject || "(No subject)",
            email.body || email.bodyHtml || "(No body)",
            email.fromAddress || "unknown",
            email.fromName || "Unknown",
            attachmentUrls.length > 0 ? attachmentUrls : undefined
          );

          const linkedTasks = await db.getTasksByEmailId(email.id, ctx.user.id);
          const taskId = linkedTasks.length > 0 ? linkedTasks[0].id : null;

          await db.insertInvoiceDetail({
            userId: ctx.user.id,
            emailId: email.id,
            taskId,
            supplier: extraction.supplier,
            invoiceNumber: extraction.invoiceNumber,
            amount: extraction.amount,
            currency: extraction.currency,
            paymentDate: extraction.paymentDate,
            dueDate: extraction.dueDate,
            products: extraction.products,
            lineItems: extraction.lineItems,
            invoiceType: extraction.invoiceType || "unknown",
            rawExtraction: extraction,
          });
          processed++;
        } catch (err: any) {
          console.error(`[Invoice] Failed to extract email ${email.id}:`, err.message);
          failed++;
        }
      }

      console.log(`[Invoice] Batch: ${processed} extracted, ${skipped} skipped, ${failed} failed`);
      return { processed, skipped, failed, totalInvoiceEmails: invoiceEmails.length };
    }),

    // Count how many invoice emails still need extraction
    pendingCount: protectedProcedure.query(async ({ ctx }) => {
      const invoiceEmails = await db.getInvoiceEmails(ctx.user.id);
      let needExtraction = 0;
      for (const email of invoiceEmails) {
        const existing = await db.getInvoiceDetailByEmailId(email.id);
        if (!existing) needExtraction++;
      }
      return { total: invoiceEmails.length, needExtraction };
    }),

    // Resync attachments: re-fetch invoice emails from IMAP to download PDF attachments
    resyncAttachments: protectedProcedure.mutation(async ({ ctx }) => {
      const account = await db.getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured.");

      // Get invoice emails that don't have attachments yet
      const invoiceEmails = await db.getInvoiceEmails(ctx.user.id);
      let uploaded = 0;
      let skipped = 0;
      let failed = 0;

      // Process up to 10 emails per batch to avoid timeout
      for (const email of invoiceEmails.slice(0, 10)) {
        try {
          // Check if attachments already exist
          const existing = await db.getAttachmentsByEmail(email.id);
          if (existing.length > 0) { skipped++; continue; }

          if (!email.messageId) { skipped++; continue; }

          // Re-fetch from IMAP to get attachments
          const attachments = await fetchAttachmentsForEmail(account, email.messageId);
          if (attachments.length === 0) { skipped++; continue; }

          for (const att of attachments) {
            const suffix = Math.random().toString(36).substring(2, 8);
            const s3Key = `attachments/${ctx.user.id}/${email.id}/${suffix}-${att.filename}`;
            const { url } = await storagePut(s3Key, att.content, att.mimeType);
            await db.insertEmailAttachment({
              emailId: email.id,
              userId: ctx.user.id,
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              s3Key,
              s3Url: url,
            });
            console.log(`[Attachments] Uploaded: ${att.filename} (${att.size} bytes) for email ${email.id}`);
          }
          uploaded++;
        } catch (err: any) {
          console.error(`[Attachments] Failed for email ${email.id}:`, err.message);
          failed++;
        }
      }

      return { uploaded, skipped, failed, total: invoiceEmails.length };
    }),

    // Delete an extraction so it can be re-processed (e.g., after attachments are available)
    deleteExtraction: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const database = await db.getDb();
        if (!database) throw new Error("Database not available");
        const { invoiceDetails: invTable } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        await database.delete(invTable).where(
          and(eq(invTable.id, input.invoiceId), eq(invTable.userId, ctx.user.id))
        );
        return { success: true };
      }),

    // Delete ALL extractions so they can be re-processed with PDF content
    deleteAllExtractions: protectedProcedure.mutation(async ({ ctx }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");
      const { invoiceDetails: invTable } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const result = await database.delete(invTable).where(eq(invTable.userId, ctx.user.id));
      return { deleted: (result as any)[0]?.affectedRows || 0 };
    }),

    // Get attachments for an email
    attachments: protectedProcedure
      .input(z.object({ emailId: z.number() }))
      .query(async ({ ctx, input }) => {
        return db.getAttachmentsByEmail(input.emailId);
      }),

    // Update invoice status
    updateStatus: protectedProcedure
      .input(z.object({
        invoiceId: z.number(),
        status: z.enum(["pending", "reviewed", "sent_to_economic", "paid", "rejected"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateInvoiceStatus(input.invoiceId, input.status);
        console.log(`[Invoice] Status updated: ${input.invoiceId} → ${input.status}`);
        return { success: true };
      }),

    // Send to e-conomic (placeholder — will use real API when configured)
    sendToEconomic: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Get the invoice details
        const invoices = await db.getInvoiceDetailsByUser(ctx.user.id);
        const invoice = invoices.find(i => i.id === input.invoiceId);
        if (!invoice) throw new Error("Invoice not found");

        // Check if supplier has e-conomic configured
        const supplier = await db.getSupplierByName(ctx.user.id, invoice.supplier);
        if (!supplier || !supplier.isConfigured) {
          throw new Error(`e-conomic not configured for supplier "${invoice.supplier}". Please configure it in Supplier Settings.`);
        }

        // TODO: Actual e-conomic API call will go here
        // For now, mark as sent and log
        await db.updateInvoiceStatus(input.invoiceId, "sent_to_economic", {
          sentAt: new Date().toISOString(),
          endpoint: supplier.eEconomicEndpoint,
          note: "Placeholder — actual API integration pending",
        });

        console.log(`[Invoice] Sent to e-conomic: ${invoice.supplier} #${invoice.invoiceNumber} → ${supplier.eEconomicEndpoint}`);
        return { success: true, supplier: invoice.supplier };
      }),

    // ===== SUPPLIER SETTINGS =====
    suppliers: protectedProcedure.query(async ({ ctx }) => {
      return db.getSupplierSettings(ctx.user.id);
    }),

    upsertSupplier: protectedProcedure
      .input(z.object({
        supplierName: z.string().min(1),
        supplierEmail: z.string().optional(),
        eEconomicEndpoint: z.string().optional(),
        eEconomicApiKey: z.string().optional(),
        eEconomicAgreement: z.string().optional(),
        isConfigured: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.upsertSupplierSetting({
          userId: ctx.user.id,
          ...input,
        });
        console.log(`[Supplier] Upserted: ${input.supplierName} (configured: ${input.isConfigured})`);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
