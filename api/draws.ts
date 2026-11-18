import { Hono } from "hono";
import { cors } from "hono/cors";
import { db, draws } from "../db/index.js";
import { desc, and, gte, lte } from "drizzle-orm";

export const config = {
  runtime: "nodejs",
};

const app = new Hono();
app.use("/*", cors());

// 开奖列表
//   ?limit=xx   每页几期,默认 30;传 all 返回全部
//   ?offset=xx  跳过几期(翻页),默认 0
//   ?from=日期  只看这天及之后(含),如 2026-01-01
//   ?to=日期    只看这天及之前(含),如 2026-06-30
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

// Vercel 的 Node 运行时传入的是 Node 风格 req(headers 是普通对象),
// hono/vercel 的 handle() 会原样透传导致崩溃,这里统一转成标准 Request。
export default async function handler(req: any) {
  const isStandard =
    typeof req.headers?.get === "function" && typeof req.text === "function";
  const request = isStandard
    ? (req as Request)
    : new Request(`https://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: new Headers(req.headers),
      });
  return app.fetch(request);
}
