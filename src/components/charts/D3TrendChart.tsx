import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D3TrendPoint = Pick<
  Draw,
  "drawTime" | "d3"
>;

export default function D3TrendChart({
  data,
}: {
  data: D3TrendPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const points = data.filter((d) => d.d3 != null);
    const startTime = points[0]?.drawTime;

    chart.setOption({
      title: {
        text: startTime ? `每期d3 ${startTime}-至今` : "每期d3",
      },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        data: points.map((d) => d.drawTime),
      },
      yAxis: { type: "value" },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false,
        },
        {
          type: "slider",
          xAxisIndex: 0,
        },
      ],
      series: [
        {
          type: "line",
          smooth: true,
          data: points.map((d) => Number(d.d3) || 0),
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
