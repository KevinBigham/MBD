import { describe, expect, it } from 'vitest';
import {
  Badge,
  Button,
  Card,
  Container,
  GradeBar,
  Skeleton,
  Stack,
  StatLine,
  Tabs,
  TrendArrow,
  cn,
} from './index.js';

describe('@mbd/ui barrel', () => {
  it('exports the shared UI primitives and helpers', () => {
    expect(typeof cn).toBe('function');
    expect(Badge).toBeTruthy();
    expect(Button).toBeTruthy();
    expect(Card).toBeTruthy();
    expect(Container).toBeTruthy();
    expect(GradeBar).toBeTruthy();
    expect(Skeleton).toBeTruthy();
    expect(Stack).toBeTruthy();
    expect(StatLine).toBeTruthy();
    expect(Tabs).toBeTruthy();
    expect(TrendArrow).toBeTruthy();
  });
});
