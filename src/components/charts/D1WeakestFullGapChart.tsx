import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D1WeakestFullGapPoint = Pick<Draw, "drawNum" | "drawTime" | "d1">;

const WINDOW = 30; // 参考日之前(含当天)的期数
const BIN = 5; // 直方图分箱宽度(期)
const FLOOR = 5; // 最低箱起点,更小的间隔并入首箱
const CAP = 70; // 尾箱起点,更长的间隔归入 "≥70"

type DayResult = {
  drawNum: string;
  drawTime: string;
  weakest: number; // 前 30 期最弱势(出现最少)的 d1 数字
  minCount: number; // 该数字在窗口 30 期内的出现次数
  backWait: number | null; // 已冷:参考日距其上一次出现的间隔(期)
  fwdWait: number | null; // 待补:参考日到其之后首次再现的间隔(期)
  gap: number | null; // 总断档:上一次出现 → 下一次出现的间隔(期)
};

// 对每个参考日,取前 30 期中出现最少的 d1 数字(最弱势),
// 再看它「上一次出现」到「之后第一次出现」隔了多远(总断档)。
function computeResults(data: D1WeakestFullGapPoint[]): DayResult[] {
  const rows = [...data]
    .filter((d) => d.d1 != null && d.drawTime)
    .sort((a, b) => a.drawTime.localeCompare(b.drawTime)); // 时间正序
  const n = rows.length;
  const out: DayResult[] = [];

  for (let t = WINDOW - 1; t < n; t++) {
    const counts = new Array(10).fill(0);
    const lastInWin = new Array(10).fill(-1); // 窗口内最近一次出现的下标
    for (let i = t - WINDOW + 1; i <= t; i++) {
      counts[rows[i].d1]++;
      lastInWin[rows[i].d1] = i;
    }
    const minCount = Math.min(...counts);
    // 频次最少者为候选;平局取"遗漏最久"(窗口内最后出现下标最小),再平局取小数字
    const cand: number[] = [];
    for (let d = 0; d <= 9; d++) if (counts[d] === minCount) cand.push(d);
    cand.sort((a, b) => lastInWin[a] - lastInWin[b] || a - b);
    const weakest = cand[0];

    // 上一次出现:窗口内有则直接用,否则继续向窗口之前回溯
    let lastSeen = lastInWin[weakest];
    if (lastSeen < 0) {
      for (let b = t - WINDOW; b >= 0; b--) {
        if (rows[b].d1 === weakest) {
          lastSeen = b;
          break;
        }
      }
    }
    // 下一次出现:参考日之后首个开出该数字的期
    let nextSeen = -1;
    for (let f = t + 1; f < n; f++) {
      if (rows[f].d1 === weakest) {
        nextSeen = f;
        break;
      }
    }

    out.push({
      drawNum: rows[t].drawNum,
      drawTime: rows[t].drawTime,
      weakest,
      minCount,
      backWait: lastSeen >= 0 ? t - lastSeen : null,
      fwdWait: nextSeen >= 0 ? nextSeen - t : null,
      gap: lastSeen >= 0 && nextSeen >= 0 ? nextSeen - lastSeen : null,
    });
  }
  return out;
}

