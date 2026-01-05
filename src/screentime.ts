export function calculateAllocatedMinutes(dailyReps: number): number {
  return Math.round(dailyReps / 10);
}

export const REPS_PER_MINUTE = 10;
