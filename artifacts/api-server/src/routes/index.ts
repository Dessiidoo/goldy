import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intelligenceRouter from "./intelligence";
import portfolioRouter from "./portfolio";
import chatRouter from "./chat";
import trajectoryRouter from "./trajectory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(intelligenceRouter);
router.use(portfolioRouter);
router.use(chatRouter);
router.use(trajectoryRouter);

export default router;
