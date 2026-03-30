import type { GameType } from '../types';

/** Distinct accent per game for bottom nav pill / highlights while on Stream. */
export const GAME_NAV_ACCENTS: Record<GameType, string> = {
  pulse: '#06b6d4',
  signal: '#f59e0b',
  logic_link: '#f43f5e',
  math_dash: '#3b82f6',
  untangle: '#f59e0b',
  bridges: '#6366f1',
  keen: '#06b6d4',
  color_memory: '#6366f1',
  number_hunt: '#6366f1',
  map: '#db2777',
  pushups: '#10b981',
  situps: '#10b981',
  planks: '#10b981',
};

export const TAB_ACCENTS = {
  progress: '#06b6d4',
  profile: '#34d399',
} as const;
