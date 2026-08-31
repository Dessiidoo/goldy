import { useState } from 'react';
import { Search, ShieldCheck, Database, Brain, Target, AlertTriangle, GitBranch } from 'lucide-react';

type Analysis = {
  subject: string;
  cutoff: string;
  evidenceCount: number;
  supportScore: number;
  contradictionScore: number;
  overlookedSignals: Array<{ id: string; label: string; category: string; direction: string; strength: number; observedAt: string }>;
  trajectories: Array<{ label: string; probability: number; rationale: string }>;
  rule: string;
};

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export default function Home() {
  const [subject, setSubject] = useState('');
  const [ran, setRan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const analyze = async () => {
    if (!subject.trim()) return;
    setRan(true);
    setLoading(true);
    setError('');
    setAnalysis(null);
    try {
      const normalized = subject.trim().toLowerCase();
      if (!normalized.includes('microsoft')) {
        throw new Error('The first connected blind test is Microsoft / Bill Gates. The general subject engine is not connected yet.');
      }
      const response = await fetch(`${API_BASE}/api/trajectory/microsoft-birth-test`, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`GoldDust API returned ${response.status}.`);
      const result = await response.json() as Analysis;
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GoldDust could not reach its analysis engine.');
    } finally {
      setLoading(false);
    }
  };

  return <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <div className="mb-10 max-w-3xl">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-primary"><span className="h-px w-6 bg-primary" />Predictive opportunity intelligence</div>
      <h1 className="font-display text-5xl leading-none text-accent sm:text-6xl">Find what everyone else is missing.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">GoldDust reconstructs the evidence available at a point in time, searches for patterns and contradictions, and maps possible trajectories without pretending to know what it cannot know.</p>
    </div>

    <section className="goldust-panel rounded-2xl p-6 sm:p-8">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Search size={18}/></div><div><h2 className="font-display text-2xl text-accent">Analyze an opportunity</h2><p className="text-xs text-muted-foreground">Start with a company, person, project, technology, or asset.</p></div></div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Subject</span><input value={subject} onChange={e => { setSubject(e.target.value); setRan(false); setAnalysis(null); setError(''); }} onKeyDown={e => { if (e.key === 'Enter') void analyze(); }} placeholder="e.g. Microsoft" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary" /></label>
        <button onClick={() => void analyze()} disabled={!subject.trim() || loading} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Analyzing…' : 'Analyze'}</button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground"><span className="rounded-full border border-primary/25 bg-primary/[.06] px-3 py-1.5 font-mono uppercase tracking-wider text-primary">Automatic historical analysis</span><span>GoldDust determines relevant timelines and protects the analysis from future information.</span></div>
    </section>

    {!ran && <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[[Database,'Evidence','Build the timeline from dated sources.'],[Brain,'Understand','Separate signal from noise.'],[GitBranch,'Challenge','Search for contradictory evidence.'],[Target,'Trajectory','Compare plausible next moves.']].map(([Icon,title,text]) => <div key={String(title)} className="rounded-2xl border border-border bg-card/40 p-5"><Icon size={18} className="mb-4 text-primary"/><p className="font-semibold text-accent">{String(title)}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{String(text)}</p></div>)}
    </div>}

    {ran && <section className="mt-8 space-y-4">
      {loading && <div className="rounded-2xl border border-primary/25 bg-primary/[.05] p-6"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary"><Brain size={14}/> GoldDust is analyzing</div><p className="mt-3 text-sm text-muted-foreground">Retrieving the connected historical trajectory and applying the blind cutoff.</p></div>}
      {error && <div className="rounded-2xl border border-destructive/30 bg-destructive/[.05] p-6"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-destructive"><AlertTriangle size={14}/> Analysis unavailable</div><p className="mt-3 text-sm text-muted-foreground">{error}</p></div>}
      {analysis && <>
        <div className="rounded-2xl border border-primary/25 bg-primary/[.05] p-5"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary"><ShieldCheck size={14}/> Blind historical analysis</div><p className="mt-3 text-lg font-semibold text-accent">{analysis.subject}</p><p className="mt-1 text-xs text-muted-foreground">Information cutoff: {analysis.cutoff} · {analysis.evidenceCount} admissible evidence points.</p></div>
        <div className="grid gap-4 md:grid-cols-2"><div className="goldust-panel rounded-2xl p-6"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Evidence balance</p><div className="mt-4 grid grid-cols-2 gap-4"><div><p className="text-2xl font-semibold text-accent">{analysis.supportScore}</p><p className="text-[10px] text-muted-foreground">support</p></div><div><p className="text-2xl font-semibold text-accent">{analysis.contradictionScore}</p><p className="text-[10px] text-muted-foreground">contradiction</p></div></div></div><div className="goldust-panel rounded-2xl p-6"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Overlooked signals</p><div className="mt-3 space-y-2">{analysis.overlookedSignals.map(signal => <div key={signal.id} className="text-xs text-muted-foreground"><span className="text-accent">{signal.label}</span> <span className="font-mono text-[9px]">({signal.category}, {signal.observedAt})</span></div>)}</div></div></div>
        <div className="goldust-panel rounded-2xl p-6"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Possible trajectories</p><div className="mt-4 space-y-4">{analysis.trajectories.map((trajectory, index) => <div key={trajectory.label}><div className="flex items-center justify-between gap-4"><p className="text-sm font-semibold text-accent">{index + 1}. {trajectory.label}</p><p className="font-mono text-sm text-primary">{Math.round(trajectory.probability * 100)}%</p></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{trajectory.rationale}</p></div>)}</div></div>
        <div className="flex items-start gap-2 rounded-xl border border-border p-4 text-xs text-muted-foreground"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary"/>{analysis.rule}</div>
      </>}
    </section>}
  </div>;
}
