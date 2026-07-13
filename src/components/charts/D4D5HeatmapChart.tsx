import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D4D5HeatmapPoint = Pick<Draw, "drawNum" | "drawTime" | "d4" | "d5">;

// 顺序色阶：同一色相由浅到深，次数越多颜色越深
const SEQ_COLORS = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#104281",
];
// 从未开出的号码用灰色单独一档
const ZERO_COLOR = "#e1e0d9";

type Piece = {
  value?: number;
  min?: number;
  max?: number;
  label: string;
  color: string;
};

// 按实际最大次数把 1..max 切成至多 SEQ_COLORS.length 段
function buildPieces(max: number): Piece[] {
  const pieces: Piece[] = [{ value: 0, label: "未开出", color: ZERO_COLOR }];
  if (max <= 0) return pieces;

  if (max <= SEQ_COLORS.length) {
    for (let v = 1; v <= max; v++) {
      pieces.push({ value: v, label: `${v}次`, color: SEQ_COLORS[v - 1] });
    }
    return pieces;
  }

  let lo = 1;
  for (let i = 0; i < SEQ_COLORS.length; i++) {
    const hi =
      i === SEQ_COLORS.length - 1
        ? max
        : Math.max(lo, Math.round((max * (i + 1)) / SEQ_COLORS.length));
    pieces.push({
      min: lo,
      max: hi,
      label: lo === hi ? `${lo}次` : `${lo}-${hi}次`,
      color: SEQ_COLORS[i],
    });
    lo = hi + 1;
  }
  return pieces;
}

export default function D4D5HeatmapChart({
  data,
}: {
  data: D4D5HeatmapPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const points = data.filter((d) => d.d4 != null && d.d5 != null);
    const startTime = points[0]?.drawTime;

    // 号码 = d4*10 + d5，统计每个号码的开出次数和最近一期
    const counts = new Array<number>(100).fill(0);
    const lastSeen = new Map<number, { drawNum: string; drawTime: string }>();
    for (const d of points) {
      const num = d.d4 * 10 + d.d5;
      counts[num]++;
      lastSeen.set(num, { drawNum: d.drawNum, drawTime: d.drawTime });
    }
    const maxCount = Math.max(...counts);

    // x = 个位 d5 (0-9)，y = 十位 d4 (0-9)
    const cells = counts.map((count, num) => [num % 10, Math.floor(num / 10), count]);

    chart.setOption({
      title: {
        text: startTime
          ? `d4d5号码分布 00-99 ${startTime}-至今`
          : "d4d5号码分布 00-99",
      },
      tooltip: {
        formatter: (params: { value: [number, number, number] }) => {
          const [x, y, count] = params.value;
          const num = `${y}${x}`;
          if (count === 0) return `号码 ${num}<br/>未开出`;
          const last = lastSeen.get(y * 10 + x);
          return `号码 ${num}<br/>开出 ${count} 次<br/>最近：第${last?.drawNum}期（${last?.drawTime}）`;
        },
      },
      grid: { left: 60, right: 20, top: 60, bottom: 90 },
      xAxis: {
        type: "category",
        name: "d5",
        data: Array.from({ length: 10 }, (_, i) => String(i)),
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        name: "d4",
        data: Array.from({ length: 10 }, (_, i) => String(i)),
        inverse: true,
        splitArea: { show: false },
      },
      visualMap: {
        type: "piecewise",
        dimension: 2,
        pieces: buildPieces(maxCount),
        orient: "horizontal",
        left: "center",
        bottom: 10,
      },
      series: [
        {
          type: "heatmap",
          data: cells,
          itemStyle: { borderColor: "#fff", borderWidth: 1 },
          emphasis: { itemStyle: { borderColor: "#0b0b0b", borderWidth: 1 } },
        },
      ],
    });

    const resize = () => chart.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.dispose();
    };
  }, [data]);

  return <div ref={ref} style={{ width: "100%", height: 400 }} />;
}
