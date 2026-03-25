export const MILESTONES = [
  { reps: 250, label: 'Focused', reward: 30, rewardLabel: '30 Minutes per Day' },
  { reps: 500, label: 'High Performance', reward: 60, rewardLabel: '1 Hour per Day' },
  { reps: 750, label: 'Peak Calibration', reward: 120, rewardLabel: '2 Hours per Day' },
  { reps: 1000, label: 'FLOWSTATE', reward: 1440, rewardLabel: 'Unlimited' },
];

export const UNLIMITED_MINUTES = 1440;

export function getMilestoneForReps(reps: number) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (reps >= MILESTONES[i].reps) {
      return MILESTONES[i];
    }
  }
  return null;
}

export function calculateAllocatedMinutes(maxRepsToday: number): number {
  const milestone = getMilestoneForReps(maxRepsToday);
  return milestone ? milestone.reward : 0;
}
