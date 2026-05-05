import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BadgeHelp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Gauge,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  buildAssistantNextAction,
  buildStorySoFar,
  buildStoryCallback,
  resolveAssistantRouteKey,
  selectRouteGuidance,
  type AssistantSeasonSnapshot,
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
import {
  buildAssistantFeedbackReport,
  resolveViewportCategory,
} from '../lib/assistantFeedback';
import { AssistantAvatar, type AssistantExpression } from './AssistantAvatar';

export interface AssistantPanelProps {
  tickerFeed?: readonly AssistantTickerItem[];
  seasonSnapshot?: AssistantSeasonSnapshot | null;
}

const APP_VERSION = ((import.meta as unknown as { env?: { VITE_APP_VERSION?: string } }).env?.VITE_APP_VERSION) ?? 'local';

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

function expressionForContext(
  routeKey: string,
  story: AssistantStoryCallback | null,
  routeCompleted: boolean,
): AssistantExpression {
  if (routeCompleted) return 'success';
  if (story?.tone === 'warning') return 'warning';
  if (story?.tone === 'success') return 'success';
  if (story?.tone === 'excited') return 'excited';
  if (routeKey === 'scouting' || routeKey === 'draft' || routeKey === 'player-profile' || routeKey === 'player-compare' || routeKey === 'minors') {
    return 'thinking';
  }
  return 'neutral';
}

