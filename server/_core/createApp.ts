import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
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

  app.get("/api/health", (_req, res) => {
        res.status(200).json({ ok: true, env: process.env.NODE_ENV ?? "unknown" });
  });

  return app;
}
