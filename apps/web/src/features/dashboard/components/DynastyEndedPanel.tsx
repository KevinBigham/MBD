interface DynastyEndedPanelProps {
  endReason: string | null;
}

export default function DynastyEndedPanel({ endReason }: DynastyEndedPanelProps) {
  return (
    <section className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-4">
      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-danger">Dynasty Ended</div>
      <div className="mt-2 font-heading text-sm text-dynasty-textBright">
        {endReason ?? 'Ownership ended this front office run.'}
      </div>
    </section>
  );
}
