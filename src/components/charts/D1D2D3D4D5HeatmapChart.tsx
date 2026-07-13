import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D1D2D3D4D5HeatmapPoint = Pick<
  Draw,
  "drawNum" | "drawTime" | "d1" | "d2" | "d3" | "d4" | "d5"
>;

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

export default function D1D2D3D4D5HeatmapChart({
  data,
}: {
  data: D1D2D3D4D5HeatmapPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const points = data.filter(
      (d) =>
        d.d1 != null &&
        d.d2 != null &&
        d.d3 != null &&
        d.d4 != null &&
        d.d5 != null,
    );
    const startTime = points[0]?.drawTime;

    // 号码 = d1*10000 + d2*1000 + d3*100 + d4*10 + d5，统计每个号码的开出次数和最近一期
    const counts = new Array<number>(100000).fill(0);
    const lastSeen = new Map<number, { drawNum: string; drawTime: string }>();
    for (const d of points) {
      const num = d.d1 * 10000 + d.d2 * 1000 + d.d3 * 100 + d.d4 * 10 + d.d5;
      counts[num]++;
      lastSeen.set(num, { drawNum: d.drawNum, drawTime: d.drawTime });
    }
    const maxCount = Math.max(...counts);

    // x = 后三位 d3d4d5 (000-999)，y = 前两位 d1d2 (00-99)
    const cells = counts.map((count, num) => [
      num % 1000,
      Math.floor(num / 1000),
      count,
    ]);

    chart.setOption({
      title: {
        text: startTime
          ? `排列5号码分布 00000-99999 ${startTime}-至今`
          : "排列5号码分布 00000-99999",
      },
      tooltip: {
        formatter: (params: { value: [number, number, number] }) => {
          const [x, y, count] = params.value;
          const num = `${String(y).padStart(2, "0")}${String(x).padStart(3, "0")}`;
          if (count === 0) return `号码 ${num}<br/>未开出`;
          const last = lastSeen.get(y * 1000 + x);
          return `号码 ${num}<br/>开出 ${count} 次<br/>最近：第${last?.drawNum}期（${last?.drawTime}）`;
        },
      },
      grid: { left: 70, right: 20, top: 60, bottom: 90 },
      xAxis: {
        type: "category",
        name: "d3d4d5",
        data: Array.from({ length: 1000 }, (_, i) =>
          String(i).padStart(3, "0"),
        ),
        axisLabel: { interval: 99 },
        splitArea: { show: false },
      },
      yAxis: {
        type: "category",
        name: "d1d2",
        data: Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0")),
        inverse: true,
        axisLabel: { interval: 9 },
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

  return <div ref={ref} style={{ width: "100%", height: 900 }} />;
}
