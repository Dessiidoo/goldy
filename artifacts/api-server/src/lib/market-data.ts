type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  direction: "up" | "down" | "flat";
  sparkline: number[];
};

type NewsItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "neutral" | "negative";
  url: string;
  tickers: string[];
};

const fallbackQuotes: Quote[] = [
  { symbol: "SPY", name: "S&P 500", price: 646.22, change: 3.41, changePercent: 0.53, direction: "up", sparkline: [635, 638, 636, 641, 639, 644, 646] },
  { symbol: "QQQ", name: "Nasdaq 100", price: 574.91, change: 4.92, changePercent: 0.86, direction: "up", sparkline: [559, 562, 568, 564, 570, 572, 575] },
  { symbol: "DIA", name: "Dow Jones", price: 440.76, change: -0.38, changePercent: -0.09, direction: "down", sparkline: [443, 442, 444, 441, 442, 441, 441] },
];

const fallbackCrypto: Quote[] = [
  { symbol: "BTC", name: "Bitcoin", price: 118642.08, change: 1268.44, changePercent: 1.08, direction: "up", sparkline: [112, 113.5, 115, 114.4, 116.1, 117.2, 118.6].map((value) => value * 1000) },
  { symbol: "ETH", name: "Ethereum", price: 4291.64, change: 37.81, changePercent: 0.89, direction: "up", sparkline: [4040, 4110, 4078, 4160, 4210, 4250, 4292] },
  { symbol: "SOL", name: "Solana", price: 184.27, change: -1.12, changePercent: -0.60, direction: "down", sparkline: [189, 187, 190, 186, 185, 186, 184] },
];

const fallbackNews: NewsItem[] = [
  {
    id: "goldust-1",
    title: "Investors weigh resilient growth against a higher-for-longer rate path",
    source: "Goldust Market Desk",
    publishedAt: new Date().toISOString(),
    sentiment: "neutral",
    url: "https://www.reuters.com/markets/",
    tickers: ["SPY", "QQQ"],
  },
  {
    id: "goldust-2",
    title: "Bitcoin liquidity improves as digital asset flows turn constructive",
    source: "Goldust Crypto Desk",
    publishedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    sentiment: "positive",
    url: "https://www.coindesk.com/markets/",
    tickers: ["BTC", "ETH"],
  },
  {
    id: "goldust-3",
    title: "Defensive sectors regain attention as breadth stays selective",
    source: "Goldust Macro Desk",
    publishedAt: new Date(Date.now() - 1000 * 60 * 96).toISOString(),
    sentiment: "neutral",
    url: "https://www.ft.com/markets",
    tickers: ["DIA", "SPY"],
  },
];

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(6500),
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function directionFor(value: number): "up" | "down" | "flat" {
  if (value > 0.05) return "up";
  if (value < -0.05) return "down";
  return "flat";
}

function createSparkline(price: number, changePercent: number): number[] {
  const shape = [-0.8, -0.35, -0.52, 0.15, -0.08, 0.47, 1];
  const drift = changePercent / 100;
  return shape.map((offset, index) => Number((price * (1 + drift * offset + (index % 2 === 0 ? -0.001 : 0.001))).toFixed(2)));
}

