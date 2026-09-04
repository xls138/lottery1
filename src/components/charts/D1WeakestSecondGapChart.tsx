import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D1WeakestSecondGapPoint = Pick<Draw, "drawNum" | "drawTime" | "d1">;

const WINDOW = 30; // 参考日之前(含当天)的期数
const MAX_BUCKET = 25; // 单独成柱的最大间隔,更长归入 "≥26"

type DayResult = {
  drawNum: string;
  drawTime: string;
  weakest: number; // 前 30 期最弱势(出现最少)的 d1 数字
  minCount: number; // 该数字在窗口 30 期内的出现次数
  firstGap: number | null; // 参考日 → 之后首次再现的间隔(期)
  gap: number | null; // 之后第一次再现 → 第二次再现的间隔(期)
};

// 对每个参考日,取前 30 期中出现最少的 d1 数字(最弱势),
// 再看它在这天之后「第一次再现」与「第二次再现」隔了多远。
function computeResults(data: D1WeakestSecondGapPoint[]): DayResult[] {
  const rows = [...data]
    .filter((d) => d.d1 != null && d.drawTime)
    .sort((a, b) => a.drawTime.localeCompare(b.drawTime)); // 时间正序
  const n = rows.length;
  const out: DayResult[] = [];

  for (let t = WINDOW - 1; t < n; t++) {
    const counts = new Array(10).fill(0);
    const lastSeen = new Array(10).fill(-1); // 窗口内最近一次出现的下标
    for (let i = t - WINDOW + 1; i <= t; i++) {
      counts[rows[i].d1]++;
      lastSeen[rows[i].d1] = i;
    }
    const minCount = Math.min(...counts);
    // 频次最少者为候选;平局取"遗漏最久"(窗口内最后出现下标最小),再平局取小数字
    const cand: number[] = [];
    for (let d = 0; d <= 9; d++) if (counts[d] === minCount) cand.push(d);
    cand.sort((a, b) => lastSeen[a] - lastSeen[b] || a - b);
    const weakest = cand[0];

    // 参考日之后第一次、第二次开出该数字的期
    let s1 = -1;
    for (let f = t + 1; f < n; f++) {
      if (rows[f].d1 === weakest) {
        s1 = f;
        break;
      }
    }
    let s2 = -1;
    if (s1 >= 0) {
      for (let g = s1 + 1; g < n; g++) {
        if (rows[g].d1 === weakest) {
          s2 = g;
          break;
        }
      }
    }

    out.push({
      drawNum: rows[t].drawNum,
      drawTime: rows[t].drawTime,
      weakest,
      minCount,
      firstGap: s1 >= 0 ? s1 - t : null,
      gap: s1 >= 0 && s2 >= 0 ? s2 - s1 : null,
    });
  }
  return out;
}

