export const MILESTONES = [
  { reps: 250, label: 'Focused', reward: 10, rewardLabel: '10 Minutes per Hour' },
  { reps: 500, label: 'High Performance', reward: 15, rewardLabel: '15 Minutes per Hour' },
  { reps: 750, label: 'Peak Calibration', reward: 20, rewardLabel: '20 Minutes per Hour' },
  { reps: 1000, label: 'FLOWSTATE', reward: 60, rewardLabel: 'Unlimited' }, // 60 means full hour
];

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
