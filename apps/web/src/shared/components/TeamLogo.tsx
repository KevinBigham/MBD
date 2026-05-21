/**
 * TeamLogo - renders a team's logo image if available, otherwise falls back
 * to a procedurally generated monogram badge with team-specific colors.
 *
 * Logo assets are expected at `/logos/{teamId}.svg` (or .png).
 * Fictional team SVG assets live in public/logos and are covered by a smoke test.
 */

import { useEffect, useState } from 'react';

/* ---------- team color palette ---------- */

const TEAM_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  // AL East
  nym: { bg: '#1a1a4e', text: '#f0e68c', accent: '#c5a000' },
  phi: { bg: '#002b5c', text: '#d4a843', accent: '#b5942f' },
  bos: { bg: '#1c3652', text: '#8ec8f0', accent: '#4da8da' },
  bal: { bg: '#e04d2d', text: '#ffffff', accent: '#ff7b54' },
  wsh: { bg: '#3c3b6e', text: '#ffffff', accent: '#b22234' },
  // AL Central
  chi: { bg: '#c41e3a', text: '#ffffff', accent: '#f4c430' },
  det: { bg: '#0d1b2a', text: '#6ca4c0', accent: '#4a8eb5' },
  cle: { bg: '#4a4a4a', text: '#ff6b35', accent: '#e05030' },
  col: { bg: '#bb0000', text: '#d1d1d1', accent: '#666666' },
  pit: { bg: '#1a1a1a', text: '#f5c542', accent: '#e0a000' },
  // AL West
  kc:  { bg: '#c41230', text: '#f8f0e0', accent: '#f97316' },
  msp: { bg: '#0f2540', text: '#aed6f1', accent: '#5dade2' },
  stl: { bg: '#6b0a0a', text: '#c9a857', accent: '#b59540' },
  ind: { bg: '#001b44', text: '#e74c3c', accent: '#c0392b' },
  mil: { bg: '#14325a', text: '#f4d47c', accent: '#d4b44c' },
  nas: { bg: '#1a1a1a', text: '#ff6b6b', accent: '#e55555' },
  // NL East
  mia: { bg: '#003b5c', text: '#ff8c42', accent: '#ff6b1a' },
  atl: { bg: '#ce1141', text: '#ffd700', accent: '#e6c200' },
  cha: { bg: '#1d1160', text: '#00b6a0', accent: '#009e8a' },
  orl: { bg: '#004878', text: '#ffffff', accent: '#fbb034' },
  ral: { bg: '#2c5234', text: '#c0e0c8', accent: '#88c098' },
  // NL Central
  hou: { bg: '#002d62', text: '#ff6a00', accent: '#e06000' },
  dal: { bg: '#00205b', text: '#ffffff', accent: '#b3995d' },
  sat: { bg: '#4a2c00', text: '#7ec8e3', accent: '#5eb0cc' },
  den: { bg: '#3b1c75', text: '#c084fc', accent: '#a855f7' },
  aus: { bg: '#1a1a2e', text: '#6bc700', accent: '#52a000' },
  // NL West
  lax: { bg: '#ff6347', text: '#1a1a4e', accent: '#ff4500' },
  sfb: { bg: '#d2a96a', text: '#2c1810', accent: '#b8924e' },
  phx: { bg: '#c2420a', text: '#f5deb3', accent: '#ff8c42' },
  sea: { bg: '#003b4d', text: '#69be94', accent: '#4da378' },
  sdg: { bg: '#0c2340', text: '#ffc72c', accent: '#e6b425' },
  por: { bg: '#2d4a1e', text: '#d4c5a0', accent: '#8fbc60' },
};

const DEFAULT_COLORS = { bg: '#1a1a2e', text: '#f97316', accent: '#f97316' };

/* ---------- team abbreviations ---------- */

const TEAM_ABBREVIATIONS: Record<string, string> = {
  nym: 'NYT', phi: 'PHI', bos: 'BOS', bal: 'BAL', wsh: 'WSH',
  chi: 'CHI', det: 'DET', cle: 'CLE', col: 'CLB', pit: 'PIT',
  kc: 'KCF', msp: 'MSP', stl: 'STL', ind: 'IND', mil: 'MIL', nas: 'NAS',
  mia: 'MIA', atl: 'ATL', cha: 'CHA', orl: 'ORL', ral: 'RAL',
  hou: 'HOU', dal: 'DAL', sat: 'SAT', den: 'DEN', aus: 'AUS',
  lax: 'LAX', sfb: 'SFB', phx: 'PHX', sea: 'SEA', sdg: 'SDG', por: 'POR',
};

/* ---------- size presets ---------- */

type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<LogoSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
};

const FONT_SIZE_MAP: Record<LogoSize, number> = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 22,
};

/* ---------- monogram fallback ---------- */

function MonogramBadge({
  teamId,
  size,
  className,
}: {
  teamId: string;
  size: LogoSize;
  className?: string;
}) {
  const colors = TEAM_COLORS[teamId] ?? DEFAULT_COLORS;
  const abbrev = TEAM_ABBREVIATIONS[teamId] ?? teamId.toUpperCase().slice(0, 3);
  const px = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={className}
      role="img"
      aria-label={`${teamId.toUpperCase()} logo`}
    >
      {/* Background circle */}
      <circle
        cx={px / 2}
        cy={px / 2}
        r={px / 2 - 1}
        fill={colors.bg}
        stroke={colors.accent}
        strokeWidth={size === 'xs' ? 1 : 1.5}
      />
      {/* Team abbreviation */}
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={colors.text}
        fontFamily="'Bebas Neue', 'Space Grotesk', system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="bold"
        letterSpacing="0"
      >
        {abbrev}
      </text>
    </svg>
  );
}

/* ---------- main component ---------- */

interface TeamLogoProps {
  teamId: string;
  size?: LogoSize;
  className?: string;
}

export function TeamLogo({ teamId, size = 'md', className }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_MAP[size];
  const base = (import.meta as unknown as { env: { BASE_URL: string } }).env.BASE_URL;
  const logoPath = `${base}logos/${teamId}.svg`;

  // Reset error state when teamId changes so we re-attempt the real logo
  useEffect(() => {
    setImgError(false);
  }, [teamId]);

  if (imgError) {
    return <MonogramBadge teamId={teamId} size={size} className={className} />;
  }

  return (
    <img
      src={logoPath}
      alt={`${teamId.toUpperCase()} logo`}
      width={px}
      height={px}
      className={className}
      onError={() => setImgError(true)}
      loading="lazy"
    />
  );
}

/** Get team-specific colors for custom styling */
export function getTeamColors(teamId: string) {
  return TEAM_COLORS[teamId] ?? DEFAULT_COLORS;
}
