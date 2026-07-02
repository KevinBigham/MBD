import { PageHelp } from '@/shared/components/PageHelp';

export default function TradePageHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Trade Center</h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Deadline pressure, incoming offers, and every deal from around the league.
        </p>
      </div>
      <PageHelp pageKey="trade" />
    </div>
  );
}
