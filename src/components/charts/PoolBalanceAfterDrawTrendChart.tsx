import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { Draw } from "../../types";

export type PoolBalanceAfterDrawTrendPoint = Pick<
  Draw,
  "drawTime" | "poolBalanceAfterDraw"
>;

export default function PoolBalanceAfterDrawTrendChart({
  data,
}: {
  data: PoolBalanceAfterDrawTrendPoint[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);

    // 早期无数据的记录存的是 0 而非 null，且后面存在真实的 0，所以只能从首个非零点开始截取
    const firstValidIndex = data.findIndex(
      (d) => d.poolBalanceAfterDraw != null && Number(d.poolBalanceAfterDraw) !== 0,
    );
    const points = firstValidIndex === -1 ? [] : data.slice(firstValidIndex);
    const startTime = points[0]?.drawTime;

    chart.setOption({
      title: {
        text: startTime ? `每期奖池余额 ${startTime}-至今` : "每期奖池余额",
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
          data: points.map((d) => Number(d.poolBalanceAfterDraw) || 0),
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
