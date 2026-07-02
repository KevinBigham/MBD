import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { TeamLogo } from '@/shared/components/TeamLogo';
import type { ComparisonPlayerRef } from '../hooks/usePlayerComparisonRouteData';

export interface PlayerComparisonSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  teamId: string;
}

interface PlayerComparisonSearchPickerProps {
  label: string;
  onSelect: (id: string) => void;
  searchPlayers: (query: string, limit?: number) => Promise<PlayerComparisonSearchResult[] | null | undefined>;
  selected: ComparisonPlayerRef | null;
  workerReady: boolean;
}

export function PlayerComparisonSearchPicker({
  label,
  onSelect,
  searchPlayers,
  selected,
  workerReady,
}: PlayerComparisonSearchPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlayerComparisonSearchResult[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2 || !workerReady) {
      setResults([]);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      const data = await searchPlayers(query, 10);
      if (active) {
        setResults(data ?? []);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, searchPlayers, workerReady]);

  if (selected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
        <TeamLogo teamId={selected.teamId} size="md" />
        <div className="flex-1">
          <div className="font-heading text-sm text-dynasty-textBright">{selected.name}</div>
          <div className="font-data text-xs text-dynasty-muted">{selected.position} · Age {selected.age}</div>
        </div>
        <button
          type="button"
          data-mobile-critical-control="player-comparison-change"
          onClick={() => onSelect('')}
          className="mobile-critical-control focus-ring w-full rounded border border-accent-danger/40 px-3 py-2 text-center font-heading text-xs font-semibold text-accent-danger hover:bg-accent-danger/10 sm:w-auto"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="relative mt-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dynasty-muted" />
        <input
          type="text"
          data-mobile-critical-control="player-comparison-search-input"
          placeholder="Search players..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="mobile-critical-control focus-ring w-full rounded-lg border border-dynasty-border bg-dynasty-surface py-2 pl-10 pr-3 text-left font-heading text-sm text-dynasty-text placeholder:text-dynasty-muted/50 focus:border-accent-primary"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-dynasty-border bg-dynasty-surface shadow-lg">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              data-mobile-critical-control="player-comparison-result"
              onClick={() => {
                onSelect(result.id);
                setQuery('');
                setOpen(false);
              }}
              className="mobile-critical-control focus-ring flex w-full items-center gap-2 px-3 py-2 text-left font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated"
            >
              <TeamLogo teamId={result.teamId} size="sm" />
              <span>{result.firstName} {result.lastName}</span>
              <span className="ml-auto font-data text-xs text-dynasty-muted">{result.position}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
