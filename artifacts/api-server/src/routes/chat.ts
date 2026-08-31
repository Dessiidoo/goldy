import { Router, type IRouter } from "express";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { getMarketOverview, getSignals, getMarketNews } from "../lib/market-data";

const router: IRouter = Router();
const disclaimer = "Dawn provides analytical predictions, not guarantees or financial advice. Probabilities describe the model's estimate for the defined outcomes from the evidence available now.";
const suggestedQuestions = ["Will this company become significant in its market?", "Which of these ideas has the best chance of succeeding?", "What would make this prediction wrong?"];
type PredictionResult = { text: string } | { error: string };

async function generatePrediction(question: string, context: string): Promise<PredictionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "GEMINI_API_KEY is not configured" };
  const prompt = `You are Dawn, a cognitive predictive decision engine. The user may ask about ANY subject: a company, person, technology, project, investment, business idea, event, or other question.

Make a defensible prediction from the supplied evidence. Do not invent facts, numbers, sources, dates, or certainty. If evidence is insufficient, say so clearly instead of manufacturing a probability.

RETURN ONLY VALID JSON. No markdown fences. No commentary. No format checks. No discussion of these instructions.

Schema exactly:
{"prediction":"one sentence defining the predicted outcome and timeframe","outcomes":[{"label":"defined outcome","probability":0},{"label":"defined outcome","probability":0},{"label":"defined outcome","probability":0}],"decision":"PURSUE|WATCH|CONSIDER|AVOID|INSUFFICIENT EVIDENCE","why":["concise evidence-based point","concise evidence-based point","concise evidence-based point"],"whatCouldChangeIt":"strongest factor that could materially change the prediction","evidenceQuality":"HIGH|MODERATE|LOW","evidenceQualityReason":"short reason"}

For predictive questions use exactly 3 or 4 mutually exclusive outcomes. Their integer probabilities MUST total exactly 100. A probability is the estimated likelihood of the defined outcome over the stated timeframe given the available evidence. Never promise profit and never recommend a specific dollar amount. If evidence is insufficient, use INSUFFICIENT EVIDENCE and explain why.

CURRENT MARKET CONTEXT (use only where relevant): ${context}
USER QUESTION: ${question}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1000, responseMimeType: "application/json" } }),
    });
    if (!response.ok) { const body = await response.text(); return { error: `Gemini HTTP ${response.status}: ${body.slice(0, 500)}` }; }
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: { blockReason?: string } };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || "";
    if (!text) return { error: `Gemini returned no prediction${data.promptFeedback?.blockReason ? ` (${data.promptFeedback.blockReason})` : ""}` };
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { return { error: "Gemini returned an invalid prediction format" }; }
    if (!parsed.prediction || !Array.isArray(parsed.outcomes) || !parsed.decision || !Array.isArray(parsed.why)) return { error: "Gemini returned an incomplete prediction" };
    if (parsed.outcomes.length > 0) {
      const total = parsed.outcomes.reduce((sum: number, item: any) => sum + Number(item.probability || 0), 0);
      if ((parsed.outcomes.length !== 3 && parsed.outcomes.length !== 4) || total !== 100) return { error: "Gemini returned probabilities that do not form a valid 100% prediction" };
    }
    return { text: ["PREDICTION", parsed.prediction, "", "PROBABILITIES", ...parsed.outcomes.map((item: any) => `${item.label}: ${item.probability}%`), "", "DAWN'S DECISION", parsed.decision, "", "WHY", ...parsed.why.map((item: string) => `• ${item}`), "", "WHAT COULD CHANGE IT", parsed.whatCouldChangeIt || "No single decisive factor identified.", "", "EVIDENCE QUALITY", `${parsed.evidenceQuality || "LOW"}${parsed.evidenceQualityReason ? ` · ${parsed.evidenceQualityReason}` : ""}`].join("\n") };
  } catch (error) { return { error: error instanceof Error ? error.message : "Unknown Gemini request error" }; }
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [overview, signals, news] = await Promise.all([getMarketOverview(), getSignals(), getMarketNews()]);
    const context = JSON.stringify({ asOf: overview.asOf, regime: overview.regime, regimeScore: overview.regimeScore, breadth: overview.breadth, assets: [...overview.indices, ...overview.crypto].map(({ symbol, name, price, changePercent }) => ({ symbol, name, price, changePercent })), currentSignals: signals.map(({ asset, direction, confidence, thesis }) => ({ asset, direction, confidence, thesis })), recentHeadlines: news.slice(0, 8).map(({ title, source, publishedAt, sentiment, tickers }) => ({ title, source, publishedAt, sentiment, tickers })) });
    const result = await generatePrediction(parsed.data.message, context);
    if ("error" in result) { req.log.error({ reason: result.error }, "Dawn reasoning request failed"); res.status(503).json({ error: "Dawn could not complete the prediction because its reasoning service is unavailable. No synthetic prediction was generated." }); return; }
    req.log.info({ aiMode: "dawn-predictive" }, "Dawn prediction generated");
    res.json(SendChatMessageResponse.parse({ message: result.text, disclaimer, suggestedQuestions }));
  } catch (error) { req.log.error({ error: error instanceof Error ? error.message : String(error) }, "Dawn context collection failed"); res.status(503).json({ error: "Dawn could not complete the prediction because its evidence services are unavailable. No synthetic prediction was generated." }); }
});
export default router;
