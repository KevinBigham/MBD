/**
 * @module grade
 * Letter-grade → Tailwind class helpers. Two variants:
 *   - `gradeBadgeColor` — background tint + text color for badges
 *   - `gradeTextColor`  — text-only (no background), used by leaderboard-style rows
 * Consolidates what used to be 5 copies across the feature pages.
 */

export function gradeBadgeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-accent-success/20 text-accent-success';
    case 'B': return 'bg-accent-info/20 text-accent-info';
    case 'C': return 'bg-accent-warning/20 text-accent-warning';
    case 'D': return 'bg-accent-danger/20 text-accent-danger';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
}

export function gradeTextColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-accent-success';
    case 'B': return 'text-accent-info';
    case 'C': return 'text-accent-warning';
    case 'D': return 'text-accent-danger';
    default: return 'text-dynasty-muted';
  }
}
