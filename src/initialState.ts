import type { UserStats } from './types';

export const FLOWSTATE_AUTH_KEY = 'flowstate_auth';
export const FLOWSTATE_STATS_KEY = 'flowstate_stats';
export const FLOWSTATE_LAST_LOGIN_KEY = 'flowstate_last_login';
export const FLOWSTATE_USERS_KEY = 'flowstate_users';
export const FLOWSTATE_CURRENT_USER_KEY = 'flowstate_current_user';

export function calculateLevel(xp: number) {
  // Level L is reached when total XP >= 5 * L * (L - 1)
  // Solving 5L^2 - 5L - XP = 0 for L
  const l = Math.floor((5 + Math.sqrt(25 + 20 * xp)) / 10);
  return Math.max(1, l);
}

export function defaultStats(): UserStats {
  return {
    level: 1,
    xp: 0,
    totalReps: 0,
    dailyReps: 0,
    maxDailyReps: 0,
    mentalReps: 0,
    physicalReps: 0,
    streak: 1,
    activityHistory: {},
    gameStats: {
      pulse: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'MEMORY' },
      signal: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'SPEED' },
      logic_link: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'FLEXIBILITY' },
      math_dash: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'MATH' },
      number_hunt: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'MATH' },
      color_memory: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'MEMORY' },
      keen: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'LOGIC' },
      bridges: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'LOGIC' },
      map: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'FLEXIBILITY' },
      untangle: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'SPEED' },
      pushups: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'PHYSICAL' },
      situps: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'PHYSICAL' },
      planks: { bestScore: 0, timesPlayed: 0, cleanFinishes: 0, category: 'PHYSICAL' },
    },
    screenTime: {
      allocatedMinutes: 0,
      usedMinutes: 0,
      restrictedAppTokens: [],
      isTrackingEnabled: false,
      maxMilestoneReached: 0,
      lastUpdateTimestamp: Date.now(),
    },
    habits: [],
    habitHistory: {},
    sealedDays: {},
    isDaySealed: false,
  };
}

