import { Hono } from "hono";
import { handle } from "hono/vercel";
import { cors } from "hono/cors";
import { db, draws } from "../db/index.ts";
import { desc, and, gte, lte } from "drizzle-orm";

export const config = {
  runtime: "nodejs",
};

const app = new Hono();
app.use("/*", cors());

const getDraws = async (c: any) => {
  const limitParam = c.req.query("limit");
  const limit = limitParam === "all" ? undefined : Number(limitParam) || 30;
  const offset = Number(c.req.query("offset")) || 0;
  const from = c.req.query("from");
  const to = c.req.query("to");

  const query = db
    .select()
    .from(draws)
    .where(
      and(
        from ? gte(draws.drawTime, from) : undefined,
        to ? lte(draws.drawTime, to) : undefined,
      ),
    )
    .orderBy(desc(draws.drawTime))
    .offset(offset);

  const rows = limit !== undefined ? await query.limit(limit) : await query;
  return c.json(rows);
};

app.get("/api/draws", getDraws);
app.get("/draws", getDraws);

export default handle(app);
