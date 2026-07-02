import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { AGMSelectionPanel } from '../components/AGMSelectionPanel';
import RevisedOnboardingFlowContent from '../components/RevisedOnboardingFlowContent';
import {
  OnboardingEmptyState,
  OnboardingErrorBanner,
  OnboardingLoadingState,
  OnboardingPageShell,
  OnboardingRouteHeader,
} from '../components/RevisedOnboardingChrome';
import { useRevisedOnboardingPageController } from '../hooks/useRevisedOnboardingPageController';

export default function RevisedOnboardingPage() {
  const worker = useWorker();
  const navigate = useNavigate();
  const activeSaveId = useGameStore((state) => state.activeSaveId);
  const activeSaveSlot = useGameStore((state) => state.activeSaveSlot);
  const gmName = useGameStore((state) => state.gmName);
  const { screen } = useRevisedOnboardingPageController({
    game: { activeSaveId, activeSaveSlot, gmName },
    navigate,
    worker,
  });

  if (screen.kind === 'loading') {
    return (
      <>
        <OnboardingLoadingState label={screen.label} />
        {screen.nudgeCard}
      </>
    );
  }

  if (screen.kind === 'missing-save') {
    return (
      <>
        <OnboardingPageShell>
          <OnboardingEmptyState
            title={screen.title}
            body={screen.body}
            actionLabel="Return to Save Hub"
            onAction={screen.onReturnToSaveHub}
          />
        </OnboardingPageShell>
        {screen.nudgeCard}
      </>
    );
  }

  if (screen.kind === 'agm-selection') {
    return (
      <>
        <OnboardingPageShell>
          <OnboardingRouteHeader
            eyebrow="Revised Day One"
            title="Choose Your Assistant GM"
            body="The revised onboarding path starts with the AGM candidates from the worker, then builds every assessment, hire, and final save from that selection."
          />
          {screen.error ? <OnboardingErrorBanner message={screen.error} /> : null}
          <AGMSelectionPanel
            candidates={screen.candidates}
            onSelect={screen.onSelectAGM}
            isLoading={screen.isBusy}
          />
        </OnboardingPageShell>
        {screen.nudgeCard}
      </>
    );
  }

  return (
    <>
      <RevisedOnboardingFlowContent {...screen.contentProps} />
      {screen.nudgeCard}
    </>
  );
}
