export enum MultiplierType {
  None = 'None',
  DL = 'DL', // Double Letter
  TL = 'TL', // Triple Letter
  DW = 'DW', // Double Word
  TW = 'TW', // Triple Word
  Star = 'Star' // Center
}

export interface TileData {
  id: string;
  letter: string;
  value: number;
  isBlank?: boolean;
}

export interface BoardSquare {
  row: number;
  col: number;
  multiplier: MultiplierType;
  tile: TileData | null;
  isTemp?: boolean; // If true, it's being placed this turn but not locked
}

export interface Player {
  id: number;
  name: string;
  score: number;
  rack: TileData[];
  timeLeft: number; // in seconds
  isActive: boolean;
}

export enum GamePhase {
  Setup,
  Playing,
  Validating,
  GameOver
}

export interface ValidationResult {
  isValid: boolean;
  words: string[];
  score: number;
  message?: string;
}
