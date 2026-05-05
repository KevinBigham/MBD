import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Gauge,
  MessageCircle,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  buildAssistantNextAction,
  buildStoryCallback,
  resolveAssistantRouteKey,
  selectRouteGuidance,
  type AssistantStoryCallback,
  type AssistantTickerItem,
} from '../data/assistantGuidance';
import {
  readAssistantState,
  reduceAssistantState,
  writeAssistantState,
  type AssistantMode,
  type AssistantSaveId,
  type AssistantState,
  type AssistantStateEvent,
} from '../lib/assistantState';

export interface AssistantPanelProps {
  tickerFeed?: readonly AssistantTickerItem[];
}

function resolveSaveId(activeSaveSlot: number | null, activeSaveId: string | null): AssistantSaveId {
  return activeSaveSlot ?? activeSaveId;
}

function modeLabel(mode: AssistantMode): string {
  return mode === 'hardcore' ? 'Hardcore' : 'Newcomer';
}

function routeLabel(routeKey: string): string {
  return routeKey
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function storyToneClasses(story: AssistantStoryCallback | null): string {
  if (!story) return 'border-dynasty-border bg-dynasty-elevated/70 text-dynasty-muted';
  if (story.tone === 'warning') return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
  if (story.tone === 'success') return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
  if (story.tone === 'excited') return 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary';
  return 'border-dynasty-border bg-dynasty-elevated/70 text-dynasty-muted';
}

function AssistantAvatar({ story }: { story: AssistantStoryCallback | null }) {
  const toneClass = story?.tone === 'warning'
    ? 'border-accent-warning text-accent-warning'
    : story?.tone === 'success'
      ? 'border-accent-success text-accent-success'
      : story?.tone === 'excited'
        ? 'border-accent-primary text-accent-primary'
        : 'border-accent-info text-accent-info';

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-dynasty-elevated shadow-lg motion-safe:animate-[fadeIn_160ms_ease-out] ${toneClass}`}
      aria-hidden="true"
    >
      <MessageCircle className="h-5 w-5" />
    </div>
  );
}

export function AssistantPanel({ tickerFeed = [] }: AssistantPanelProps) {
  const location = useLocation();
  const {
    activeSaveId,
    activeSaveSlot,
    day,
    phase,
    season,
  } = useGameStore();
  const routeKey = resolveAssistantRouteKey(location.pathname);
  const guidance = selectRouteGuidance(location.pathname);
  const saveId = resolveSaveId(activeSaveSlot, activeSaveId);
  const [state, setState] = useState<AssistantState>(() => readAssistantState(saveId));
  const [open, setOpen] = useState(false);
  const [ratingsOpen, setRatingsOpen] = useState(false);
  const [strategyOpen, setStrategyOpen] = useState(false);

  useEffect(() => {
    setState(readAssistantState(saveId));
    setOpen(false);
    setRatingsOpen(false);
    setStrategyOpen(false);
  }, [saveId]);

  const dispatch = useCallback((event: AssistantStateEvent) => {
    setState((current) => {
      const next = reduceAssistantState(current, event);
      writeAssistantState(saveId, next);
      return next;
    });
  }, [saveId]);

  const nextAction = useMemo(() => buildAssistantNextAction({
    routeKey,
    phase,
    day,
    season,
    mode: state.mode,
  }), [day, phase, routeKey, season, state.mode]);

  const story = useMemo(() => buildStoryCallback({
    phase,
    day,
    season,
    routeKey,
    seenStoryCallbacks: state.seenStoryCallbacks,
    tickerFeed,
  }), [day, phase, routeKey, season, state.seenStoryCallbacks, tickerFeed]);

  const routeDismissed = state.dismissedRoutes[routeKey] === true;

  const handleComplete = useCallback(() => {
    dispatch({ type: 'completeRoute', routeKey });
    if (story) {
      dispatch({ type: 'markStorySeen', callbackId: story.id });
    }
    setOpen(false);
    setRatingsOpen(false);
    setStrategyOpen(false);
  }, [dispatch, routeKey, story]);

  const handleReplay = useCallback(() => {
    dispatch({ type: 'replayRoute', routeKey });
    setRatingsOpen(false);
    setStrategyOpen(false);
    setOpen(true);
  }, [dispatch, routeKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <aside className="fixed inset-x-3 bottom-24 z-40 sm:left-auto sm:right-4 sm:w-[25rem] md:bottom-20">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full min-h-11 items-center gap-3 rounded-lg border border-accent-info/35 bg-dynasty-surface/95 p-3 text-left shadow-xl backdrop-blur transition-colors hover:border-accent-primary sm:ml-auto"
          aria-label="Open Assistant"
        >
          <AssistantAvatar story={story} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-textBright">
              Assistant
              <span className="rounded border border-dynasty-border px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                {modeLabel(state.mode)}
              </span>
            </span>
            <span className="mt-1 block truncate font-heading text-xs text-dynasty-muted">
              {routeDismissed
                ? `Replay help for ${routeLabel(routeKey)}`
                : `What now? ${routeLabel(routeKey)} - ${guidance.title}`}
            </span>
          </span>
          <ChevronUp className="h-4 w-4 text-dynasty-muted" />
        </button>
      ) : (
        <section
          role="dialog"
          aria-label="Mack Mercer Assistant"
          className="max-h-[72vh] overflow-y-auto rounded-lg border border-accent-info/35 bg-dynasty-surface shadow-2xl"
        >
          <div className="flex items-start gap-3 border-b border-dynasty-border p-4">
            <AssistantAvatar story={story} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Mack Mercer</h2>
                <span className="rounded border border-dynasty-border px-1.5 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  Assistant GM
                </span>
              </div>
              <p className="mt-1 font-data text-xs text-dynasty-muted">
                {guidance.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text"
              aria-label="Close Assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3 p-4">
            {story ? (
              <div className={`rounded-md border p-3 ${storyToneClasses(story)}`} aria-live="polite">
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em]">{story.title}</div>
                    <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{story.body}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="font-heading text-base font-semibold text-dynasty-textBright">{guidance.title}</h3>
              <p className="mt-2 font-heading text-sm leading-relaxed text-dynasty-text">{guidance.pagePurpose}</p>
              <p className="mt-2 font-data text-xs leading-relaxed text-dynasty-muted">{guidance.whenToUse}</p>
            </div>

            <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
              <div className="flex items-start gap-2">
                <BadgeHelp className="mt-0.5 h-4 w-4 shrink-0 text-accent-info" />
                <div>
                  <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Decision</div>
                  <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.decision}</p>
                </div>
              </div>
            </div>

            <Link
              to={nextAction.route}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-accent-primary/40 bg-accent-primary/10 px-3 py-2 font-heading text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/15"
            >
              <span>
                <span className="block">{nextAction.label}</span>
                <span className="mt-1 block font-data text-[11px] font-normal text-dynasty-muted">{nextAction.reason}</span>
              </span>
              <ChevronDown className="-rotate-90 h-4 w-4 shrink-0" />
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRatingsOpen((value) => !value)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                <Gauge className="h-4 w-4" />
                Explain ratings
              </button>
              <button
                type="button"
                onClick={() => setStrategyOpen((value) => !value)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                <Sparkles className="h-4 w-4" />
                Deeper strategy
              </button>
            </div>

            {ratingsOpen ? (
              <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Ratings read</div>
                <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.ratingsFocus}</p>
              </div>
            ) : null}

            {strategyOpen ? (
              <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Bench coach note</div>
                <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.deeperStrategy}</p>
              </div>
            ) : null}

            <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/50 p-3 font-data text-[11px] leading-relaxed text-dynasty-muted">
              {guidance.mobileTip}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-dynasty-border pt-3">
              <button
                type="button"
                onClick={handleComplete}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent-primary px-3 py-2 font-heading text-xs font-semibold text-white transition-colors hover:bg-accent-primary/80"
              >
                <CheckCircle2 className="h-4 w-4" />
                Got it
              </button>
              <button
                type="button"
                onClick={handleReplay}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                <RotateCcw className="h-4 w-4" />
                Replay
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'setMode', mode: state.mode === 'newcomer' ? 'hardcore' : 'newcomer' })}
                className="min-h-11 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                {state.mode === 'newcomer' ? 'Hardcore mode' : 'Newcomer mode'}
              </button>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
