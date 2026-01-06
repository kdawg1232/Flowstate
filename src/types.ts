export interface UserAccount {
  username: string;
  password?: string;
}

export type Tab = 'scroll' | 'habits' | 'progress' | 'profile';
export type FlowMode = 'mental' | 'physical' | 'mixed';

export interface Habit {
  id: string;
  title: string;
  completedToday: boolean;
  lastCompletedDate: string | null;
  streak: number;
  color: string;
}
export type GameType =
  | 'pulse'
  | 'signal'
  | 'logic_link'
  | 'math_dash'
  | 'pushups'
  | 'situps'
  | 'planks'
  | 'untangle'
  | 'bridges'
  | 'keen'
  | 'color_memory'
  | 'number_hunt'
  | 'map';

export type Category = 'MEMORY' | 'SPEED' | 'ATTENTION' | 'FLEXIBILITY' | 'MATH' | 'PHYSICAL' | 'LOGIC';

export interface GameStat {
  bestScore: number;
  timesPlayed: number;
  category: Category;
}

export interface ScreenTimeStats {
  allocatedMinutes: number;
  usedMinutes: number;
  restrictedAppTokens: string[]; // Persistent tokens from FamilyControls
  isTrackingEnabled: boolean;
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
  screenTime: ScreenTimeStats;
  habits: Habit[];
  habitHistory: Record<string, string[]>; // Date string -> Array of completed habit IDs
  sealedDays: Record<string, boolean>; // Date string -> was sealed
  isDaySealed: boolean;
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

