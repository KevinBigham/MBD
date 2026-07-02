interface TradeExplanationFactorsProps {
  title: string;
  fairnessScore?: number | null;
  rosterValid?: boolean;
  rosterIssues?: readonly string[];
  marketSignal?: string;
  gmSignal?: string;
}

function valueCopy(fairnessScore: number | null | undefined): string {
  if (fairnessScore == null) return 'Value is pending until both sides have legal assets.';
  if (fairnessScore > 5) return 'Value leans toward the other club, so they may still want more from you.';
  if (fairnessScore < -5) return 'Value leans toward you, so this can look expensive for their room.';
  return 'Value is close enough for conversation if the baseball fit works.';
}

export default function TradeExplanationFactors({
  title,
  fairnessScore,
  rosterValid = true,
  rosterIssues = [],
  marketSignal = 'Market phase changes urgency and how patient the other GM can be.',
  gmSignal = 'GM personality and relationship affect patience, counter posture, and walk-away risk.',
}: TradeExplanationFactorsProps) {
  const factors = [
    { label: 'Value', copy: valueCopy(fairnessScore) },
    { label: 'Age / control / contract', copy: 'Younger, cheaper, controllable players usually cost more than equal-OVR rentals.' },
    { label: 'Team need', copy: 'A trade lands better when it solves their role need without creating a new hole.' },
    { label: 'Roster legality', copy: rosterValid ? 'Roster limits are not blocking the framework.' : rosterIssues[0] ?? 'A roster rule is blocking the framework.' },
    { label: 'Budget', copy: 'Salary, luxury-tax room, and future commitments can outweigh raw OVR.' },
    { label: 'GM personality', copy: gmSignal },
    { label: 'Relationship', copy: 'Recent trade memory can make a close proposal easier or harder to sell.' },
    { label: 'Market phase', copy: marketSignal },
  ] as const;

  return (
    <div className="mt-3 rounded border border-dynasty-border/70 bg-dynasty-surface/70 px-3 py-3">
      <div className="font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-muted">
        {title}
      </div>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {factors.map((factor) => (
          <div key={factor.label} className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-2">
            <div className="font-heading text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-info">
              {factor.label}
            </div>
            <p className="mt-1 font-heading text-xs text-dynasty-muted">{factor.copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
