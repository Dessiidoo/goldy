import { FormEvent, useState } from 'react';
import { ArrowUpRight, Loader2, Send } from 'lucide-react';
import { sendChatMessage } from '@workspace/api-client-react';

const STARTERS = [
  'Will AIandu become a significant AI company?',
  'Which opportunity should I be watching right now?',
  'What technology is most likely to break out next?',
];

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const message = question.trim();
    if (!message || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await sendChatMessage({ message });
      setAnswer(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dawn could not complete the prediction.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="mx-auto max-w-[980px] px-4 py-10 sm:px-8 lg:px-12 lg:py-16">
    <div className="reveal text-center">
      <p className="font-mono text-[10px] uppercase tracking-[.28em] text-primary">DAWN</p>
      <h1 className="mt-3 font-display text-5xl leading-none text-accent sm:text-7xl">Cognitive Predictive<br className="hidden sm:block" /> Decision Engine</h1>
      <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-muted-foreground">Ask Dawn anything. It will assess the evidence, weigh uncertainty, and tell you what it thinks is most likely.</p>
    </div>

    <form onSubmit={ask} className="reveal reveal-2 mx-auto mt-10 max-w-3xl">
      <div className="goldust-panel rounded-2xl p-3 shadow-lg">
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="What do you want to know?" rows={4} className="w-full resize-none bg-transparent px-3 py-2 text-base text-accent outline-none placeholder:text-muted-foreground" disabled={loading} aria-label="Ask Dawn a question" />
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <span className="hidden text-[10px] text-muted-foreground sm:block">Plain English is all you need.</span>
          <button type="submit" disabled={!question.trim() || loading} className="ml-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40">{loading ? <><Loader2 size={16} className="animate-spin" />Thinking…</> : <><Send size={16} />Ask Dawn</>}</button>
        </div>
      </div>
    </form>

    {!answer && !error && <div className="reveal reveal-3 mx-auto mt-7 max-w-3xl"><p className="mb-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Try one</p><div className="flex flex-col gap-2 sm:flex-row">{STARTERS.map((starter) => <button key={starter} type="button" onClick={() => setQuestion(starter)} className="group flex flex-1 items-center justify-between rounded-xl border border-border bg-card/30 px-4 py-3 text-left text-xs text-muted-foreground hover:border-primary/40 hover:text-accent"><span>{starter}</span><ArrowUpRight size={14} className="shrink-0 text-primary opacity-60" /></button>)}</div></div>}

    {loading && <div className="goldust-panel mx-auto mt-8 max-w-3xl rounded-2xl p-6"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 size={18} className="animate-spin text-primary" />Dawn is assessing the evidence…</div></div>}

    {error && <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-destructive/30 bg-destructive/5 p-6"><p className="font-semibold text-destructive">Prediction unavailable</p><p className="mt-2 text-sm text-muted-foreground">{error}</p></div>}

    {answer && <section className="goldust-panel reveal mx-auto mt-8 max-w-3xl rounded-2xl p-6 sm:p-8"><div className="mb-5 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/30 bg-primary/10 font-display text-lg text-primary">D</span><div><p className="font-mono text-[9px] uppercase tracking-wider text-primary">Dawn's assessment</p><p className="text-xs text-muted-foreground">Based on evidence available now</p></div></div><div className="whitespace-pre-wrap text-sm leading-7 text-accent">{answer}</div><button type="button" onClick={() => { setAnswer(null); setQuestion(''); }} className="mt-7 text-xs text-primary hover:underline">Ask another question</button></section>}

    <p className="mt-12 text-center text-[10px] leading-5 text-muted-foreground">Dawn's predictions are analytical estimates, not guarantees or financial advice. A probability describes a defined outcome under the available evidence and can change as evidence changes.</p>
  </div>;
}
