import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D1TrendPoint = Pick<
  Draw,
  "drawTime" | "d1"
>;

export default function D1TrendChart({
  data,
}: {
  data: D1TrendPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const points = data.filter((d) => d.d1 != null);
    const startTime = points[0]?.drawTime;

    chart.setOption({
      title: {
        text: startTime ? `每期d1 ${startTime}-至今` : "每期d1",
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
          data: points.map((d) => Number(d.d1) || 0),
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
