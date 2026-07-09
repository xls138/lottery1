import "dotenv/config";
import { db, draws } from "../db/index.ts";
import { sql } from "drizzle-orm";

const API =
  "https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry";
const clean = (s?: string | null): number | null => {
  if (s == null) return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const num = (s?: string | null) => {
  const n = clean(s);
  return n === null ? null : String(n);
};
const int = clean;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(pageNo: number) {
  const url = `${API}?gameNo=350133&provinceId=0&pageSize=30&isVerify=1&pageNo=${pageNo}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "https://www.sporttery.cn/",
      Accept: "application/json, text/plain, */*",
    },
  });
  const text = await res.text();
  // 被 WAF 拦截时返回的是 HTML,不是 JSON
  if (text.trimStart().startsWith("<")) {
    throw new Error(`WAF_BLOCKED at page ${pageNo}`);
  }
  return JSON.parse(text).value;
}

async function saveItem(item: any) {
  const d = item.lotteryDrawResult.split(" ").map(Number);
  const prize = item.prizeLevelList?.[0]; // 排列5 只有一等奖

  await db
    .insert(draws)
    .values({
      drawNum: item.lotteryDrawNum,
      drawTime: item.lotteryDrawTime,
      drawResult: item.lotteryDrawResult,
      d1: d[0],
      d2: d[1],
      d3: d[2],
      d4: d[3],
      d5: d[4],
      totalSaleAmount: num(item.totalSaleAmount),
      poolBalanceAfterDraw: num(item.poolBalanceAfterdraw),
      stakeCount: prize ? int(prize.stakeCount) : null,
      totalPrizeAmount: prize ? num(prize.totalPrizeamount) : null,
    })
    .onConflictDoUpdate({
      target: draws.drawNum, // 期号冲突就更新,防重复
      set: {
        totalSaleAmount: sql`excluded.total_sale_amount`,
        poolBalanceAfterDraw: sql`excluded.pool_balance_after_draw`,
        stakeCount: sql`excluded.stake_count`,
      },
    });
}

async function run() {
  const mode = process.argv[2]; // "daily" 只抓第 1 页,否则全量回填

  if (mode === "daily") {
    const { list } = await fetchPage(1);
    for (const item of list) await saveItem(item);
    console.log(`✓ 增量完成,处理 ${list.length} 期`);
  } else {
    const first = await fetchPage(1);
    const totalPages = first.pages;
    console.log(`共 ${totalPages} 页,开始回填...`);
    for (let p = 1; p <= totalPages; p++) {
      const { list } = await fetchPage(p);
      for (const item of list) await saveItem(item);
      console.log(`  第 ${p}/${totalPages} 页`);
      await sleep(1500); // 每页停 1.5s,别把接口打崩
    }
    console.log("✓ 全量回填完成");
  }
  process.exit(0);
}

run();
