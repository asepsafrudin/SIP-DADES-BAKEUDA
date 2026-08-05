import { logger } from '@/utils/logger';

interface KillSwitchState {
  active: boolean;
  reason: string;
  updatedAt: string;
  monthlyUsageCostUsd: number;
  monthlyBudgetLimitUsd: number;
}

let state: KillSwitchState = {
  active: false,
  reason: 'Operational Normal',
  updatedAt: new Date().toISOString(),
  monthlyUsageCostUsd: 14.50,
  monthlyBudgetLimitUsd: 50.00
};

export function getKillSwitchState(): KillSwitchState {
  return { ...state };
}

export function setKillSwitchState(active: boolean, reason: string = 'Manual Admin Trigger'): KillSwitchState {
  state = {
    ...state,
    active,
    reason,
    updatedAt: new Date().toISOString()
  };
  logger.warn('AI_KILL_SWITCH', `Kill switch status changed to ${active ? 'ACTIVE (FALLBACK MODE)' : 'INACTIVE'}`, { reason });
  return getKillSwitchState();
}

export function recordAiUsage(costUsd: number): KillSwitchState {
  state.monthlyUsageCostUsd += costUsd;
  if (state.monthlyUsageCostUsd >= state.monthlyBudgetLimitUsd && !state.active) {
    setKillSwitchState(true, 'Budget Limit Reached ($50.00 USD)');
  }
  return getKillSwitchState();
}
