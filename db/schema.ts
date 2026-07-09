import {
  pgTable,
  text,
  date,
  integer,
  smallint,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const draws = pgTable(
  "draws",
  {
    drawNum: text("draw_num").notNull().primaryKey(), // 期号 26178
    drawTime: date("draw_time").notNull(), // 开奖日期 2026-07-07

    drawResult: text("draw_result").notNull(), // "8 3 7 9 9"
    d1: smallint("d1").notNull(), // 5 位分开存,方便分析
    d2: smallint("d2").notNull(),
    d3: smallint("d3").notNull(),
    d4: smallint("d4").notNull(),
    d5: smallint("d5").notNull(),

    totalSaleAmount: numeric("total_sale_amount", { precision: 18, scale: 2 }), // 销售额 21,799,092
    poolBalanceAfterDraw: numeric("pool_balance_after_draw", {
      precision: 18,
      scale: 2,
    }), // 奖池 32,381,419

    stakeCount: integer("stake_count"), // 中奖注数 58
    totalPrizeAmount: numeric("total_prize_amount", {
      precision: 18,
      scale: 2,
    }), // 中奖 5,800,000
  },
  (t) => [
    index("draws_draw_time_idx").on(t.drawTime),
  ],
);
