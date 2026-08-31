import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, RefreshCw } from 'lucide-react';
import { useGetSignals, getGetSignalsQueryKey } from '@workspace/api-client-react';
import { ErrorBlock, LoadingBlock } from '@/components/goldust-ui';

export default function Home() {
  const query = useGetSignals({
    query: { queryKey: getGetSignalsQueryKey() },
  });
  const signals = useMemo(
    () => (query.data ?? []).slice().sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)),
    [query.data],
  );
  const label = (direction: string) => direction === 'accumulate' ? 'BUY' : direction === 'reduce' ? 'REDUCE' : 'WATCH';
  const Icon = (direction: string) => direction === 'accumulate' ? ArrowUpRight : direction === 'reduce' ? ArrowDownRight : Minus;

  return <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-8 lg:px-12 lg:py-10">
    <div className="mb-8 flex items-end justify-between gap-4">
      <div><p className="font-mono text-[10px] uppercase tracking-[.22em] text-primary">Predictive opportunity intelligence</p><h1 className="mt-2 font-display text-4xl leading-none text-accent sm:text-5xl">Opportunities</h1></div>
      <button type="button" onClick={() => void query.refetch()} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-primary"><RefreshCw size={14} />Refresh</button>
    </div>

    {query.isLoading ? <div className="goldust-panel rounded-2xl p-6"><LoadingBlock lines={5} /></div> : query.isError ? <ErrorBlock label="LIVE DATA UNAVAILABLE. GoldDust could not retrieve current opportunities." /> : !signals.length ? <div className="goldust-panel rounded-2xl p-8 text-center"><p className="font-semibold text-accent">No opportunities detected right now.</p><p className="mt-2 text-sm text-muted-foreground">GoldDust will not manufacture a signal when the evidence is not there.</p></div> : <div className="space-y-8">
      <OpportunityGroup title="Top opportunities" signals={signals} label={label} Icon={Icon} />
    </div>}

    <p className="mt-8 text-center text-[10px] leading-5 text-muted-foreground">GoldDust's assessments are based on available evidence and are not guarantees or financial advice. Decisions remain yours.</p>
  </div>;
}

function OpportunityGroup({ title, signals, label, Icon }: { title: string; signals: any[]; label: (direction: string) => string; Icon: (direction: string) => typeof ArrowUpRight }) {
  return <section><div className="mb-3 flex items-center justify-between"><h2 className="font-display text-2xl text-accent">{title}</h2><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Live signals</span></div><div className="overflow-hidden rounded-2xl border border-border bg-card/30">
    <div className="hidden grid-cols-[1fr_110px_120px_110px] border-b border-border px-5 py-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground sm:grid"><span>Opportunity</span><span>Type</span><span>GoldDust</span><span>Risk</span></div>
    {signals.map((signal, index) => { const ActionIcon = Icon(signal.direction); return <article key={signal.id} className="grid gap-3 border-b border-border px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_110px_120px_110px] sm:items-center sm:px-5" data-testid={`opportunity-${signal.id}`}>
      <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">#{index + 1}</span><h3 className="truncate font-semibold text-accent">{signal.asset}</h3></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.thesis}</p><p className="mt-2 text-[10px] text-muted-foreground sm:hidden">{signal.horizon} horizon · Risk: {signal.risk}</p></div>
      <div className="hidden text-xs text-muted-foreground sm:block">{signal.assetType ?? 'Asset'}</div>
      <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg border border-primary/25 bg-primary/10 text-primary"><ActionIcon size={15} /></span><div><p className="font-semibold text-accent">{signal.confidence}%</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label(signal.direction)}</p></div></div>
      <div className="hidden text-xs text-muted-foreground sm:block">{signal.risk}</div>
    </article>; })}
  </div></section>;
}
