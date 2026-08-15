import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intelligenceRouter from "./intelligence";
import portfolioRouter from "./portfolio";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(intelligenceRouter);
router.use(portfolioRouter);
router.use(chatRouter);

export default router;
