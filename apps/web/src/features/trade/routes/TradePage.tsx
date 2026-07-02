import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import DeadlineDramaPanel from '../components/DeadlineDramaPanel';
import TradeLoadingSkeleton from '../components/TradeLoadingSkeleton';
import TradePageContent from '../components/TradePageContent';
import { useTradePageController } from '../hooks/useTradePageController';
import { useGameStore } from '@/shared/hooks/useGameStore';

export default function TradePage() {
  const worker = useWorker();
  const game = useGameStore();
  const { contentProps, pageShellLoading } = useTradePageController({
    deadlineDramaSlot: <DeadlineDramaPanel />,
    game,
    worker,
  });

  return (
    <PageShell loading={pageShellLoading} skeleton={<TradeLoadingSkeleton />}>
      <TradePageContent {...contentProps} />
    </PageShell>
  );
}
