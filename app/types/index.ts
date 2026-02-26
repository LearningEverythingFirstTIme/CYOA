export interface StoryNode {
  id: string;
  location: string;
  content: string;
  contentHTML?: string;
  choices?: Choice[];
  ending?: boolean;
  theme?: string;
  branch?: Branch;
  tense?: boolean;
  convergence?: boolean;
}

export interface Choice {
  id: string;
  text: string;
  flavor: string;
  next: string;
  weight?: 'light' | 'medium' | 'heavy';
}

export interface Story {
  meta: StoryMeta;
  nodes: Record<string, StoryNode>;
  stats: StoryStats;
}

export interface StoryMeta {
  id: string;
  title: string;
  author: string;
  description: string;
  theme: string;
  version: string;
}

export interface StoryStats {
  totalNodes: number;
  decisionPoints: number;
  endings: number;
  deadEnds: number;
}

export type Branch = 'archives' | 'debt' | 'hush' | 'cathedral' | 'noise' | 'neutral';

export interface GameState {
  currentNodeId: string;
  history: string[];
  flags: Record<string, boolean>;
  branch: Branch;
  startTime: number;
  choicesMade: ChoiceRecord[];
}

export interface ChoiceRecord {
  nodeId: string;
  choiceId: string;
  timestamp: number;
}

export interface SilenceLedger {
  endingsUnlocked: string[];
  nodesVisited: string[];
  branchesExplored: Branch[];
  npcsEncountered: string[];
  totalPlaytime: number;
  completionPercentage: number;
  firstEndingReached: boolean;
  treeMapUnlocked: boolean;
}

export interface AtmosphereConfig {
  branch: Branch;
  primaryColor: string;
  secondaryColor: string;
  pulseSpeed: number;
  pulseStyle: 'smooth' | 'steps' | 'glitch';
  hasCrystalline?: boolean;
  hasGlitch?: boolean;
  hasGeometry?: boolean;
}
