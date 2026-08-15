import { Router, type IRouter } from "express";
import {
  GetMarketNewsResponse,
  GetMarketOverviewResponse,
  GetSignalsResponse,
} from "@workspace/api-zod";
import {
  getMarketNews,
  getMarketOverview,
  getSignals,
} from "../lib/market-data";

const router: IRouter = Router();

router.get("/market/overview", async (req, res): Promise<void> => {
  const overview = await getMarketOverview();
  req.log.info({ regime: overview.regime }, "Market overview refreshed");
  res.json(GetMarketOverviewResponse.parse(overview));
});

router.get("/market/news", async (_req, res): Promise<void> => {
  const news = await getMarketNews();
  res.json(GetMarketNewsResponse.parse(news));
});

router.get("/signals", async (req, res): Promise<void> => {
  const signals = await getSignals();
  req.log.info({ signalCount: signals.length }, "Signals refreshed");
  res.json(GetSignalsResponse.parse(signals));
});

export default router;