export default function D1WeakestFullGapChart({
  data,
}: {
  data: D1WeakestFullGapPoint[];
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
      backWait: number;
      fwdWait: number;
    })[];
    if (withGap.length === 0) {
      chart.setOption({
        title: { text: "d1 最弱势号码 · 上一次→下一次总断档分布(暂无数据)" },
      });
      return cleanup;
    }
    const pending = results.length - withGap.length; // 末尾仍在冷却、尚未再现

    // 直方图分箱:FLOOR..CAP 每 BIN 期一箱,超长归入尾箱
    const binStarts: number[] = [];
    for (let b = FLOOR; b <= CAP; b += BIN) binStarts.push(b);
    const binCounts = binStarts.map(() => 0);
    for (const r of withGap) {
      const bs = Math.min(CAP, Math.max(FLOOR, Math.floor(r.gap / BIN) * BIN));
      binCounts[(bs - FLOOR) / BIN]++;
    }
    const categories = binStarts.map((b) =>
      b >= CAP ? `≥${CAP}` : `${b}–${b + BIN - 1}`,
    );
    const total = withGap.length;

    // 统计量:总断档 / 已冷 / 待补
    const gaps = withGap.map((r) => r.gap).sort((a, b) => a - b);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const median = gaps[Math.floor(gaps.length / 2)];
    const p90 = gaps[Math.floor(gaps.length * 0.9)];
    const maxGap = gaps[gaps.length - 1];
    const meanBack =
      withGap.reduce((a, r) => a + r.backWait, 0) / withGap.length;
    const meanFwd = withGap.reduce((a, r) => a + r.fwdWait, 0) / withGap.length;

    // 均值落在哪一箱 —— markLine 用分箱下标定位
    const meanBinStart = Math.min(
      CAP,
      Math.max(FLOOR, Math.floor(mean / BIN) * BIN),
    );
    const meanIdx = (meanBinStart - FLOOR) / BIN;

    // "这一天"(最新一期)的具体情形
    const latest = results[results.length - 1];
    const latestNote =
      latest.gap == null
        ? `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest}` +
          `(前${WINDOW}期${latest.minCount}次,已冷${latest.backWait ?? "?"}期),截至末期仍未再现`
        : `最新一期第${latest.drawNum}期(${latest.drawTime}):最弱势 d1 = ${latest.weakest},` +
          `已冷${latest.backWait}期 + 待补${latest.fwdWait}期 = 总断档${latest.gap}期`;

    chart.setOption({
      title: {
        text: "d1 最弱势号码 · 上一次→下一次总断档分布",
        subtext:
          `每个参考日取前${WINDOW}期中出现最少的 d1 数字,统计其「上一次出现 → 之后首次再现」的总间隔｜` +
          `共 ${total} 个参考日｜均值 ${mean.toFixed(1)} 期 · 中位数 ${median} 期 · P90 ${p90} 期 · 最长 ${maxGap} 期\n` +
          `总断档 ≈ 已冷 ${meanBack.toFixed(1)} 期 + 待补 ${meanFwd.toFixed(1)} 期:` +
          `待补≈几何分布均值(10期)—— 冷得再久,平均仍要 ~10 期才回来｜${latestNote}` +
          (pending ? `｜末尾 ${pending} 天仍在冷却未计入` : ""),
        subtextStyle: { lineHeight: 18 },
      },
      grid: { left: 60, right: 24, top: 96, bottom: 64 },
      tooltip: {
        trigger: "axis",
        formatter: (params: { name: string; dataIndex: number }[]) => {
          const p = params[0];
          if (!p) return "";
          const cnt = binCounts[p.dataIndex];
          const pct = ((cnt / total) * 100).toFixed(1);
          return `总断档 ${p.name} 期<br/>参考日:${cnt} 天 (${pct}%)`;
        },
      },
      xAxis: {
        type: "category",
        name: "总断档间隔(期)",
        nameLocation: "middle",
        nameGap: 32,
        data: categories,
        axisLabel: { interval: 0 },
      },
      yAxis: { type: "value", name: "参考日数量" },
      series: [
        {
          name: "参考日数",
          type: "bar",
          data: binCounts,
          itemStyle: { color: "#17a2a2", borderRadius: [4, 4, 0, 0] },
          barWidth: "72%",
          markLine: {
            symbol: "none",
            data: [
              {
                xAxis: meanIdx,
                label: {
                  formatter: `均值 ${mean.toFixed(1)} 期`,
                  position: "insideEndTop",
                },
                lineStyle: { color: "#0b6b6b", type: "dashed", width: 2 },
              },
            ],
          },
        },
      ],
    });

    return cleanup;
  }, [data]);

  return <div ref={ref} style={{ width: "100%", height: 460 }} />;
}
