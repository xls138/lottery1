import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { db, draws } from "../db/index.ts";
import { desc, and, gte, lte } from "drizzle-orm";

const app = new Hono();
app.use("/*", cors());   // 开发时允许前端跨域访问

// 开奖列表
//   ?limit=xx   每页几期,默认 30
//   ?offset=xx  跳过几期(翻页),默认 0
//   ?from=日期  只看这天及之后(含),如 2026-01-01
//   ?to=日期    只看这天及之前(含),如 2026-06-30
app.get("/api/draws", async (c) => {
  const limit = Number(c.req.query("limit")) || 30;
  const offset = Number(c.req.query("offset")) || 0;
  const from = c.req.query("from");
  const to = c.req.query("to");

  const rows = await db.select().from(draws)
    .where(and(
      from ? gte(draws.drawTime, from) : undefined,
      to ? lte(draws.drawTime, to) : undefined,
    ))
    .orderBy(desc(draws.drawTime))
    .limit(limit)
    .offset(offset);
  return c.json(rows);
});

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log("API 跑在 http://localhost:3000");
});