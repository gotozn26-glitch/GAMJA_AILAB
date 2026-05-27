export interface CinematicAnalysis {
  angle: string;
  shotType: string;
  meaning: string;
  symbolism: string;
  status: 'ACTIVE' | 'IDLE' | 'ANALYZING';
}

export interface ViewState {
  rotateX: number;
  rotateY: number;
  zoom: number;
}
