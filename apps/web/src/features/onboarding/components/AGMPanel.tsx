import {
  Brain,
  Landmark,
  LineChart,
  Search,
  UserCog,
} from 'lucide-react';
import type { AssistantGMProfile, DialogueLine } from '@mbd/sim-core';
import { TypewriterText } from './TypewriterText';

// ---------------------------------------------------------------------------
// Icon mapping by AGM background
// ---------------------------------------------------------------------------

const BACKGROUND_ICONS: Record<string, React.ReactNode> = {
  former_player: <UserCog className="h-8 w-8 text-dynasty-muted/40" />,
  career_scout: <Search className="h-8 w-8 text-dynasty-muted/40" />,
  front_office_lifer: <Landmark className="h-8 w-8 text-dynasty-muted/40" />,
  analytics_pioneer: <LineChart className="h-8 w-8 text-dynasty-muted/40" />,
  old_school_baseball_man: <Brain className="h-8 w-8 text-dynasty-muted/40" />,
};

const BACKGROUND_LABELS: Record<string, string> = {
  former_player: 'Former Player',
  career_scout: 'Career Scout',
  front_office_lifer: 'Front Office Lifer',
  analytics_pioneer: 'Analytics Pioneer',
  old_school_baseball_man: 'Old School Baseball Man',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AGMPanelProps {
  profile: AssistantGMProfile;
  dialogueLines: DialogueLine[];
  onDialogueComplete?: () => void;
}

export function AGMPanel({ profile, dialogueLines, onDialogueComplete }: AGMPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Polaroid card */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/60 p-5">
        {/* Background icon */}
        <div className="mb-3 flex items-center justify-between">
          {BACKGROUND_ICONS[profile.background] ?? <UserCog className="h-8 w-8 text-dynasty-muted/40" />}
          <span className="rounded bg-accent-primary/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-wider text-accent-primary">
            Assistant GM
          </span>
        </div>

        {/* Name */}
        <h3 className="font-heading text-xl font-bold text-dynasty-text">
          {profile.name}
        </h3>

        {/* Nickname + background */}
        <div className="mt-1 flex items-center gap-2">
          <span className="font-data text-xs text-accent-primary">
            &ldquo;{profile.nickname}&rdquo;
          </span>
          <span className="text-dynasty-muted/40">&middot;</span>
          <span className="font-data text-xs text-dynasty-muted">
            {BACKGROUND_LABELS[profile.background] ?? profile.background}
          </span>
        </div>

        {/* Years + age */}
        <p className="mt-2 font-data text-[11px] text-dynasty-muted">
          {profile.yearsInBaseball} years in baseball &middot; Age {profile.age}
        </p>

        {/* Catchphrase */}
        <p className="mt-3 border-l-2 border-accent-primary/30 pl-3 font-heading text-xs italic text-dynasty-muted">
          &ldquo;{profile.catchphrase}&rdquo;
        </p>
      </div>

      {/* Dialogue area */}
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <TypewriterText
          lines={dialogueLines}
          onComplete={onDialogueComplete}
        />
      </div>
    </div>
  );
}
