type EvidenceItem = {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: "positive" | "neutral" | "negative";
  tickers: string[];
};

function classifyQuestion(question: string): string {
  const q = question.toLowerCase();
  const groups = [
    {
      terms: ["technology", "tech", "ai", "artificial intelligence", "machine learning", "semiconductor", "chip", "quantum", "robot", "robotics", "cybersecurity", "biotech", "biotechnology", "cloud", "software", "innovation"],
      query: "technology OR AI OR semiconductor OR robotics OR quantum OR cybersecurity OR biotech OR cloud OR software OR innovation",
    },
    {
      terms: ["crypto", "bitcoin", "ethereum", "solana", "digital asset", "defi", "blockchain"],
      query: "crypto OR bitcoin OR ethereum OR solana OR blockchain",
    },
    {
      terms: ["inflation", "interest rate", "fed", "federal reserve", "recession", "economy", "economic", "jobs", "employment", "gdp"],
      query: "inflation OR interest rates OR Federal Reserve OR recession OR economy OR employment OR GDP",
    },
    {
      terms: ["company", "stock", "share", "earnings", "revenue", "market", "invest", "investment", "sector"],
      query: "stocks OR earnings OR revenue OR markets OR investment OR sector",
    },
  ];
  return groups.find((group) => group.terms.some((term) => q.includes(term)))?.query
    ?? "technology OR AI OR stocks OR markets OR economy OR innovation";
}

export async function getQuestionEvidence(question: string): Promise<EvidenceItem[]> {
  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) return [];

  try {
    const query = classifyQuestion(question);
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=12&apiKey=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(6500), headers: { Accept: "application/json" } },
    );
    if (!response.ok) return [];
    const data = await response.json() as { articles?: Array<{ title?: string; source?: { name?: string }; publishedAt?: string; description?: string }> };
    return (data.articles ?? [])
      .filter((article) => article.title)
      .slice(0, 12)
      .map((article) => {
        const text = `${article.title ?? ""} ${article.description ?? ""}`;
        return {
          title: article.title ?? "Untitled headline",
          source: article.source?.name ?? "NewsAPI",
          publishedAt: article.publishedAt ?? new Date().toISOString(),
          sentiment: /surge|gain|growth|rally|upbeat|beats|breakthrough|launch|adoption/i.test(text)
            ? "positive"
            : /drop|fall|risk|crisis|weak|loss|lawsuit|cut/i.test(text)
              ? "negative"
              : "neutral",
          tickers: /bitcoin|crypto|ethereum|solana|blockchain/i.test(text) ? ["BTC"] : [],
        };
      });
  } catch {
    return [];
  }
}
