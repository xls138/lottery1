import { useEffect, useState } from "react";
import type { Draw } from "./types";
import TotalSaleAmountTrendChart from "./components/charts/TotalSaleAmountTrendChart";
import StakeCountTrendChart from "./components/charts/StakeCountTrendChart";
import PoolBalanceAfterDrawTrendChart from "./components/charts/PoolBalanceAfterDrawTrendChart";

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
    </div>
  );
}

export default App;
