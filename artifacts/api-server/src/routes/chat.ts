import { Router, type IRouter } from "express";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { getMarketOverview, getSignals, getMarketNews } from "../lib/market-data";

const router: IRouter = Router();
const disclaimer = "Dawn provides analytical predictions, not guarantees or financial advice. Probabilities describe the model's estimate for the defined outcomes from the evidence available now.";
const suggestedQuestions = ["Will this company become significant in its market?", "Which opportunity has the best chance of succeeding?", "What could make this prediction wrong?"];
type PredictionResult = { text: string } | { error: string };

// Gemini REST structured-output schemas use lowercase JSON/OpenAPI types.
const predictionSchema = {
  type: "object",
  properties: {
    prediction: { type: "string" },
    outcomes: {
      type: "array",
      minItems: 3,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          probability: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["label", "probability"],
      },
    },
    decision: { type: "string", enum: ["PURSUE", "WATCH", "CONSIDER", "AVOID", "INSUFFICIENT EVIDENCE"] },
    why: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    whatCouldChangeIt: { type: "string" },
    evidenceQuality: { type: "string", enum: ["HIGH", "MODERATE", "LOW"] },
    evidenceQualityReason: { type: "string" },
  },
  required: ["prediction", "outcomes", "decision", "why", "whatCouldChangeIt", "evidenceQuality", "evidenceQualityReason"],
};

function parsePrediction(text: string): any | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try { return JSON.parse(cleaned); } catch { return null; }
}

function isValidPrediction(parsed: any): boolean {
  if (!parsed?.prediction || !Array.isArray(parsed.outcomes) || !parsed.decision || !Array.isArray(parsed.why)) return false;
  if (parsed.outcomes.length !== 3 && parsed.outcomes.length !== 4) return false;
  const total = parsed.outcomes.reduce((sum: number, item: any) => sum + Number(item?.probability), 0);
  return parsed.outcomes.every((item: any) => item?.label && Number.isInteger(item?.probability) && item.probability >= 0 && item.probability <= 100) && total === 100;
}

async function generatePrediction(question: string, context: string): Promise<PredictionResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { error: "GEMINI_API_KEY is not configured" };

  const prompt = `You are Dawn, a cognitive predictive decision engine.

Make a defensible prediction from the supplied evidence. Do not invent facts, numbers, sources, dates, or certainty.

Return ONLY one JSON object matching the supplied schema. Do not use markdown fences.

Use exactly 3 or 4 mutually exclusive outcomes. Their integer probabilities MUST total exactly 100. If evidence is insufficient, use INSUFFICIENT EVIDENCE.

CURRENT MARKET CONTEXT (use only where relevant): ${context}
USER QUESTION: ${question}`;

  const models = ["gemini-3.7-flash", "gemini-3.6-flash"];
  let lastError = "Unknown Gemini request error";

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1500,
            responseMimeType: "application/json",
            responseSchema: predictionSchema,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = `Gemini ${model} HTTP ${response.status}: ${body.slice(0, 500)}`;
        if (response.status === 429 || response.status === 503) continue;
        return { error: lastError };
      }

      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: { blockReason?: string } };
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() || "";
      if (!text) {
        lastError = `Gemini ${model} returned no prediction${data.promptFeedback?.blockReason ? ` (${data.promptFeedback.blockReason})` : ""}`;
        continue;
      }

      const parsed = parsePrediction(text);
      if (!parsed) {
        lastError = `Gemini ${model} returned non-JSON prediction output`;
        continue;
      }
      if (!isValidPrediction(parsed)) {
        lastError = `Gemini ${model} returned an invalid prediction structure`;
        continue;
      }

      return { text: [
        "PREDICTION", parsed.prediction, "",
        "PROBABILITIES", ...parsed.outcomes.map((item: any) => `${item.label}: ${item.probability}%`), "",
        "DAWN'S DECISION", parsed.decision, "",
        "WHY", ...parsed.why.map((item: string) => `• ${item}`), "",
        "WHAT COULD CHANGE IT", parsed.whatCouldChangeIt, "",
        "EVIDENCE QUALITY", `${parsed.evidenceQuality} · ${parsed.evidenceQualityReason}`,
      ].join("\n") };
    } catch (error) {
      lastError = error instanceof Error ? `${model}: ${error.message}` : `${model}: Unknown Gemini request error`;
    }
  }

  return { error: lastError };
}

router.post("/chat", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
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
