// 对应 /api/draws 返回的一行数据（与 db/schema.ts 的 draws 表一致）
// numeric 列 (totalSaleAmount / poolBalanceAfterDraw / totalPrizeAmount) 序列化后是 string
// integer/smallint 列 (d1-d5 / stakeCount) 序列化后是 number
export interface Draw {
  drawNum: string;
  drawTime: string;
  drawResult: string;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  totalSaleAmount: string | null;
  poolBalanceAfterDraw: string | null;
  stakeCount: number | null;
  totalPrizeAmount: string | null;
}
