import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type D1D2D3SumTrendPoint = Pick<
  Draw,
  "drawTime" | "d1" | "d2" | "d3"
>;

export default function D1D2D3SumTrendChart({
  data,
}: {
  data: D1D2D3SumTrendPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    const points = data.filter(
      (d) => d.d1 != null && d.d2 != null && d.d3 != null,
    );
    const startTime = points[0]?.drawTime;

    chart.setOption({
      title: {
        text: startTime ? `每期d1+d2+d3和值 ${startTime}-至今` : "每期d1+d2+d3和值",
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
          data: points.map((d) => Number(d.d1) + Number(d.d2) + Number(d.d3)),
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
