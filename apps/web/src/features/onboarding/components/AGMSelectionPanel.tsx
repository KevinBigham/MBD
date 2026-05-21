/**
 * AGM Selection Panel
 *
 * First screen of the revised "Day 1" onboarding. Shows three fixed
 * AGM candidates (Marcus Chen, Walt Kowalski, Elena Vargas) as cards,
 * with strengths, weaknesses, and a selection-screen bio. The player
 * picks one and the rest of the onboarding is narrated by that AGM.
 */
import { useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Calculator,
  Check,
  CircleAlert,
  LineChart,
  Search,
  UserCog,
} from 'lucide-react';
import type { AGMCandidate, AGMCandidateId } from '@mbd/sim-core';
import { humanizeLabel } from '@/shared/lib/labels';

const BACKGROUND_ICONS: Record<string, React.ReactNode> = {
  former_player: <UserCog className="h-6 w-6 text-accent-primary" />,
  career_scout: <Search className="h-6 w-6 text-accent-primary" />,
  front_office_lifer: <Briefcase className="h-6 w-6 text-accent-primary" />,
  analytics_pioneer: <LineChart className="h-6 w-6 text-accent-primary" />,
  old_school_baseball_man: <Calculator className="h-6 w-6 text-accent-primary" />,
};

const OPENING_SCENE_LINES = [
  'You were hired at 9:47 AM. The previous GM was escorted out at 9:43.',
  'His office is empty except for a desk, a phone, and three manila folders.',
  'The phone is ringing. It\'s the owner. He wants to meet in ten minutes.',
  'The folders are labeled: CHEN, MARCUS -- VARGAS, ELENA -- KOWALSKI, WALTER. Assistant GM candidates. Your first decision.',
] as const;

interface Props {
  candidates: readonly AGMCandidate[];
  onSelect: (agmId: AGMCandidateId) => void;
  isLoading?: boolean;
}

export function AGMSelectionPanel({ candidates, onSelect, isLoading = false }: Props) {
  const [focusedId, setFocusedId] = useState<AGMCandidateId | null>(null);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Opening scene */}
      <div className="mb-10 border-l-2 border-accent-primary/30 pl-5">
        <h1 className="mb-4 font-heading text-2xl font-bold text-dynasty-text">
          Day One. First Decision.
        </h1>
        <div className="space-y-2 font-data text-sm leading-relaxed text-dynasty-muted">
          {OPENING_SCENE_LINES.map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
        <p className="mt-4 font-heading text-xs uppercase tracking-wider text-accent-primary">
          Pick a folder.
        </p>
      </div>

      {/* Candidate cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            isFocused={focusedId === candidate.id}
            onFocus={() => setFocusedId(candidate.id)}
            onBlur={() => setFocusedId(null)}
            onSelect={() => onSelect(candidate.id)}
            disabled={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

interface CandidateCardProps {
  candidate: AGMCandidate;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onSelect: () => void;
  disabled: boolean;
}

function CandidateCard({
  candidate,
  isFocused,
  onFocus,
  onBlur,
  onSelect,
  disabled,
}: CandidateCardProps) {
  const icon = BACKGROUND_ICONS[candidate.background] ?? <UserCog className="h-6 w-6 text-accent-primary" />;

  return (
    <div
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`relative flex flex-col rounded-lg border bg-dynasty-surface/40 p-5 transition-all ${
        isFocused
          ? 'border-accent-primary/60 shadow-lg shadow-accent-primary/10'
          : 'border-dynasty-border'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="rounded bg-accent-primary/10 p-2">{icon}</div>
        <span className="font-data text-[10px] uppercase tracking-wider text-dynasty-muted">
          {candidate.gender === 'female' ? 'Female' : 'Male'} &middot; Age {candidate.age}
        </span>
      </div>

      {/* Name */}
      <h3 className="font-heading text-xl font-bold text-dynasty-text">{candidate.name}</h3>
      {candidate.nickname && candidate.nickname !== candidate.name && (
        <p className="mt-0.5 font-data text-xs text-accent-primary">
          &ldquo;{candidate.nickname}&rdquo;
        </p>
      )}

      {/* Background label */}
      <p className="mt-1 font-data text-[11px] uppercase tracking-wider text-dynasty-muted">
        {humanizeLabel(candidate.background)}
      </p>

      {/* Bio */}
      <p className="mt-4 border-l-2 border-dynasty-border/40 pl-3 font-data text-xs leading-relaxed text-dynasty-muted">
        {candidate.selectionScreenBio}
      </p>

      {/* Strengths */}
      <div className="mt-5">
        <h4 className="mb-2 font-heading text-[10px] font-semibold uppercase tracking-wider text-accent-primary">
          Strengths
        </h4>
        <ul className="space-y-1.5">
          {candidate.strengths.map((strength, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-accent-primary" />
              <span className="font-data text-[11px] leading-snug text-dynasty-text">{strength}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Weaknesses */}
      <div className="mt-4">
        <h4 className="mb-2 font-heading text-[10px] font-semibold uppercase tracking-wider text-dynasty-muted">
          Weaknesses
        </h4>
        <ul className="space-y-1.5">
          {candidate.weaknesses.map((weakness, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 h-3 w-3 shrink-0 text-dynasty-muted" />
              <span className="font-data text-[11px] leading-snug text-dynasty-muted">{weakness}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Select button */}
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="mt-6 flex items-center justify-center gap-2 rounded border border-accent-primary/60 bg-accent-primary/10 px-4 py-2.5 font-heading text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Hire {candidate.nickname || candidate.name}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