export function AssistantPanel({ tickerFeed = [], seasonSnapshot = null }: AssistantPanelProps) {
  const location = useLocation();
  const {
    activeSaveId,
    activeSaveSlot,
    day,
    gamesPlayed,
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpfulScore, setHelpfulScore] = useState(4);
  const [clarityScore, setClarityScore] = useState(4);
  const [confusion, setConfusion] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [successPulse, setSuccessPulse] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setState(readAssistantState(saveId));
    setOpen(false);
    setRatingsOpen(false);
    setStrategyOpen(false);
    setFeedbackOpen(false);
    setCopiedFeedback(false);
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
    seasonSnapshot,
  }), [day, phase, routeKey, season, seasonSnapshot, state.mode]);

  const story = useMemo(() => buildStoryCallback({
    phase,
    day,
    season,
    routeKey,
    seenStoryCallbacks: state.seenStoryCallbacks,
    tickerFeed,
  }), [day, phase, routeKey, season, state.seenStoryCallbacks, tickerFeed]);

  const routeDismissed = state.dismissedRoutes[routeKey] === true;
  const routeCompleted = state.completedRoutes[routeKey] === true;
  const expression = expressionForContext(routeKey, story, routeCompleted);
  const storySoFar = useMemo(() => buildStorySoFar({
    phase,
    day,
    season,
    gamesPlayed,
    routeKey,
    seasonSnapshot,
  }), [day, gamesPlayed, phase, routeKey, season, seasonSnapshot]);

  const handleComplete = useCallback(() => {
    dispatch({ type: 'completeRoute', routeKey });
    if (story) {
      dispatch({ type: 'markStorySeen', callbackId: story.id });
    }
    setSuccessPulse(true);
    setOpen(false);
    setRatingsOpen(false);
    setStrategyOpen(false);
    setFeedbackOpen(false);
  }, [dispatch, routeKey, story]);

  const handleReplay = useCallback(() => {
    dispatch({ type: 'replayRoute', routeKey });
    setRatingsOpen(false);
    setStrategyOpen(false);
    setFeedbackOpen(false);
    setOpen(true);
    setSuccessPulse(true);
  }, [dispatch, routeKey]);

  const handleCopyFeedback = useCallback(async () => {
    const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth;
    const report = buildAssistantFeedbackReport({
      appVersion: APP_VERSION,
      route: location.pathname,
      routeKey,
      phase,
      day,
      season,
      assistantMode: state.mode,
      completedRoutes: Object.keys(state.completedRoutes).sort(),
      viewportCategory: resolveViewportCategory(viewportWidth),
      helpfulScore,
      clarityScore,
      confusion,
    });

    await navigator.clipboard?.writeText(report);
    setCopiedFeedback(true);
  }, [clarityScore, confusion, day, helpfulScore, location.pathname, phase, routeKey, season, state.completedRoutes, state.mode]);

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

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!successPulse) return;
    const timeout = window.setTimeout(() => setSuccessPulse(false), 950);
    return () => window.clearTimeout(timeout);
  }, [successPulse]);

  return (
    <aside className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10.5rem)] z-40 sm:left-auto sm:right-4 sm:w-[25rem] md:bottom-20">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full min-h-11 items-center gap-3 rounded-lg border border-accent-info/35 bg-dynasty-surface/95 p-3 text-left shadow-xl backdrop-blur transition-colors hover:border-accent-primary sm:ml-auto"
          aria-label="Open Mack Mercer Assistant"
        >
          <AssistantAvatar expression={expression} pulse={successPulse} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-heading text-sm font-semibold text-dynasty-textBright">
              Mack Mercer
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
          aria-describedby="assistant-route-summary"
          className="max-h-[min(68vh,calc(100vh-12rem))] overflow-y-auto rounded-lg border border-accent-info/35 bg-dynasty-surface shadow-2xl sm:max-h-[72vh]"
        >
          <div className="flex items-start gap-3 border-b border-dynasty-border p-4">
            <AssistantAvatar expression={expression} pulse={successPulse} />
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
              ref={closeButtonRef}
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

            <div id="assistant-route-summary">
              <h3 className="font-heading text-base font-semibold text-dynasty-textBright">{guidance.title}</h3>
              <p className="mt-2 font-heading text-sm leading-relaxed text-dynasty-text">
                {guidance.firstSessionCue ?? guidance.pagePurpose}
              </p>
              <p className="mt-2 hidden font-data text-xs leading-relaxed text-dynasty-muted sm:block">{guidance.whenToUse}</p>
            </div>

            <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/50 p-3">
              <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Story so far</div>
              <ul className="mt-2 space-y-1.5">
                {storySoFar.map((line) => (
                  <li key={line} className="font-heading text-xs leading-relaxed text-dynasty-text">
                    {line}
                  </li>
                ))}
              </ul>
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
                aria-expanded={ratingsOpen}
                aria-controls="assistant-ratings-panel"
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                <Gauge className="h-4 w-4" />
                Explain ratings
              </button>
              <button
                type="button"
                onClick={() => setStrategyOpen((value) => !value)}
                aria-expanded={strategyOpen}
                aria-controls="assistant-strategy-panel"
                className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                <Sparkles className="h-4 w-4" />
                Deeper strategy
              </button>
            </div>

            {ratingsOpen ? (
              <div id="assistant-ratings-panel" className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Ratings read</div>
                <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.ratingsFocus}</p>
              </div>
            ) : null}

            {strategyOpen ? (
              <div id="assistant-strategy-panel" className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Bench coach note</div>
                <p className="mt-1 font-heading text-xs leading-relaxed text-dynasty-text">{guidance.deeperStrategy}</p>
              </div>
            ) : null}

            <div className="hidden rounded-md border border-dynasty-border bg-dynasty-elevated/50 p-3 font-data text-[11px] leading-relaxed text-dynasty-muted sm:block">
              {guidance.mobileTip}
            </div>

            {feedbackOpen ? (
              <div className="rounded-md border border-dynasty-border bg-dynasty-elevated/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-heading text-xs font-semibold uppercase tracking-[0.14em] text-dynasty-muted">Playtest feedback</div>
                  {copiedFeedback ? (
                    <span className="font-data text-[11px] text-accent-success">Copied</span>
                  ) : null}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="font-heading text-xs text-dynasty-muted">
                    Mack helpful: {helpfulScore}/5
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={helpfulScore}
                      onChange={(event) => {
                        setCopiedFeedback(false);
                        setHelpfulScore(Number(event.target.value));
                      }}
                      className="mt-2 w-full accent-accent-primary"
                    />
                  </label>
                  <label className="font-heading text-xs text-dynasty-muted">
                    Knew next move: {clarityScore}/5
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={clarityScore}
                      onChange={(event) => {
                        setCopiedFeedback(false);
                        setClarityScore(Number(event.target.value));
                      }}
                      className="mt-2 w-full accent-accent-primary"
                    />
                  </label>
                </div>
                <label className="mt-3 block font-heading text-xs text-dynasty-muted">
                  What confused you?
                  <textarea
                    name="assistant-confusion"
                    value={confusion}
                    onChange={(event) => {
                      setCopiedFeedback(false);
                      setConfusion(event.target.value);
                    }}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-text focus:border-accent-primary focus:outline-none"
                    placeholder="One sentence is enough."
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleCopyFeedback()}
                  className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs font-semibold text-accent-info transition-colors hover:bg-accent-info/15"
                >
                  <ClipboardCopy className="h-4 w-4" />
                  Copy report
                </button>
              </div>
            ) : null}

            <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-dynasty-border bg-dynasty-surface px-4 pb-4 pt-3">
              <button
                type="button"
                onClick={handleComplete}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent-primary px-3 py-2 font-heading text-xs font-semibold text-dynasty-base transition-colors hover:bg-accent-primary/80"
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
                aria-pressed={state.mode === 'hardcore'}
                aria-label={`Switch Assistant mode; current mode ${modeLabel(state.mode)}`}
                className="min-h-11 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                {state.mode === 'newcomer' ? 'Hardcore mode' : 'Newcomer mode'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedbackOpen((value) => !value);
                  setCopiedFeedback(false);
                }}
                aria-expanded={feedbackOpen}
                className="min-h-11 rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs font-semibold text-dynasty-text transition-colors hover:border-accent-primary"
              >
                Give feedback
              </button>
            </div>
          </div>
        </section>
      )}
    </aside>
  );
}
