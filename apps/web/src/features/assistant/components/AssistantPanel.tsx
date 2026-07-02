import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronUp, MessageCircle } from 'lucide-react';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { AssistantDetailDialog } from './AssistantDetailDialog';
import {
  buildAssistantNextAction,
  buildStoryCallback,
  resolveAssistantRouteKey,
  selectRouteGuidance,
  type AssistantDecisionSpotlight,
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
  pendingMonthlyReport?: boolean;
  decisionQueue?: readonly AssistantDecisionSpotlight[];
}

const EMPTY_DECISION_QUEUE: readonly AssistantDecisionSpotlight[] = [];

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

export function AssistantPanel({
  tickerFeed = [],
  pendingMonthlyReport = false,
  decisionQueue = EMPTY_DECISION_QUEUE,
}: AssistantPanelProps) {
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
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const restoreLauncherFocusRef = useRef(false);

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
    pendingMonthlyReport,
    decisionQueue,
  }), [day, decisionQueue, pendingMonthlyReport, phase, routeKey, season, state.mode]);

  const story = useMemo(() => buildStoryCallback({
    phase,
    day,
    season,
    routeKey,
    seenStoryCallbacks: state.seenStoryCallbacks,
    tickerFeed,
  }), [day, phase, routeKey, season, state.seenStoryCallbacks, tickerFeed]);

  const routeDismissed = state.dismissedRoutes[routeKey] === true;

  const closeAssistant = useCallback((restoreFocus = true) => {
    restoreLauncherFocusRef.current = restoreFocus;
    setOpen(false);
    setRatingsOpen(false);
    setStrategyOpen(false);
  }, []);

  useEffect(() => {
    if (open || !restoreLauncherFocusRef.current) return;
    restoreLauncherFocusRef.current = false;

    const timer = window.setTimeout(() => {
      launcherRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  const handleComplete = useCallback(() => {
    dispatch({ type: 'completeRoute', routeKey });
    if (story) {
      dispatch({ type: 'markStorySeen', callbackId: story.id });
    }
    closeAssistant();
  }, [closeAssistant, dispatch, routeKey, story]);

  const handleReplay = useCallback(() => {
    dispatch({ type: 'replayRoute', routeKey });
    setRatingsOpen(false);
    setStrategyOpen(false);
    setOpen(true);
  }, [dispatch, routeKey]);

  return (
    <aside className="fixed inset-x-3 bottom-24 z-40 sm:left-auto sm:right-4 sm:w-[25rem] md:bottom-20">
      {!open ? (
        <button
          ref={launcherRef}
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
        <AssistantDetailDialog
          avatar={<AssistantAvatar story={story} />}
          guidance={guidance}
          nextAction={nextAction}
          story={story}
          mode={state.mode}
          ratingsOpen={ratingsOpen}
          strategyOpen={strategyOpen}
          onClose={closeAssistant}
          onComplete={handleComplete}
          onReplay={handleReplay}
          onToggleMode={() => dispatch({ type: 'setMode', mode: state.mode === 'newcomer' ? 'hardcore' : 'newcomer' })}
          onToggleRatings={() => setRatingsOpen((value) => !value)}
          onToggleStrategy={() => setStrategyOpen((value) => !value)}
        />
      )}
    </aside>
  );
}
