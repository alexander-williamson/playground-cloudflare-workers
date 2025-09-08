import { Hono } from "hono";
import type { D1Database } from "@cloudflare/workers-types";

interface Env {
  DATABASE: D1Database; // This matches your Terraform binding
}

const app = new Hono<{ Bindings: Env }>();

// --- Migration endpoint ---
app.get("/migrate", async (c) => {
  const db = c.env.DATABASE;

  try {
    // Create the table if it doesn't exist
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS counters (id TEXT PRIMARY KEY, value INTEGER NOT NULL )`
      )
      .run();

    // Insert initial row if it doesn't exist
    await db
      .prepare(
        `INSERT INTO counters (id, value) SELECT 'main', 0 WHERE NOT EXISTS (SELECT 1 FROM counters WHERE id = 'main')`
      )
      .run();

    return c.json({ message: "Migration completed successfully" });
  } catch (err) {
    return c.json({ error: "Migration failed", details: err }, 500);
  }
});

// --- Increment counter ---
app.get("/increment", async (c) => {
  const db = c.env.DATABASE;

  const result = await db
    .prepare(
      `UPDATE counters SET value = value + 1 WHERE id = 'main' RETURNING value`
    )
    .all();

  if (result.results && result.results[0]) {
    return c.json({ counter: result.results[0]["value"] });
  }

  return c.json({ error: "Failed to increment counter" }, 500);
});

// --- Decrement counter ---
app.get("/decrement", async (c) => {
  const db = c.env.DATABASE;

  const result = await db
    .prepare(
      `UPDATE counters SET value = value - 1 WHERE id = 'main' RETURNING value`
    )
    .all();

  if (result.results && result.results[0]) {
    return c.json({ counter: result.results[0]["value"] });
  }

  return c.json({ error: "Failed to decrement counter" }, 500);
});

// --- Get current counter value ---
app.get("/count", async (c) => {
  const db = c.env.DATABASE;

  const result = await db
    .prepare(`SELECT value FROM counters WHERE id = 'main'`)
    .all();

  if (result.results && result.results[0]) {
    return c.json({ counter: result.results[0]["value"] });
  }

  return c.json({ error: "Counter not found" }, 404);
});

export default app;
