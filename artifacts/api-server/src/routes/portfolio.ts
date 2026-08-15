import { Router, type IRouter } from "express";
import {
  AddContributionBody,
  AddContributionResponse,
  GetPortfolioResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const holdings = [
  { symbol: "SPY", name: "S&P 500 ETF", quantity: 0.72, value: 465.28, allocation: 55, changePercent: 2.8 },
  { symbol: "BTC", name: "Bitcoin", quantity: 0.0026, value: 307.47, allocation: 36, changePercent: 8.4 },
  { symbol: "CASH", name: "Reserve", quantity: 1, value: 76.2, allocation: 9, changePercent: 0 },
];
let contributionTotal = 850;

function getPortfolio() {
  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);
  const invested = totalValue - holdings.find((holding) => holding.symbol === "CASH")!.value;
  const gain = totalValue - contributionTotal;
  return {
    mode: "paper" as const,
    totalValue: Number(totalValue.toFixed(2)),
    invested: Number(invested.toFixed(2)),
    gain: Number(gain.toFixed(2)),
    gainPercent: Number(((gain / contributionTotal) * 100).toFixed(2)),
    cash: holdings.find((holding) => holding.symbol === "CASH")!.value,
    holdings: holdings.map((holding) => ({ ...holding })),
    goal: {
      label: "First $10,000",
      target: 10000,
      progress: Number((totalValue / 10000).toFixed(4)),
    },
  };
}

router.get("/portfolio", (_req, res): void => {
  res.json(GetPortfolioResponse.parse(getPortfolio()));
});

router.post("/portfolio/contributions", (req, res): void => {
  const parsed = AddContributionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  contributionTotal += parsed.data.amount;
  const reserve = holdings.find((holding) => holding.symbol === "CASH");
  if (reserve) reserve.value += parsed.data.amount;
  res.json(AddContributionResponse.parse(getPortfolio()));
});

export default router;