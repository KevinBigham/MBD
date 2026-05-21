const SPECIAL_MOMENT_LABELS: Record<string, string> = {
  deadline_buyer: 'Deadline Buyer',
  deadline_seller: 'Deadline Seller',
  championship_run: 'Championship Run',
  contention_collapse: 'Contention Collapse',
};

const SPECIAL_LABELS: Record<string, string> = {
  MLB: 'MLB',
  AAA: 'AAA',
  AA: 'AA',
  A_PLUS: 'A+',
  ROOKIE: 'Rookie',
  INTERNATIONAL: 'International',
  AL_EAST: 'AL East',
  AL_CENTRAL: 'AL Central',
  AL_WEST: 'AL West',
  NL_EAST: 'NL East',
  NL_CENTRAL: 'NL Central',
  NL_WEST: 'NL West',
  gm_career: 'GM Career',
  league_wire: 'League Wire',
  press_conference: 'Press Conference',
  qualifying_offer: 'Qualifying Offer',
  roster_move: 'Roster Move',
  league_event: 'League Event',
  active_roster_over_limit: 'Active Roster Over Limit',
  forty_man_over_limit: '40-Man Roster Over Limit',
  standing_pat: 'Standing Pat',
  counter_offer: 'Counter Offer',
  final_offer: 'Final Offer',
  no_trade_clause: 'No-Trade Clause',
  player_option: 'Player Option',
};

export function humanizeLabel(value: string): string {
  if (value.length === 0) {
    return '';
  }

  const special = SPECIAL_LABELS[value] ?? SPECIAL_LABELS[value.toLowerCase()];
  if (special) {
    return special;
  }

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function momentTypeLabel(type: string): string {
  return SPECIAL_MOMENT_LABELS[type] ?? humanizeLabel(type);
}

export function divisionLabel(value: string): string {
  return humanizeLabel(value);
}

export function minorLevelLabel(value: string): string {
  return humanizeLabel(value);
}

export function phaseLabel(value: string): string {
  return humanizeLabel(value);
}

export function sourceLabel(value: string): string {
  return humanizeLabel(value);
}

export function categoryLabel(value: string): string {
  return humanizeLabel(value);
}

export function roleLabel(value: string): string {
  return humanizeLabel(value);
}
