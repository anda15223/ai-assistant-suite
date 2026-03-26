import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { fetchEmails, testConnection, sendEmail } from "./emailService";
import { classifyEmail, generateDraftReply } from "./aiService";

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
    sync: protectedProcedure.mutation(async ({ ctx }) => {
      const account = await db.getEmailAccount(ctx.user.id);
      if (!account) throw new Error("No email account configured. Go to Settings to add your email.");
      console.log(`[Sync] Starting email sync for user ${ctx.user.id}, account: ${account.emailAddress}`);
      let fetched;
      try {
        fetched = await fetchEmails(account, 30, account.lastSyncAt || undefined);
      } catch (fetchErr) {
        console.error("[Sync] Email fetch failed:", fetchErr);
        throw new Error(`Email sync failed: ${(fetchErr as Error).message}. Please check your email credentials in Settings.`);
      }
      console.log(`[Sync] Fetched ${fetched.length} emails, processing...`);
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
          if (classification.classification === "task" && classification.taskData) {
            await db.insertTask({
              userId: ctx.user.id,
              emailId,
              title: classification.taskData.title,
              description: classification.taskData.description,
              priority: classification.taskData.priority,
              category: classification.taskData.category,
              dueDate: classification.taskData.dueDate ? new Date(classification.taskData.dueDate) : undefined,
              source: "email",
            });
          }
          if (classification.classification === "invoice" && classification.invoiceData) {
            await db.insertTask({
              userId: ctx.user.id,
              emailId,
              title: `Invoice: ${classification.invoiceData.vendor} - ${classification.invoiceData.amount}`,
              description: `${classification.invoiceData.action}\n\nInvoice #${classification.invoiceData.invoiceNumber}\nDue: ${classification.invoiceData.dueDate}`,
              priority: "high",
              category: "invoice",
              dueDate: classification.invoiceData.dueDate ? new Date(classification.invoiceData.dueDate) : undefined,
              source: "email",
            });
          }
        } catch (aiErr) {
          console.error("[AI] Classification failed for email:", emailId, aiErr);
        }
      }
      await db.updateLastSync(account.id);
      console.log(`[Sync] Sync complete: ${newCount} new emails out of ${fetched.length} fetched`);
      return { synced: newCount, total: fetched.length };
    }),
    stats: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmailStats(ctx.user.id);
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

  task: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTasksByUser(ctx.user.id, input?.limit || 100);
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
