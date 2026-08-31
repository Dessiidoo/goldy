import { Router, type IRouter } from "express";
import { microsoftBirthTest } from "../lib/outlier-engine";

const router: IRouter = Router();

router.get("/trajectory/microsoft-birth-test", (_req, res): void => {
  res.json(microsoftBirthTest());
});

export default router;
