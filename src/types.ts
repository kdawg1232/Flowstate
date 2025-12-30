export type Tab = 'scroll' | 'progress' | 'profile';
export type FlowMode = 'mental' | 'physical' | 'mixed';
export type GameType =
  | 'pulse'
  | 'signal'
  | 'flanker'
  | 'logic_link'
  | 'math_dash'
  | 'pushups'
  | 'situps'
  | 'planks';

export type Category = 'MEMORY' | 'SPEED' | 'ATTENTION' | 'FLEXIBILITY' | 'MATH' | 'PHYSICAL';

export interface GameStat {
  bestScore: number;
  timesPlayed: number;
  category: Category;
}

export interface UserStats {
  level: number;
  xp: number;
  totalReps: number;
  dailyReps: number;
  mentalReps: number;
  physicalReps: number;
  streak: number;
  activityHistory: Record<string, number>; // Date string YYYY-MM-DD -> total reps
  gameStats: Record<string, GameStat>;
}

export interface LevelConfig {
  id: number;
  gridSize: number;
  activeNodes: number;
  flashSpeed: number;
  description: string;
  hasDecoys?: boolean;
  rotationDegrees?: number;
}

export enum GameState {
  IDLE = 'IDLE',
  OBSERVATION = 'OBSERVATION',
  RETENTION = 'RETENTION',
  ACTION = 'ACTION',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PLAYING = 'PLAYING',
  FINISHED = 'FINISHED',
}

