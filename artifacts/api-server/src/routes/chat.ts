import { Router, type IRouter } from "express";
import { SendChatMessageBody, SendChatMessageResponse } from "@workspace/api-zod";
import { getMarketOverview, getSignals } from "../lib/market-data";

const router: IRouter = Router();

const disclaimer = "Educational market context only. Goldust is not a fiduciary, does not guarantee outcomes, and never places an order from this chat.";
const suggestedQuestions = [
  "Explain the difference between price momentum and a durable trend.",
  "How should I size a first Bitcoin position?",
  "What would make this signal invalid?",
];

function previewResponse(message: string, overview: Awaited<ReturnType<typeof getMarketOverview>>) {
  const normalized = message.toLowerCase();
  if (normalized.includes("bitcoin") || normalized.includes("crypto")) {
    return `The current crypto read is ${overview.breadth.sentiment.toLowerCase()} with Bitcoin at ${overview.crypto[0]?.changePercent.toFixed(2)}% over 24 hours. A disciplined approach is to define a maximum allocation, stage entries, and decide the invalidation rule before buying.`;
  }
  if (normalized.includes("sell") || normalized.includes("exit")) {
    return "A sell decision should answer three questions: has the thesis broken, has the position grown beyond its risk budget, and is there a better use for the capital? Price alone is not a complete thesis.";
  }
  if (normalized.includes("trend") || normalized.includes("market")) {
    return `Goldust currently reads the broader tape as ${overview.regime.toLowerCase()} with a regime score of ${overview.regimeScore}/100. Trends become more trustworthy when price, breadth, liquidity, and news tone point in the same direction.`;
  }
  return "Start with the decision, not the ticker: what is the goal, time horizon, maximum acceptable loss, and evidence that would change your mind? Goldust can then help you separate signal from noise.";
}

async function generateWithGemini(message: string, context: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12000),
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are Goldust, a sophisticated personal financial educator. Give concise, plain-English explanations grounded in the supplied market context. Never promise returns, never claim certainty, never instruct the user to bypass risk controls, and never place or imply an order was placed. If the user asks for a buy/sell decision, explain the decision framework and state the key risks. Use bullets when useful. Market context: ${context}\n\nUser question: ${message}`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.35, maxOutputTokens: 700 },
        }),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
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
  const overview = await getMarketOverview();
  const signals = await getSignals();
  const context = JSON.stringify({
    regime: overview.regime,
    regimeScore: overview.regimeScore,
    breadth: overview.breadth,
    watchlist: [...overview.indices, ...overview.crypto].map(({ symbol, price, changePercent }) => ({ symbol, price, changePercent })),
    signals: signals.map(({ asset, direction, confidence, thesis }) => ({ asset, direction, confidence, thesis })),
  });
  const generated = await generateWithGemini(parsed.data.message, context);
  const message = generated ?? `${previewResponse(parsed.data.message, overview)}${process.env.GEMINI_API_KEY ? "" : " Goldust is currently in educational preview mode; connect Gemini to unlock deeper live synthesis."}`;
  req.log.info({ aiMode: generated ? "gemini" : "preview" }, "Chat response generated");
  res.json(SendChatMessageResponse.parse({ message, disclaimer, suggestedQuestions }));
});

export default router;