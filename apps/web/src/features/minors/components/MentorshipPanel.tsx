import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';

interface MentorshipPairing {
  mentorId: string;
  protegeeId: string;
  mentorName: string;
  protegeeName: string;
  quality: number;
  compatibilityFactors: string[];
  developmentBonus: number;
}

interface MentorshipData {
  mentorCount: number;
  protegeeCount: number;
  pairings: MentorshipPairing[];
}

function qualityBadgeClasses(quality: number): string {
  if (quality >= 70) {
    return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
  }
  if (quality >= 40) {
    return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
  }
  return 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger';
}

export default function MentorshipPanel() {
  const { getMentorships, isReady } = useWorker();
  const [data, setData] = useState<MentorshipData | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getMentorships();
      setData(result as MentorshipData);
    } catch {
      // Silently handle — panel is non-critical
    }
  }, [getMentorships]);

  useEffect(() => {
    if (isReady) {
      void load();
    }
  }, [isReady, load]);

  return (
    <div className="rounded-lg bg-dynasty-elevated border border-dynasty-muted/10 p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-dynasty-muted" />
        <h3 className="font-heading text-sm text-dynasty-light">Mentorship Program</h3>
      </div>

      {data && (
        <p className="mt-2 font-data text-xs text-dynasty-muted">
          {data.mentorCount} mentors, {data.protegeeCount} eligible protegees, {data.pairings.length} active pairings
        </p>
      )}

      {data && data.pairings.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {data.pairings.map((pairing) => (
            <div
              key={`${pairing.mentorId}-${pairing.protegeeId}`}
              className="rounded border border-dynasty-border bg-dynasty-surface p-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/players/${pairing.mentorId}`}
                  className="font-heading text-sm text-dynasty-text hover:underline"
                >
                  {pairing.mentorName}
                </Link>
                <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-dynasty-muted" />
                <Link
                  to={`/players/${pairing.protegeeId}`}
                  className="font-heading text-sm text-accent-primary hover:underline"
                >
                  {pairing.protegeeName}
                </Link>

                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] ${qualityBadgeClasses(pairing.quality)}`}
                >
                  {pairing.quality}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <span className="font-data text-xs text-dynasty-muted">
                  +{(pairing.developmentBonus * 100).toFixed(1)}% dev
                </span>
                {pairing.compatibilityFactors.map((factor) => (
                  <span
                    key={factor}
                    className="rounded border border-dynasty-border bg-dynasty-elevated px-1.5 py-0.5 font-data text-[10px] text-dynasty-muted"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data ? (
        <p className="mt-3 text-sm text-dynasty-muted">
          No active mentorships. Veteran leaders mentor young prospects automatically.
        </p>
      ) : null}
    </div>
  );
}
