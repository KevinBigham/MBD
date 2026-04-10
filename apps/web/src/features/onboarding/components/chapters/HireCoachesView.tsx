/**
 * Hire Coaches View
 *
 * Chapter 3 of the revised onboarding. Player hires manager, pitching
 * coach, and hitting coach from pre-generated candidate slates. Each
 * candidate shows strengths, specialty, teaching grade, and the
 * selected AGM's opinion of them.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Minus } from 'lucide-react';
import type {
  AGMStaffOpinion,
  StaffCandidate,
  StaffHireChoices,
  StaffHiringSlate,
} from '@mbd/sim-core';

interface Props {
  slate: StaffHiringSlate;
  opinions: Record<string, AGMStaffOpinion>;
  onConfirm: (hires: StaffHireChoices) => void;
  isSubmitting?: boolean;
}

export function HireCoachesView({ slate, opinions, onConfirm, isSubmitting = false }: Props) {
  const [managerId, setManagerId] = useState<string | null>(null);
  const [pitchingCoachId, setPitchingCoachId] = useState<string | null>(null);
  const [hittingCoachId, setHittingCoachId] = useState<string | null>(null);

  const allSelected = managerId != null && pitchingCoachId != null && hittingCoachId != null;

  const handleConfirm = () => {
    if (!allSelected) return;
    onConfirm({
      managerId,
      pitchingCoachId,
      hittingCoachId,
    });
  };

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-5">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-accent-primary">
          Offices are empty. Let&apos;s fill them.
        </h3>
        <p className="mt-2 font-data text-xs leading-relaxed text-dynasty-muted">
          Previous staff walked out with the old GM. Manager, pitching coach, hitting coach --
          these three hires shape how the club feels every day. Your Assistant GM will weigh in
          on each candidate. Final call is yours.
        </p>
      </div>

      {/* Manager section */}
      <RoleSection
        title="Manager"
        subtitle="Sets the tone. Decides who plays. Runs the clubhouse."
        candidates={slate.managerCandidates}
        opinions={opinions}
        selectedId={managerId}
        onSelect={setManagerId}
      />

      {/* Pitching coach section */}
      <RoleSection
        title="Pitching Coach"
        subtitle="Shapes arm development and game-day strategy."
        candidates={slate.pitchingCoachCandidates}
        opinions={opinions}
        selectedId={pitchingCoachId}
        onSelect={setPitchingCoachId}
      />

      {/* Hitting coach section */}
      <RoleSection
        title="Hitting Coach"
        subtitle="Owns the at-bat. Approach or power -- pick your philosophy."
        candidates={slate.hittingCoachCandidates}
        opinions={opinions}
        selectedId={hittingCoachId}
        onSelect={setHittingCoachId}
      />

      {/* Confirm button */}
      <div className="flex items-center justify-end gap-4 border-t border-dynasty-border pt-5">
        <span className="font-data text-xs text-dynasty-muted">
          {[managerId, pitchingCoachId, hittingCoachId].filter(Boolean).length}/3 roles filled
        </span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!allSelected || isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Confirm Hires
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface RoleSectionProps {
  title: string;
  subtitle: string;
  candidates: readonly StaffCandidate[];
  opinions: Record<string, AGMStaffOpinion>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function RoleSection({ title, subtitle, candidates, opinions, selectedId, onSelect }: RoleSectionProps) {
  return (
    <section>
      <div className="mb-3">
        <h4 className="font-heading text-base font-bold text-dynasty-text">{title}</h4>
        <p className="font-data text-xs text-dynasty-muted">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            opinion={opinions[candidate.id] ?? null}
            isSelected={selectedId === candidate.id}
            onSelect={() => onSelect(candidate.id)}
          />
        ))}
      </div>
    </section>
  );
}

interface CandidateCardProps {
  candidate: StaffCandidate;
  opinion: AGMStaffOpinion | null;
  isSelected: boolean;
  onSelect: () => void;
}

function CandidateCard({ candidate, opinion, isSelected, onSelect }: CandidateCardProps) {
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
      className={`flex flex-col rounded-lg border p-4 text-left transition-all ${
        isSelected
          ? 'border-accent-primary bg-accent-primary/10 shadow-md shadow-accent-primary/20'
          : 'border-dynasty-border bg-dynasty-surface/40 hover:border-dynasty-text/30'
      }`}
    >
      {/* Name + style */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h5 className="font-heading text-sm font-bold text-dynasty-text">{candidate.name}</h5>
          <p className="mt-0.5 font-data text-[10px] uppercase tracking-wider text-accent-primary">
            {candidate.style.replaceAll('_', ' ')} &middot; Age {candidate.age}
          </p>
        </div>
        <div className="text-center">
          <span className="block font-data text-[9px] uppercase text-dynasty-muted">Teach</span>
          <span className="block font-data text-sm font-semibold text-dynasty-text">
            {candidate.teachingGrade}
          </span>
        </div>
      </div>

      {/* Specialty */}
      <p className="mt-2 font-data text-[11px] text-dynasty-muted">{candidate.specialty}</p>

      {/* Strengths */}
      <div className="mt-3 space-y-1">
        {candidate.strengths.map((strength, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-accent-primary/80" />
            <span className="font-data text-[10px] leading-snug text-dynasty-text">{strength}</span>
          </div>
        ))}
      </div>

      {/* AGM opinion pill */}
      {opinionLabel && (
        <div className={`mt-3 inline-flex items-center gap-1 self-start rounded border px-2 py-1 font-data text-[10px] ${opinionLabel.cls}`}>
          {opinionLabel.icon}
          {opinionLabel.label}
        </div>
      )}

      {/* AGM opinion lines */}
      {opinion && opinion.lines[0] && (
        <p className="mt-2 border-l border-dynasty-border/40 pl-2 font-data text-[10px] italic leading-snug text-dynasty-muted">
          &ldquo;{opinion.lines[0].text}&rdquo;
        </p>
      )}
    </button>
  );
}
