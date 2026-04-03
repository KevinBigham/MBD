import { useEffect, useRef, useState } from 'react';
import { useEffectiveReducedMotion } from '@/shared/hooks/useEffectiveReducedMotion';

interface AnimatedNumberProps {
  value: number;
  formatter?: (value: number) => string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  formatter = (nextValue) => nextValue.toString(),
  durationMs = 500,
  className,
}: AnimatedNumberProps) {
  const reducedMotion = useEffectiveReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef(value);

  useEffect(() => {
    if (reducedMotion) {
      previousValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const from = previousValueRef.current;
    const delta = value - from;
    if (delta === 0) {
      setDisplayValue(value);
      return;
    }

    const startedAt = performance.now();
    let frameId = 0;

    const tick = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startedAt) / durationMs);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(from + delta * eased);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
        return;
      }

      previousValueRef.current = value;
      setDisplayValue(value);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frameId);
      previousValueRef.current = value;
    };
  }, [durationMs, reducedMotion, value]);

  return <span className={className}>{formatter(displayValue)}</span>;
}
