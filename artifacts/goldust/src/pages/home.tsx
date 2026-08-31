import { useState } from 'react';
import { Search, ShieldCheck, Database, Brain, Target, AlertTriangle, GitBranch } from 'lucide-react';

export default function Home() {
  const [subject, setSubject] = useState('');
  const [ran, setRan] = useState(false);

  const analyze = () => { if (subject.trim()) setRan(true); };

  return <div className="mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
    <div className="mb-10 max-w-3xl">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-primary"><span className="h-px w-6 bg-primary" />Predictive opportunity intelligence</div>
      <h1 className="font-display text-5xl leading-none text-accent sm:text-6xl">Find what everyone else is missing.</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">GoldDust reconstructs the evidence available at a point in time, searches for patterns and contradictions, and maps possible trajectories without pretending to know what it cannot know.</p>
    </div>

    <section className="goldust-panel rounded-2xl p-6 sm:p-8">
      <div className="mb-7 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary"><Search size={18}/></div><div><h2 className="font-display text-2xl text-accent">Analyze an opportunity</h2><p className="text-xs text-muted-foreground">Start with a company, person, project, technology, or asset.</p></div></div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <label className="block"><span className="mb-2 block font-mono text-[9px] uppercase tracking-[.18em] text-muted-foreground">Subject</span><input value={subject} onChange={e => { setSubject(e.target.value); setRan(false); }} placeholder="e.g. Microsoft" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-primary" /></label>
        <button onClick={analyze} disabled={!subject.trim()} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Analyze</button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground"><span className="rounded-full border border-primary/25 bg-primary/[.06] px-3 py-1.5 font-mono uppercase tracking-wider text-primary">Automatic historical analysis</span><span>GoldDust determines relevant timelines and protects the analysis from future information.</span></div>
    </section>

    {!ran && <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[[Database,'Evidence','Build the timeline from dated sources.'],[Brain,'Understand','Separate signal from noise.'],[GitBranch,'Challenge','Search for contradictory evidence.'],[Target,'Trajectory','Compare plausible next moves.']].map(([Icon,title,text]) => <div key={String(title)} className="rounded-2xl border border-border bg-card/40 p-5"><Icon size={18} className="mb-4 text-primary"/><p className="font-semibold text-accent">{String(title)}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{String(text)}</p></div>)}
    </div>}

    {ran && <section className="mt-8 space-y-4">
      <div className="rounded-2xl border border-primary/25 bg-primary/[.05] p-5"><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary"><ShieldCheck size={14}/> Analysis initialized</div><p className="mt-3 text-lg font-semibold text-accent">{subject}</p><p className="mt-1 text-xs text-muted-foreground">GoldDust will determine the relevant historical timeline and enforce the information cutoff automatically.</p></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="goldust-panel rounded-2xl p-6"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Evidence</p><p className="mt-3 text-sm text-muted-foreground">Waiting for source-backed evidence. No synthetic numbers are displayed.</p></div>
        <div className="goldust-panel rounded-2xl p-6"><p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Outlier factors</p><div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle size={15} className="text-primary"/> No outlier conclusion until evidence is available.</div></div>
      </div>
    </section>}
  </div>;
}
