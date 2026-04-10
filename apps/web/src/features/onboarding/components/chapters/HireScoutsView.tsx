/**
 * Hire Scouts View
 *
 * Chapter 5 of the revised onboarding. Player hires a scouting director
 * from three specialty archetypes (draft, international, pro). The
 * director's specialty replaces the legacy "scoutingFocus" GMPhilosophy
 * field -- whoever you hire IS your focus.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Globe, Minus, Search, Telescope } from 'lucide-react';
import type {
  AGMStaffOpinion,
  ScoutingDirectorCandidate,
  ScoutingHiringSlate,
} from '@mbd/sim-core';

const SPECIALTY_ICONS: Record<string, React.ReactNode> = {
  draft: <Telescope className="h-5 w-5 text-accent-primary" />,
  international: <Globe className="h-5 w-5 text-accent-primary" />,
  pro_scouting: <Search className="h-5 w-5 text-accent-primary" />,
};

const SPECIALTY_LABELS: Record<string, string> = {
  draft: 'Amateur Draft',
  international: 'International',
  pro_scouting: 'Pro Scouting',
};

interface Props {
  slate: ScoutingHiringSlate;
  opinions: Record<string, AGMStaffOpinion>;
  onConfirm: (scoutingDirectorId: string) => void;
  isSubmitting?: boolean;
}

export function HireScoutsView({ slate, opinions, onConfirm, isSubmitting = false }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedId == null) return;
    onConfirm(selectedId);
  };

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-5">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-accent-primary">
          Scouting Director. This hire shapes your next decade.
        </h3>
        <p className="mt-2 font-data text-xs leading-relaxed text-dynasty-muted">
          You won&apos;t see your scouting director every day, but they decide your future.
          Draft, international, pro scouting -- whichever specialty they lead becomes your
          organization&apos;s lens on player acquisition.
        </p>
      </div>

      {/* Candidate cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {slate.candidates.map((candidate) => (
          <ScoutCard
            key={candidate.id}
            candidate={candidate}
            opinion={opinions[candidate.id] ?? null}
            isSelected={selectedId === candidate.id}
            onSelect={() => setSelectedId(candidate.id)}
          />
        ))}
      </div>

      {/* Confirm */}
      <div className="flex items-center justify-end gap-4 border-t border-dynasty-border pt-5">
        {selectedId == null && (
          <span className="font-data text-xs text-dynasty-muted">Choose a scouting director</span>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedId == null || isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm Hire
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ScoutCardProps {
  candidate: ScoutingDirectorCandidate;
  opinion: AGMStaffOpinion | null;
  isSelected: boolean;
  onSelect: () => void;
}

function ScoutCard({ candidate, opinion, isSelected, onSelect }: ScoutCardProps) {
  const icon = SPECIALTY_ICONS[candidate.specialty] ?? <Search className="h-5 w-5 text-accent-primary" />;
  const label = SPECIALTY_LABELS[candidate.specialty] ?? candidate.specialty;

  const opinionLabel = useMemo(() => {
    if (!opinion) return null;
    switch (opinion.agreementLevel) {
      case 'recommend':
        return {
          label: 'AGM Recommends',
          icon: <Check className="h-3 w-3" />,
          cls: 'border-accent-primary/60 bg-accent-primary/10 text-accent-primary',
        };
      case 'caution':
        return {
          label: 'AGM Cautions',
          icon: <CircleAlert className="h-3 w-3" />,
          cls: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
        };
      default:
        return {
          label: 'AGM Neutral',
          icon: <Minus className="h-3 w-3" />,
          cls: 'border-dynasty-border/60 bg-dynasty-bg/40 text-dynasty-muted',
        };
    }
  }, [opinion]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col rounded-lg border p-5 text-left transition-all ${
        isSelected
          ? 'border-accent-primary bg-accent-primary/10 shadow-md shadow-accent-primary/20'
          : 'border-dynasty-border bg-dynasty-surface/40 hover:border-dynasty-text/30'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded bg-accent-primary/10 p-2">{icon}</div>
        <span className="font-data text-[10px] uppercase tracking-wider text-dynasty-muted">
          Age {candidate.age} &middot; {candidate.experience}y
        </span>
      </div>

      {/* Name + specialty */}
      <h5 className="font-heading text-base font-bold text-dynasty-text">{candidate.name}</h5>
      <p className="mt-0.5 font-data text-[11px] uppercase tracking-wider text-accent-primary">
        {label}
      </p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded border border-dynasty-border/40 bg-dynasty-bg/40 px-2 py-1.5 text-center">
          <span className="block font-data text-[9px] uppercase text-dynasty-muted">Network</span>
          <span className="block font-data text-sm font-semibold text-dynasty-text">
            {candidate.networkStrength}
          </span>
        </div>
        <div className="rounded border border-dynasty-border/40 bg-dynasty-bg/40 px-2 py-1.5 text-center">
          <span className="block font-data text-[9px] uppercase text-dynasty-muted">Eval</span>
          <span className="block font-data text-sm font-semibold text-dynasty-text">
            {candidate.evaluationAccuracy}
          </span>
        </div>
      </div>

      {/* Strengths */}
      <div className="mt-4 space-y-1">
        {candidate.strengths.map((strength, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-accent-primary/80" />
            <span className="font-data text-[11px] leading-snug text-dynasty-text">{strength}</span>
          </div>
        ))}
      </div>

      {/* AGM opinion */}
      {opinionLabel && (
        <div className={`mt-3 inline-flex items-center gap-1 self-start rounded border px-2 py-1 font-data text-[10px] ${opinionLabel.cls}`}>
          {opinionLabel.icon}
          {opinionLabel.label}
        </div>
      )}
      {opinion && opinion.lines[0] && (
        <p className="mt-2 border-l border-dynasty-border/40 pl-2 font-data text-[10px] italic leading-snug text-dynasty-muted">
          &ldquo;{opinion.lines[0].text}&rdquo;
        </p>
      )}
    </button>
  );
}
