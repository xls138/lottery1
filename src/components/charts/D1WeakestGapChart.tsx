import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D1WeakestGapPoint = Pick<Draw, "drawNum" | "drawTime" | "d1">;

const WINDOW = 30; // 参考日之前(含当天)的期数
const MAX_BUCKET = 25; // 单独成柱的最大间隔,更长归入 "≥26"

type DayResult = {
  drawNum: string;
  drawTime: string;
  weakest: number; // 最弱势的 d1 数字
  minCount: number; // 该数字在窗口 30 期内出现次数
  gap: number | null; // 之后首次再现的间隔(期);null=数据末尾仍未再现
};

// 对每个参考日,取前 30 期中出现最少的 d1 数字(最弱势),
// 再看它在这天之后第一次开出离得多远
function computeResults(data: D1WeakestGapPoint[]): DayResult[] {
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

    let gap: number | null = null;
    for (let f = t + 1; f < n; f++) {
      if (rows[f].d1 === weakest) {
        gap = f - t;
        break;
      }
    }
    out.push({
      drawNum: rows[t].drawNum,
      drawTime: rows[t].drawTime,
      weakest,
      minCount,
      gap,
    });
  }
  return out;
}

export default function D1WeakestGapChart({
  data,
}: {
  data: D1WeakestGapPoint[];
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
        title: { text: "d1 最弱势号码 · 冷却后再现间隔分布(暂无数据)" },
      });
      return cleanup;
    }
    const pending = results.length - withGap.length; // 末尾仍在冷却、未再现

    // 间隔直方图:1..MAX_BUCKET 各一柱,更长归入尾桶
    const tailIdx = MAX_BUCKET; // 数组下标 = 间隔;下标 0 弃用
    const empirical = new Array(MAX_BUCKET + 1).fill(0);
    for (const r of withGap) {
      empirical[Math.min(r.gap, tailIdx)]++;
    }
    const total = withGap.length;

    // 理论:若各位等概率独立,某数字的等待期服从几何分布 p=0.1,
    // "冷"与否不改变未来 —— 用它作为对照基准
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
      latest.gap == null
        ? `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest}(前${WINDOW}期${latest.minCount}次),截至末期仍未再现`
        : `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest},${latest.gap}期后再现`;

    chart.setOption({
      title: {
        text: "d1 最弱势号码 · 冷却后再现间隔分布",
        subtext:
          `每个参考日取前${WINDOW}期中出现最少的 d1 数字,统计其之后首次再现的间隔｜` +
          `共 ${results.length} 个参考日｜均值 ${mean.toFixed(1)} 期 · 中位数 ${median} 期 · P90 ${p90} 期 · 最长 ${maxGap} 期\n` +
          `均值≈理论几何分布(10期):冷号并不会更快回来｜${latestNote}` +
          (pending ? `｜末尾 ${pending} 天仍在冷却未计入` : ""),
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
            `间隔 ${name} 期<br/>` +
            `实际:${emp} 天 (${pct}%)<br/>` +
            `理论:${theoretical[bucket].toFixed(0)} 天`
          );
        },
      },
      xAxis: {
        type: "category",
        name: "再现间隔(期)",
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
          itemStyle: { color: "#3987e5", borderRadius: [4, 4, 0, 0] },
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
                lineStyle: { color: "#104281", type: "dashed", width: 2 },
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
