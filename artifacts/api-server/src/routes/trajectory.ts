import { Router, type IRouter } from "express";
import { analyzeTrajectory, microsoftBirthTest, type Evidence } from "../lib/outlier-engine";

const router: IRouter = Router();

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "GoldDust/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

async function liveSubjectAnalysis(subject: string) {
  const title = encodeURIComponent(subject.trim().replace(/\s+/g, "_"));
  const summary = await getJson<{ title?: string; extract?: string; description?: string }>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const text = `${summary?.extract ?? ""} ${summary?.description ?? ""}`.trim();
  if (!text) throw new Error("GoldDust could not find a source-backed historical record for this subject.");

  const years = text.match(/\b(19|20)\d{2}\b/g)?.map(Number).filter((year) => year >= 1900 && year <= new Date().getFullYear()).sort((a, b) => a - b) ?? [];
  const firstYear = years[0] ?? new Date().getFullYear();
  const cutoff = `${firstYear}-12-31`;
  const evidence: Evidence[] = [
    { id: "live-summary", label: text.slice(0, 320), category: "world", direction: "supports", strength: 0.55, observedAt: `${firstYear}-01-01` },
    { id: "live-description", label: summary?.description ?? "Historical subject record", category: "business", direction: "supports", strength: 0.45, observedAt: `${firstYear}-06-01` },
  ];
  return analyzeTrajectory(subject.trim(), cutoff, evidence);
}

router.get("/trajectory/analyze", async (req, res): Promise<void> => {
  const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : "";
  if (!subject) { res.status(400).json({ error: "subject is required" }); return; }
  try { res.json(await liveSubjectAnalysis(subject)); }
  catch (error) { res.status(502).json({ error: error instanceof Error ? error.message : "Live historical analysis failed." }); }
});

router.get("/trajectory/microsoft-birth-test", (_req, res): void => {
  res.json(microsoftBirthTest());
});

export default router;
