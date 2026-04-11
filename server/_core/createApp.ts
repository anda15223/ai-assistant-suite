import express, { type Express, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb } from "../db";
import { whatsappWebhookRouter } from "../whatsappWebhook";

/**
 * Build the Express app without binding to a port.
 * Used by both server/_core/index.ts (long-running local dev) and
 * api/index.ts (Vercel serverless function entry).
 */
export function createApp(): Express {
    const app = express();

  app.use(express.json({ limit: "50mb" }));
    app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.use("/api/webhook/whatsapp", whatsappWebhookRouter);

  app.use(
        "/api/trpc",
        createExpressMiddleware({
                router: appRouter,
                createContext,
        })
      );

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (db) {
        res.status(200).json({
          ok: true,
          db: "connected",
          env: process.env.NODE_ENV ?? "unknown",
          hasDbUrl: !!process.env.DATABASE_URL,
        });
      } else {
        res.status(503).json({
          ok: false,
          db: "disconnected",
          error: "Database connection failed",
          hasDbUrl: !!process.env.DATABASE_URL,
          env: process.env.NODE_ENV ?? "unknown",
        });
      }
    } catch (error) {
      res.status(503).json({
        ok: false,
        db: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        hasDbUrl: !!process.env.DATABASE_URL,
      });
    }
  });

  return app;
}
