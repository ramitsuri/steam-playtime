
export interface GamingSession {
  game_id: number;
  start_time: string | number | Date; 
  duration: number; // minutes
}

export interface GameMetadata {
  game_id: number;
  name: string;
  genre: string;
}

export interface StatsData {
  totalGames: number;
  totalHours: number;
  topGames: { name: string; hours: number; game_id: number }[];
  weeklyDistribution: { day: string; hours: number }[];
  monthlyDistribution: { month: string; hours: number }[];
  timeOfDayDistribution: { hour: string; hours: number }[];
  sessions: GamingSession[];
}

export enum AnalysisState {
  IDLE = 'IDLE',
  LOADING_DB = 'LOADING_DB',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  ERROR = 'ERROR'
}
