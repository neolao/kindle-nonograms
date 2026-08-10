import express, { type Express } from "express";

/**
 * Builds the Express application without starting an HTTP listener,
 * so it can be exercised directly in tests.
 */
export function createApp(): Express {
  const app = express();

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