export default function D1WeakestSecondGapChart({
  data,
}: {
  data: D1WeakestSecondGapPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const results = computeResults(data);

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    const cleanup = () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };

    // 数据未加载/不足 30 期:占位标题,等数据到位后重渲染
    const withGap = results.filter((r) => r.gap != null) as (DayResult & {
      gap: number;
    })[];
    if (withGap.length === 0) {
      chart.setOption({
        title: { text: "d1 最弱势号码 · 再现后 第一次→第二次 间隔分布(暂无数据)" },
      });
      return cleanup;
    }
    const pending = results.length - withGap.length; // 末尾尚未凑齐两次再现

    // 间隔直方图:1..MAX_BUCKET 各一柱,更长归入尾桶
    const tailIdx = MAX_BUCKET;
    const empirical = new Array(MAX_BUCKET + 1).fill(0);
    for (const r of withGap) {
      empirical[Math.min(r.gap, tailIdx)]++;
    }
    const total = withGap.length;

    // 理论:第一次再现之后,该数字的等待期回归几何分布 p=0.1(均值10期),
    // 与"冷号刚回来会不会连着开"作对照 —— 这段间隔无选择偏差,几何分布是准绳
    const p = 0.1;
    const theoretical = new Array(MAX_BUCKET + 1).fill(0);
    for (let k = 1; k < MAX_BUCKET; k++) {
      theoretical[k] = total * Math.pow(1 - p, k - 1) * p;
    }
    theoretical[MAX_BUCKET] = total * Math.pow(1 - p, MAX_BUCKET - 1); // 尾桶=P(≥MAX_BUCKET)

    const categories = Array.from({ length: MAX_BUCKET }, (_, i) =>
      i + 1 < MAX_BUCKET ? String(i + 1) : `≥${MAX_BUCKET}`,
    );
    const empBars = empirical.slice(1);
    const theoLine = theoretical.slice(1);

    // 统计量
    const gaps = withGap.map((r) => r.gap).sort((a, b) => a - b);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const median = gaps[Math.floor(gaps.length / 2)];
    const p90 = gaps[Math.floor(gaps.length * 0.9)];
    const maxGap = gaps[gaps.length - 1];

    // "这一天"(最新一期)的具体情形
    const latest = results[results.length - 1];
    const latestNote =
      latest.gap != null
        ? `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest},首现后 ${latest.gap} 期再现第二次`
        : latest.firstGap != null
          ? `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest},已首现(距参考日${latest.firstGap}期),尚待第二次`
          : `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest},截至末期尚未再现`;

    chart.setOption({
      title: {
        text: "d1 最弱势号码 · 再现后 第一次→第二次 间隔分布",
        subtext:
          `每个参考日取前${WINDOW}期中出现最少的 d1 数字,统计其之后「第一次再现 → 第二次再现」的间隔｜` +
          `共 ${total} 个参考日｜均值 ${mean.toFixed(1)} 期 · 中位数 ${median} 期 · P90 ${p90} 期 · 最长 ${maxGap} 期\n` +
          `均值≈理论几何分布(10期):冷号刚回来并不会连着开,间隔已回归常态｜${latestNote}` +
          (pending ? `｜末尾 ${pending} 天尚未凑齐两次再现未计入` : ""),
        subtextStyle: { lineHeight: 18 },
      },
      grid: { left: 60, right: 24, top: 96, bottom: 64 },
      legend: {
        data: ["实际参考日数", "理论几何分布(p=0.1)"],
        top: 8,
        right: 10,
        orient: "vertical",
      },
      tooltip: {
        trigger: "axis",
        formatter: (params: { name: string }[]) => {
          const name = params[0]?.name ?? "";
          const bucket = name.startsWith("≥") ? MAX_BUCKET : Number(name);
          const emp = empirical[bucket];
          const pct = ((emp / total) * 100).toFixed(1);
          return (
            `第一次→第二次 间隔 ${name} 期<br/>` +
            `实际:${emp} 天 (${pct}%)<br/>` +
            `理论:${theoretical[bucket].toFixed(0)} 天`
          );
        },
      },
      xAxis: {
        type: "category",
        name: "第一次→第二次 间隔(期)",
        nameLocation: "middle",
        nameGap: 32,
        data: categories,
      },
      yAxis: { type: "value", name: "参考日数量" },
      series: [
        {
          name: "实际参考日数",
          type: "bar",
          data: empBars,
          itemStyle: { color: "#e5843d", borderRadius: [4, 4, 0, 0] },
          barWidth: "62%",
          markLine: {
            symbol: "none",
            data: [
              {
                xAxis: Math.round(mean) - 1,
                label: {
                  formatter: `均值 ${mean.toFixed(1)} 期`,
                  position: "insideEndTop",
                },
                lineStyle: { color: "#a35414", type: "dashed", width: 2 },
              },
            ],
          },
        },
        {
          name: "理论几何分布(p=0.1)",
          type: "line",
          data: theoLine,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#8a8a8a", type: "dashed", width: 2 },
        },
      ],
    });

    return cleanup;
  }, [data]);

  return <div ref={ref} style={{ width: "100%", height: 460 }} />;
}
