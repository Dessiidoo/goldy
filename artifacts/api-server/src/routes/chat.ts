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

async function generatePrediction(question: string, context: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const prompt = `You are Dawn, a cognitive predictive decision engine. The user may ask about ANY subject: a company, person, technology, project, investment, business idea, event, or other question.

Your job is to make a defensible prediction from the evidence supplied. Do not invent facts, numbers, sources, dates, or certainty. If evidence is insufficient, say so clearly instead of manufacturing a probability.

For a predictive question, respond in exactly this plain-English structure:
PREDICTION\n[one sentence defining the predicted outcome and timeframe]

PROBABILITIES\n[3 or 4 mutually exclusive outcomes, each with an integer probability; probabilities MUST total exactly 100%]

DAWN'S DECISION\n[one clear decision: PURSUE, WATCH, CONSIDER, AVOID, or INSUFFICIENT EVIDENCE]

WHY\n[3 concise evidence-based points]

WHAT COULD CHANGE IT\n[the strongest factor that could invalidate or materially change the prediction]

EVIDENCE QUALITY\n[HIGH, MODERATE, or LOW, with one short reason]

If the question is not predictive, answer it normally but still identify uncertainty when relevant. Never present a probability as a guarantee or as a promise of profit. Never tell the user that a specific dollar amount should be invested.

CURRENT MARKET CONTEXT (use only where relevant): ${context}\n\nUSER QUESTION: ${question}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 900 } }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || null;
  } catch {
    return null;
  }
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
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
  const generated = await generatePrediction(parsed.data.message, context);
  if (!generated) {
    req.log.warn("Prediction unavailable: GEMINI_API_KEY missing or synthesis request failed");
    res.status(503).json({ error: "Dawn could not complete the prediction because its reasoning service is unavailable. No synthetic prediction was generated." });
    return;
  }
  req.log.info({ aiMode: "dawn-predictive" }, "Dawn prediction generated");
  res.json(SendChatMessageResponse.parse({ message: generated, disclaimer, suggestedQuestions }));
});

export default router;
