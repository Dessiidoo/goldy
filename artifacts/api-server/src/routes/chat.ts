import { Router, type IRouter } from "express";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { getMarketOverview, getSignals, getMarketNews } from "../lib/market-data";

const router: IRouter = Router();
const disclaimer = "Dawn provides analytical predictions, not guarantees or financial advice. Probabilities describe the model's estimate for the defined outcomes from the evidence available now.";
const suggestedQuestions = [
  "Will this company become significant in its market?",
  "Which of these ideas has the best chance of succeeding?",
  "What would make this prediction wrong?",
];

type PredictionResult = { text: string } | { error: string };

async function generatePrediction(question: string, context: string): Promise<PredictionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "GEMINI_API_KEY is not configured" };

  const prompt = `You are Dawn, a cognitive predictive decision engine. The user may ask about ANY subject: a company, person, technology, project, investment, business idea, event, or other question.

Your job is to make a defensible prediction from the evidence supplied. Do not invent facts, numbers, sources, dates, or certainty. If evidence is insufficient, say so clearly instead of manufacturing a probability.

For a predictive question, respond in exactly this plain-English structure:
PREDICTION
[one sentence defining the predicted outcome and timeframe]

PROBABILITIES
[3 or 4 mutually exclusive outcomes, each with an integer probability; probabilities MUST total exactly 100%]

DAWN'S DECISION
[one clear decision: PURSUE, WATCH, CONSIDER, AVOID, or INSUFFICIENT EVIDENCE]

WHY
[3 concise evidence-based points]

WHAT COULD CHANGE IT
[the strongest factor that could invalidate or materially change the prediction]

EVIDENCE QUALITY
[HIGH, MODERATE, or LOW, with one short reason]

If the question is not predictive, answer it normally but still identify uncertainty when relevant. Never present a probability as a guarantee or as a promise of profit. Never tell the user that a specific dollar amount should be invested.

CURRENT MARKET CONTEXT (use only where relevant): ${context}\n\nUSER QUESTION: ${question}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 900 } }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { error: `Gemini HTTP ${response.status}: ${body.slice(0, 500)}` };
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: { blockReason?: string } };
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || "";
    if (!text) return { error: `Gemini returned no prediction${data.promptFeedback?.blockReason ? ` (${data.promptFeedback.blockReason})` : ""}` };
    return { text };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown Gemini request error" };
  }
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [overview, signals, news] = await Promise.all([getMarketOverview(), getSignals(), getMarketNews()]);
    const context = JSON.stringify({
      asOf: overview.asOf,
      regime: overview.regime,
      regimeScore: overview.regimeScore,
      breadth: overview.breadth,
      assets: [...overview.indices, ...overview.crypto].map(({ symbol, name, price, changePercent }) => ({ symbol, name, price, changePercent })),
      currentSignals: signals.map(({ asset, direction, confidence, thesis }) => ({ asset, direction, confidence, thesis })),
      recentHeadlines: news.slice(0, 8).map(({ title, source, publishedAt, sentiment, tickers }) => ({ title, source, publishedAt, sentiment, tickers })),
    });

    const result = await generatePrediction(parsed.data.message, context);
    if ("error" in result) {
      req.log.error({ reason: result.error }, "Dawn reasoning request failed");
      res.status(503).json({ error: "Dawn could not complete the prediction because its reasoning service is unavailable. No synthetic prediction was generated." });
      return;
    }

    req.log.info({ aiMode: "dawn-predictive" }, "Dawn prediction generated");
    res.json(SendChatMessageResponse.parse({ message: result.text, disclaimer, suggestedQuestions }));
  } catch (error) {
    req.log.error({ error: error instanceof Error ? error.message : String(error) }, "Dawn context collection failed");
    res.status(503).json({ error: "Dawn could not complete the prediction because its evidence services are unavailable. No synthetic prediction was generated." });
  }
});

export default router;
