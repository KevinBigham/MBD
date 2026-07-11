import type { ComponentProps, RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Play, PlusCircle } from 'lucide-react';
import SetupDynastyWizardPanel from './SetupDynastyWizardPanel';
import SetupSaveHubPanel from './SetupSaveHubPanel';
import SetupSeasonPreviewPanel from './SetupSeasonPreviewPanel';

export interface SetupPageContentProps {
  isInitialized: boolean;
  onOpenWizard: () => void;
  saveHubPanelProps: ComponentProps<typeof SetupSaveHubPanel>;
  status: string;
  wizardOpen: boolean;
  wizardPanelProps: ComponentProps<typeof SetupDynastyWizardPanel>;
  wizardPreviewPanelProps: ComponentProps<typeof SetupSeasonPreviewPanel>;
  wizardSectionRef: RefObject<HTMLElement>;
}

export default function SetupPageContent({
  isInitialized,
  onOpenWizard,
  saveHubPanelProps,
  status,
  wizardOpen,
  wizardPanelProps,
  wizardPreviewPanelProps,
  wizardSectionRef,
}: SetupPageContentProps) {
  return (
    <div className="min-h-screen bg-dynasty-base px-6 py-8 text-dynasty-text">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-info">v1.0.0 Launch</div>
              <h1 className="mt-3 font-brand text-5xl text-dynasty-textBright">Mr. Baseball Dynasty</h1>
              <p className="mt-4 max-w-3xl font-heading text-sm leading-6 text-dynasty-muted">
                A browser-based baseball franchise dynasty sim built for long saves, front-office decisions, and seasons that leave a record.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {isInitialized ? (
                <Link
                  to="/dashboard"
                  data-mobile-critical-control="setup-return-dashboard"
                  className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded-md border border-dynasty-border px-4 py-2 font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated"
                >
                  <Play className="h-4 w-4" />
                  Return to Dashboard
                </Link>
              ) : null}
              <button
                type="button"
                disabled={saveHubPanelProps.busySlot != null}
                data-mobile-critical-control="setup-open-wizard"
                onClick={onOpenWizard}
                className="mobile-critical-control focus-ring inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" />
                New Dynasty
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-5 font-heading text-sm leading-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="border-l border-accent-info/50 pl-4">
              <div className="font-semibold text-dynasty-textBright">What it is</div>
              <p className="mt-1 text-dynasty-muted">
                Draft, trade, develop, spend, and manage a club through years of roster pressure.
              </p>
            </div>
            <div className="border-l border-accent-warning/50 pl-4">
              <div className="font-semibold text-dynasty-textBright">What it is not</div>
              <p className="mt-1 text-dynasty-muted">
                Not a live MLB roster app, fantasy tool, betting product, or pay-to-win loop.
              </p>
            </div>
            <div className="border-l border-accent-success/50 pl-4">
              <div className="font-semibold text-dynasty-textBright">Who it is for</div>
              <p className="mt-1 text-dynasty-muted">
                Players who like contracts, prospects, arcs, and multi-season consequences.
              </p>
            </div>
            <div className="border-l border-dynasty-border pl-4">
              <div className="font-semibold text-dynasty-textBright">Start with New Dynasty</div>
              <p className="mt-1 text-dynasty-muted">
                Pick a slot, choose a club and mode, then enter Day One or quick-start into Season 1.
              </p>
            </div>
          </div>
          {status ? (
            <div className="mt-4 rounded-lg border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 font-heading text-sm text-accent-warning">
              {status}
            </div>
          ) : null}
        </section>

        <SetupSaveHubPanel {...saveHubPanelProps} />

        {wizardOpen ? (
          <section
            id="new-dynasty-setup"
            ref={wizardSectionRef}
            tabIndex={-1}
            className="grid scroll-mt-4 gap-6 outline-none xl:grid-cols-[0.95fr_1.05fr]"
          >
            <SetupDynastyWizardPanel {...wizardPanelProps} />
            <SetupSeasonPreviewPanel {...wizardPreviewPanelProps} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
