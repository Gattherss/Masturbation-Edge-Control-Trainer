import type { Plan } from '@/types/models';
import { load, save, STORAGE_KEYS } from '@/lib/storage';

export const PLANS: Record<Plan['id'], Plan> = {
  basic: {
    id: 'basic',
    targetStim: [55, 85],
    targetRest: [30, 90],
    restMinAdjust: 0,
    promptFreqPct: 0.5
  },
  endurance: {
    id: 'endurance',
    targetStim: [70, 110],
    targetRest: [40, 90],
    restMinAdjust: 0,
    promptFreqPct: 0.4
  },
  wave: {
    id: 'wave',
    targetStim: [50, 120],
    targetRest: [30, 90],
    restMinAdjust: 0,
    promptFreqPct: 0.3
  },
  custom: {
    id: 'custom',
    targetStim: [70, 130],
    targetRest: [40, 120],
    restMinAdjust: 0,
    promptFreqPct: 0.5
  }
};

export function getPlan(mode: Plan['id']): Plan {
  if (mode === 'custom') {
    const data = load<Plan | null>(STORAGE_KEYS.plan, null);
    if (data && data.id === 'custom') return data;
  }
  return PLANS[mode];
}

export function saveCustomPlan(stim: [number, number], rest: [number, number]) {
  const plan: Plan = {
    ...PLANS.custom,
    id: 'custom',
    targetStim: stim,
    targetRest: rest
  };
  save(STORAGE_KEYS.plan, plan);
  return plan;
}

export function loadCustomPlan(): Plan {
  const p = load<Plan | null>(STORAGE_KEYS.plan, null);
  if (p && p.id === 'custom') return p;
  return PLANS.custom;
}
