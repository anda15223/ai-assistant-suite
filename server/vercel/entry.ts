/**
 * Vercel serverless function entry.
 * Vercel auto-detects files inside /api as functions. The vercel.json
 * rewrites every /api/* request to this single function so the existing
 * Express app handles it.
 */
import "dotenv/config";
import { createApp } from "../_core/createApp";

const app = createApp();

export default app;
