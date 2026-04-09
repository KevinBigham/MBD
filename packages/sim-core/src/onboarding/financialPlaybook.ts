import { calculateLuxuryTax, calculatePlayerValue, calculateTeamPayroll, serviceDaysToYears } from '../finance/contracts.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { isPitcherPosition } from './shared.js';

export interface FinancialContext {
  players: GeneratedPlayer[];
  budget: number;
  luxuryTaxThreshold: number;
  difficulty: string;
}

export interface PayrollBreakdown {
  totalPayroll: number;
  hitterPayroll: number;
  pitcherPayroll: number;
  topPaidPlayer: { name: string; salary: number };
  averageSalary: number;
  medianSalary: number;
}

export interface ExtensionPriority {
  playerId: string;
  name: string;
  position: string;
  urgency: 'extend_now' | 'monitor' | 'let_walk';
  yearsRemaining: number;
  currentSalary: number;
  estimatedMarketValue: number;
  reason: string;
}

export interface FinancialFlexibility {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  availableSpace: number;
  luxuryTaxRoom: number;
  canAddStar: boolean;
  canAddRole: boolean;
  narrativeSummary: string;
}

export interface FinancialPlaybook {
  payroll: PayrollBreakdown;
  extensions: ExtensionPriority[];
  flexibility: FinancialFlexibility;
  spendingOptions: Array<{ id: string; label: string; description: string }>;
}

function fullName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function analyzePayrollBreakdown(players: GeneratedPlayer[]): PayrollBreakdown {
  const salaries = players.map((player) => player.contract.annualSalary).sort((left, right) => left - right);
  const hitterPayroll = roundMoney(
    players
      .filter((player) => !isPitcherPosition(player.position))
      .reduce((sum, player) => sum + player.contract.annualSalary, 0),
  );
  const pitcherPayroll = roundMoney(
    players
      .filter((player) => isPitcherPosition(player.position))
      .reduce((sum, player) => sum + player.contract.annualSalary, 0),
  );
  const totalPayroll = roundMoney(hitterPayroll + pitcherPayroll);
  const averageSalary = salaries.length === 0 ? 0 : roundMoney(totalPayroll / salaries.length);
  let medianSalary = 0;
  if (salaries.length > 0) {
    if (salaries.length % 2 === 1) {
      medianSalary = salaries[(salaries.length - 1) / 2]!;
    } else {
      const upperMedian = salaries[salaries.length / 2]!;
      const lowerMedian = salaries[(salaries.length / 2) - 1]!;
      medianSalary = roundMoney((upperMedian + lowerMedian) / 2);
    }
  }
  const topPaid = players.reduce<GeneratedPlayer | null>((current, player) => {
    if (current == null || player.contract.annualSalary > current.contract.annualSalary) {
      return player;
    }
    return current;
  }, null);

  return {
    totalPayroll,
    hitterPayroll,
    pitcherPayroll,
    topPaidPlayer: {
      name: topPaid == null ? 'None' : fullName(topPaid),
      salary: topPaid?.contract.annualSalary ?? 0,
    },
    averageSalary,
    medianSalary,
  };
}

export function identifyExtensionPriorities(players: GeneratedPlayer[]): ExtensionPriority[] {
  return [...players]
    .map((player) => {
      const estimatedMarketValue = roundMoney(calculatePlayerValue(player, serviceDaysToYears(player.serviceTimeDays)));
      const overpaid = player.contract.annualSalary > estimatedMarketValue * 1.15;
      const urgency: ExtensionPriority['urgency'] =
        player.contract.years <= 2 && player.overallRating > 320 ? 'extend_now'
          : player.contract.years === 3 && player.overallRating >= 300 ? 'monitor'
            : player.overallRating < 280 || overpaid ? 'let_walk'
              : 'monitor';

      return {
        playerId: player.id,
        name: fullName(player),
        position: player.position,
        urgency,
        yearsRemaining: player.contract.years,
        currentSalary: player.contract.annualSalary,
        estimatedMarketValue,
        reason:
          urgency === 'extend_now'
            ? 'Core-caliber performance is approaching the final control window.'
            : urgency === 'monitor'
              ? 'The player is useful enough to track, but there is still time before urgency spikes.'
              : 'Current value does not justify an aggressive extension posture.',
      };
    })
    .sort((left, right) => {
      const urgencyRank = { extend_now: 3, monitor: 2, let_walk: 1 } as const;
      if (urgencyRank[right.urgency] !== urgencyRank[left.urgency]) {
        return urgencyRank[right.urgency] - urgencyRank[left.urgency];
      }
      return left.playerId.localeCompare(right.playerId);
    });
}

export function calculateFinancialFlexibility(
  payroll: number,
  budget: number,
  luxuryThreshold: number,
): FinancialFlexibility {
  const availableSpace = roundMoney(budget - payroll);
  const luxuryTaxRoom = roundMoney(luxuryThreshold - payroll);
  const ratioRemaining = budget > 0 ? availableSpace / budget : 0;
  const grade: FinancialFlexibility['grade'] =
    availableSpace < 0 ? 'F'
      : ratioRemaining >= 0.3 ? 'A'
        : ratioRemaining >= 0.2 ? 'B'
          : ratioRemaining >= 0.1 ? 'C'
            : 'D';
  const taxOwed = payroll > luxuryThreshold ? calculateLuxuryTax(payroll) : 0;

  return {
    grade,
    availableSpace,
    luxuryTaxRoom,
    canAddStar: availableSpace >= 25 && luxuryTaxRoom >= 10,
    canAddRole: availableSpace >= 6,
    narrativeSummary:
      taxOwed > 0
        ? `The club is already above the tax line and projects a ${taxOwed.toFixed(2)} million penalty without further maneuvering.`
        : `The club has ${availableSpace.toFixed(2)} million in budget room and ${luxuryTaxRoom.toFixed(2)} million before the tax threshold.`,
  };
}

export function generateFinancialPlaybook(context: FinancialContext): FinancialPlaybook {
  const payroll = analyzePayrollBreakdown(context.players);
  const teamId = context.players[0]?.teamId;
  const payrollState = teamId != null ? calculateTeamPayroll(teamId, context.players) : null;
  const flexibility = calculateFinancialFlexibility(
    payrollState?.totalPayroll ?? payroll.totalPayroll,
    context.budget,
    context.luxuryTaxThreshold,
  );

  return {
    payroll,
    extensions: identifyExtensionPriorities(context.players),
    flexibility,
    spendingOptions: [
      {
        id: 'big_spender',
        label: 'Big Spender',
        description: 'Use available room to chase premium talent and accept the risk that comes with top-of-market spending.',
      },
      {
        id: 'penny_pincher',
        label: 'Penny Pincher',
        description: 'Avoid long-term drag, stay out of the tax zone, and prioritize surplus value over headlines.',
      },
      {
        id: 'balanced',
        label: 'Balanced',
        description: 'Spend with intent, protect future flexibility, and keep extensions for the right core pieces.',
      },
    ],
  };
}
