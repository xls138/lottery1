import { useEffect, useState } from "react";
import type { Draw } from "./types";
import TotalSaleAmountTrendChart from "./components/charts/TotalSaleAmountTrendChart";
import StakeCountTrendChart from "./components/charts/StakeCountTrendChart";
import PoolBalanceAfterDrawTrendChart from "./components/charts/PoolBalanceAfterDrawTrendChart";
import DrawResultTrendChart from "./components/charts/DrawResultTrendChart";
import D1TrendChart from "./components/charts/D1TrendChart";
import D2TrendChart from "./components/charts/D2TrendChart";
import D3TrendChart from "./components/charts/D3TrendChart";
import D4TrendChart from "./components/charts/D4TrendChart";
import D5TrendChart from "./components/charts/D5TrendChart";

function App() {
  const [draws, setDraws] = useState<Draw[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/api/draws?limit=all")
      .then((res) => res.json())
      .then((rows: Draw[]) => setDraws([...rows].reverse()));
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <TotalSaleAmountTrendChart data={draws} />
      <StakeCountTrendChart data={draws} />
      <PoolBalanceAfterDrawTrendChart data={draws} />
      <DrawResultTrendChart data={draws} />
      <D1TrendChart data={draws} />
      <D2TrendChart data={draws} />
      <D3TrendChart data={draws} />
      <D4TrendChart data={draws} />
      <D5TrendChart data={draws} />
    </div>
  );
}

export default App;
