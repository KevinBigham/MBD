import { getTeamColors } from './TeamLogo';

type AffiliateMarkSize = 'xs' | 'sm' | 'md';

const SIZE_MAP: Record<AffiliateMarkSize, number> = {
  xs: 20,
  sm: 28,
  md: 36,
};

const FONT_SIZE_MAP: Record<AffiliateMarkSize, number> = {
  xs: 7,
  sm: 9,
  md: 11,
};

function initialsForAffiliate(label: string, shortName?: string): string {
  const source = (shortName ?? label)
    .replace(/\bAcademy\b/gi, '')
    .trim();
  const words = source.split(/\s+/).filter(Boolean);
  const initials = words.map((word) => word[0]).join('').slice(0, 3).toUpperCase();
  return initials || label.slice(0, 3).toUpperCase();
}

interface AffiliateIdentityMarkProps {
  teamId?: string;
  level: string;
  label?: string;
  shortName?: string;
  size?: AffiliateMarkSize;
  className?: string;
  testId?: string;
}

export function AffiliateIdentityMark({
  teamId,
  level,
  label,
  shortName,
  size = 'sm',
  className,
  testId,
}: AffiliateIdentityMarkProps) {
  const markTeamId = teamId ?? 'affiliate';
  const colors = getTeamColors(markTeamId);
  const px = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const displayLabel = label ?? shortName ?? level ?? markTeamId.toUpperCase();
  const initials = initialsForAffiliate(displayLabel, shortName);

  return (
    <svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      className={className}
      role="img"
      aria-label={`${displayLabel} affiliate mark`}
      data-testid={testId ?? `affiliate-mark-${markTeamId}-${level}`}
    >
      <rect
        x="1"
        y="1"
        width={px - 2}
        height={px - 2}
        rx={Math.max(4, Math.round(px * 0.18))}
        fill={colors.bg}
        stroke={colors.accent}
        strokeWidth={size === 'xs' ? 1 : 1.5}
      />
      <path
        d={`M ${px * 0.28} 1 H ${px - 1} V ${px * 0.28} Z`}
        fill={colors.accent}
        opacity="0.75"
      />
      <text
        x="50%"
        y="54%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={colors.text}
        fontFamily="'Bebas Neue', 'Space Grotesk', system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="bold"
        letterSpacing="0"
      >
        {initials}
      </text>
    </svg>
  );
}
