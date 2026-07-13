import { useEffect, useState } from "react";
import type { Draw } from "./types";
// import TotalSaleAmountTrendChart from "./components/charts/TotalSaleAmountTrendChart";
import StakeCountTrendChart from "./components/charts/StakeCountTrendChart";
import PoolBalanceAfterDrawTrendChart from "./components/charts/PoolBalanceAfterDrawTrendChart";
// import DrawResultTrendChart from "./components/charts/DrawResultTrendChart";
import D1D2D3HeatmapChart from "./components/charts/D1D2D3HeatmapChart";
import D1D2D3HeatmapChart2026 from "./components/charts/D1D2D3HeatmapChart2026";
// import D4D5HeatmapChart from "./components/charts/D4D5HeatmapChart";
// import D1D2D3D4D5HeatmapChart from "./components/charts/D1D2D3D4D5HeatmapChart";
// import D1TrendChart from "./components/charts/D1TrendChart";
// import D2TrendChart from "./components/charts/D2TrendChart";
// import D3TrendChart from "./components/charts/D3TrendChart";
// import D4TrendChart from "./components/charts/D4TrendChart";
// import D5TrendChart from "./components/charts/D5TrendChart";
// import D1D2D3SumTrendChart from "./components/charts/D1D2D3SumTrendChart";
// import D1D2D3D4D5SumTrendChart from "./components/charts/D1D2D3D4D5SumTrendChart";
import D1D2D3HeatmapChart2025 from "./components/charts/D1D2D3HeatmapChart2025";
import D1D2D3HeatmapChart2024 from "./components/charts/D1D2D3HeatmapChart2024";
import D1D2D3HeatmapChart2023 from "./components/charts/D1D2D3HeatmapChart2023";
import D1D2D3HeatmapChart2022 from "./components/charts/D1D2D3HeatmapChart2022";
import D1D2D3HeatmapChart2021 from "./components/charts/D1D2D3HeatmapChart2021";
import D1D2D3HeatmapChart2020 from "./components/charts/D1D2D3HeatmapChart2020";

function App() {
  const [draws, setDraws] = useState<Draw[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/draws?limit=all")
      .then((res) => res.json())
      .then((rows: Draw[]) => setDraws([...rows].reverse()));
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      {/* <TotalSaleAmountTrendChart data={draws} /> */}
      <StakeCountTrendChart data={draws} />
      <PoolBalanceAfterDrawTrendChart data={draws} />
      {/* <DrawResultTrendChart data={draws} /> */}
      {/* <D1TrendChart data={draws} /> */}
      {/* <D2TrendChart data={draws} /> */}
      {/* <D3TrendChart data={draws} /> */}
      {/* <D4TrendChart data={draws} /> */}
      {/* <D5TrendChart data={draws} /> */}
      {/* <D1D2D3SumTrendChart data={draws} /> */}
      {/* <D1D2D3D4D5SumTrendChart data={draws} /> */}
      <D1D2D3HeatmapChart data={draws} />
      <D1D2D3HeatmapChart2026 data={draws} />
      <D1D2D3HeatmapChart2025 data={draws} />
      <D1D2D3HeatmapChart2024 data={draws} />
      <D1D2D3HeatmapChart2023 data={draws} />
      <D1D2D3HeatmapChart2022 data={draws} />
      <D1D2D3HeatmapChart2021 data={draws} />
      <D1D2D3HeatmapChart2020 data={draws} />
      {/* <D4D5HeatmapChart data={draws} /> */}
      {/* <D1D2D3D4D5HeatmapChart data={draws} /> */}
    </div>
  );
}

export default App;