async function getFinnhubQuotes(): Promise<Quote[]> {
  const token = process.env.FINNHUB_API_KEY;
  if (!token) return fallbackQuotes;

  const symbols = [
    ["SPY", "S&P 500"],
    ["QQQ", "Nasdaq 100"],
    ["DIA", "Dow Jones"],
  ] as const;
  const results = await Promise.all(
    symbols.map(async ([symbol, name]) => {
      const data = await getJson<{ c?: number; d?: number; dp?: number }>(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${encodeURIComponent(token)}`,
      );
      if (!data?.c || data.dp == null) return null;
      return {
        symbol,
        name,
        price: data.c,
        change: data.d ?? 0,
        changePercent: data.dp,
        direction: directionFor(data.dp),
        sparkline: createSparkline(data.c, data.dp),
      } satisfies Quote;
    }),
  );
  const quotes = results.filter((quote) => quote !== null) as Quote[];
  return quotes.length === symbols.length ? quotes : fallbackQuotes;
}

async function getCoinGeckoQuotes(): Promise<Quote[]> {
  const key = process.env.COINGECKO_API_KEY;
  const headers = key ? { "x-cg-demo-api-key": key } : undefined;
  const data = await getJson<Record<string, { usd?: number; usd_24h_change?: number }>>(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
    { headers },
  );
  if (!data?.bitcoin?.usd || !data.ethereum?.usd || !data.solana?.usd) return fallbackCrypto;

  const entries = [
    ["BTC", "Bitcoin", data.bitcoin],
    ["ETH", "Ethereum", data.ethereum],
    ["SOL", "Solana", data.solana],
  ] as const;
  return entries.map(([symbol, name, value]) => {
    const changePercent = value.usd_24h_change ?? 0;
    const price = value.usd ?? 0;
    return {
      symbol,
      name,
      price,
      change: Number((price * changePercent / 100).toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      direction: directionFor(changePercent),
      sparkline: createSparkline(price, changePercent),
    };
  });
}

export async function getMarketOverview() {
  const [indices, crypto] = await Promise.all([getFinnhubQuotes(), getCoinGeckoQuotes()]);
  const all = [...indices, ...crypto];
  const averageChange = all.reduce((sum, quote) => sum + quote.changePercent, 0) / all.length;
  const regime = averageChange > 0.7 ? "Risk on" : averageChange < -0.7 ? "Risk off" : "Selective";
  const regimeScore = Math.max(0, Math.min(100, Math.round(50 + averageChange * 16)));
  const advancing = all.filter((quote) => quote.direction === "up").length * 21;
  const declining = all.filter((quote) => quote.direction === "down").length * 17;

  return {
    asOf: new Date().toISOString(),
    regime,
    regimeScore,
    indices,
    crypto,
    breadth: {
      advancing: Math.max(1, advancing),
      declining: Math.max(1, declining),
      sentiment: averageChange > 0.35 ? "Constructive" : averageChange < -0.35 ? "Cautious" : "Balanced",
    },
  };
}

export async function getMarketNews(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) return fallbackNews;

  const data = await getJson<{
    articles?: Array<{
      title?: string;
      source?: { name?: string };
      publishedAt?: string;
      url?: string;
      description?: string;
    }>;
  }>(
    `https://newsapi.org/v2/everything?q=stock%20market%20OR%20bitcoin%20OR%20inflation&language=en&sortBy=publishedAt&pageSize=8&apiKey=${encodeURIComponent(apiKey)}`,
  );
  const articles = data?.articles ?? [];
  if (articles.length === 0) return fallbackNews;
  return articles
    .filter((article) => article.title && article.url)
    .slice(0, 8)
    .map((article, index) => ({
      id: `news-${index}-${article.publishedAt ?? "unknown"}`,
      title: article.title ?? "Untitled market headline",
      source: article.source?.name ?? "NewsAPI",
      publishedAt: article.publishedAt ?? new Date().toISOString(),
      sentiment: /surge|gain|growth|rally|upbeat|beats/i.test(`${article.title} ${article.description ?? ""}`)
        ? "positive"
        : /drop|fall|risk|crisis|weak|loss/i.test(`${article.title} ${article.description ?? ""}`)
          ? "negative"
          : "neutral",
      url: article.url ?? "https://newsapi.org/",
      tickers: /bitcoin|crypto|ethereum/i.test(`${article.title} ${article.description ?? ""}`)
        ? ["BTC"]
        : ["SPY"],
    })) as NewsItem[];
}

export async function getSignals() {
  const [overview, news] = await Promise.all([getMarketOverview(), getMarketNews()]);
  const btc = overview.crypto.find((quote) => quote.symbol === "BTC") ?? fallbackCrypto[0];
  const spy = overview.indices.find((quote) => quote.symbol === "SPY") ?? fallbackQuotes[0];
  const positiveNews = news.filter((item) => item.sentiment === "positive").length;
  return [
    {
      id: "signal-btc",
      asset: "BTC",
      thesis: btc.changePercent >= 0
        ? "Momentum is constructive, but the move still needs disciplined sizing and a defined invalidation level."
        : "Crypto momentum is softening; wait for confirmation rather than averaging into a falling tape.",
      direction: btc.changePercent >= 0.3 ? "accumulate" : btc.changePercent <= -0.7 ? "reduce" : "watch",
      confidence: Math.round(Math.min(88, 54 + Math.abs(btc.changePercent) * 8)),
      horizon: "2–6 weeks",
      drivers: ["24-hour price momentum", overview.breadth.sentiment, "Liquidity and headline tone"],
      risk: "High volatility and gap risk; use a small allocation and predefined exit rules.",
      sources: ["CoinGecko", "Goldust market breadth"],
    },
    {
      id: "signal-spy",
      asset: "SPY",
      thesis: spy.changePercent >= 0
        ? "Index trend remains constructive while breadth is selective; favor gradual entries over chasing."
        : "Index action is hesitant; protect cash and wait for breadth to improve.",
      direction: spy.changePercent >= 0.4 && positiveNews >= 1 ? "accumulate" : spy.changePercent <= -0.7 ? "reduce" : "watch",
      confidence: Math.round(Math.min(84, 58 + Math.abs(spy.changePercent) * 7)),
      horizon: "1–3 months",
      drivers: ["S&P 500 trend", `${overview.breadth.advancing} advancing units`, `${positiveNews} constructive headlines`],
      risk: "Macro surprises can reverse short-term momentum; signals are directional, not guarantees.",
      sources: ["Finnhub", "NewsAPI", "Goldust market breadth"],
    },
    {
      id: "signal-cash",
      asset: "Cash reserve",
      thesis: "Keeping dry powder is itself a position while the tape stays selective.",
      direction: "watch",
      confidence: 72,
      horizon: "This week",
      drivers: ["Selective breadth", "Optionality for pullbacks", "Nest-egg preservation"],
      risk: "Cash can lag during a fast upside move; define a staged deployment plan.",
      sources: ["Goldust risk framework"],
    },
  ];
}