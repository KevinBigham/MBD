import { DensePanel } from '@/shared/components/DensePanel';
import { humanizeLabel } from '@/shared/lib/labels';
import type { TradeDeadlineStateView } from '@/workers/sim.worker.trade';

type TradeMode = TradeDeadlineStateView['teamMode'];
type BudgetPressure = TradeDeadlineStateView['marketIntel'][number]['budgetPressure'];

function modeBadgeClass(mode: TradeMode): string {
  switch (mode) {
    case 'buyer':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'seller':
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function modeLabel(mode: TradeMode): string {
  switch (mode) {
    case 'buyer':
      return 'Buyer';
    case 'seller':
      return 'Seller';
    default:
      return 'Standing Pat';
  }
}

function budgetPressureLabel(pressure: BudgetPressure): string {
  switch (pressure) {
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    default:
      return 'Low';
  }
}

function budgetPressureClass(pressure: BudgetPressure): string {
  switch (pressure) {
    case 'high':
      return 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger';
    case 'medium':
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
  }
}

export default function DeadlineTheatreCard({
  deadlineState,
}: {
  deadlineState: TradeDeadlineStateView | null;
}) {
  if (!deadlineState) {
    return null;
  }
  const marketIntel = deadlineState.marketIntel ?? [];
  const warRoom = deadlineState.warRoom ?? null;

  return (
    <DensePanel
      title="Trade Deadline Theatre"
      subtitle={deadlineState.modeSummary}
      titleClassName="text-lg text-dynasty-textBright"
      subtitleClassName="mt-2 max-w-2xl font-heading text-sm normal-case tracking-normal text-dynasty-muted"
      headerClassName="xl:items-start"
      bodyClassName="space-y-4 p-4"
      meta={(
        <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
          <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {deadlineState.countdownLabel}
          </span>
          <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(deadlineState.teamMode)}`}>
            {modeLabel(deadlineState.teamMode)}
          </span>
        </div>
      )}
    >
      <div className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-3">
        <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Market State</p>
        <p className="mt-1 font-heading text-sm text-dynasty-text">
          {deadlineState.deadlineMode ? 'Phones are hot and the market is in deadline mode.' : 'The market is operating outside the final frenzy window.'}
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {deadlineState.chatter.map((item) => (
          <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-sm font-semibold text-dynasty-textBright">{item.headline}</p>
              <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(item.mode)}`}>
                {modeLabel(item.mode)}
              </span>
            </div>
            <p className="mt-2 font-heading text-xs text-dynasty-muted">{item.detail}</p>
          </div>
        ))}
      </div>

      {warRoom ? (
        <div className="rounded border border-accent-info/30 bg-accent-info/5 px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">Deadline War Room</p>
              <h3 className="mt-1 font-heading text-sm font-semibold text-dynasty-textBright">{warRoom.headline}</h3>
              <p className="mt-2 max-w-3xl font-heading text-xs text-dynasty-muted">{warRoom.detail}</p>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 text-right">
              <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                {warRoom.completedCheckpoints}/{warRoom.totalCheckpoints} checkpoints
              </p>
              <p className="mt-1 font-heading text-xs text-dynasty-text">
                {warRoom.nextCheckpointDay == null ? 'Final window' : `Next: Day ${warRoom.nextCheckpointDay}`}
              </p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {warRoom.callsToAction.map((action) => (
              <p key={action} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-text">
                {action}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {marketIntel.length > 0 ? (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Market Intelligence</p>
              <h3 className="mt-1 font-heading text-sm font-semibold text-dynasty-textBright">Pressure, needs, and budget heat</h3>
            </div>
            <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {marketIntel.length} clubs tracked
            </span>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {marketIntel.map((team) => (
              <div key={team.teamId} className="rounded border border-dynasty-border/80 bg-dynasty-surface/70 px-3 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-sm font-semibold text-dynasty-textBright">
                      {team.teamName}
                    </p>
                    <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {team.teamAbbreviation} · {team.personalityLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${modeBadgeClass(team.mode)}`}>
                      {team.posture}
                    </span>
                    <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${budgetPressureClass(team.budgetPressure)}`}>
                      {team.pressureLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded bg-dynasty-border">
                  <div
                    className="h-full rounded bg-accent-info"
                    style={{ width: `${team.pressureScore}%` }}
                  />
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <p className="font-heading text-xs text-dynasty-muted">
                    <span className="text-dynasty-text">Needs:</span> {team.needs.join(', ')}
                  </p>
                  <p className="font-heading text-xs text-dynasty-muted">
                    <span className="text-dynasty-text">Surplus:</span> {team.surplus.join(', ')}
                  </p>
                  <p className="font-heading text-xs text-dynasty-muted">
                    <span className="text-dynasty-text">Budget heat:</span> {budgetPressureLabel(team.budgetPressure)}
                  </p>
                  <p className="font-heading text-xs text-dynasty-muted">
                    <span className="text-dynasty-text">{team.activeOfferCount}</span> active {team.activeOfferCount === 1 ? 'call' : 'calls'}
                  </p>
                </div>

                <p className="mt-2 font-heading text-xs text-dynasty-muted">
                  {humanizeLabel(team.relationshipTier)} memory: {team.relationshipSummary ?? 'No trade memory logged'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </DensePanel>
  );
}
