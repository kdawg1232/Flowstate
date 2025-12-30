import type { UserStats } from './types';

export const FLOWSTATE_AUTH_KEY = 'flowstate_auth';
export const FLOWSTATE_STATS_KEY = 'flowstate_stats';
export const FLOWSTATE_LAST_LOGIN_KEY = 'flowstate_last_login';

export function defaultStats(): UserStats {
  return {
    level: 1,
    xp: 0,
    totalReps: 0,
    dailyReps: 0,
    mentalReps: 0,
    physicalReps: 0,
    streak: 1,
    activityHistory: {},
    gameStats: {
      pulse: { bestScore: 0, timesPlayed: 0, category: 'MEMORY' },
      signal: { bestScore: 0, timesPlayed: 0, category: 'SPEED' },
      flanker: { bestScore: 0, timesPlayed: 0, category: 'ATTENTION' },
      logic_link: { bestScore: 0, timesPlayed: 0, category: 'FLEXIBILITY' },
      math_dash: { bestScore: 0, timesPlayed: 0, category: 'MATH' },
      pushups: { bestScore: 0, timesPlayed: 0, category: 'PHYSICAL' },
      situps: { bestScore: 0, timesPlayed: 0, category: 'PHYSICAL' },
      planks: { bestScore: 0, timesPlayed: 0, category: 'PHYSICAL' },
    },
  };
}

