'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { GameState, Branch, ChoiceRecord, SilenceLedger } from '@/app/types';

interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  ledger: SilenceLedger;
  makeChoice: (choiceId: string, nextNodeId: string) => void;
  rewind: (steps: number) => void;
  restart: () => void;
  canRewind: boolean;
}

type GameAction =
  | { type: 'MAKE_CHOICE'; payload: { choiceId: string; nextNodeId: string } }
  | { type: 'SET_NODE'; payload: string }
  | { type: 'REWIND'; payload: number }
  | { type: 'RESTART' }
  | { type: 'SET_BRANCH'; payload: Branch }
  | { type: 'SET_FLAG'; payload: { key: string; value: boolean } }
  | { type: 'LOAD_STATE'; payload: Partial<GameState> }
  | { type: 'UPDATE_LEDGER'; payload: Partial<SilenceLedger> };

const initialState: GameState = {
  currentNodeId: 'start',
  history: [],
  flags: {},
  branch: 'neutral',
  startTime: Date.now(),
  choicesMade: [],
};

const initialLedger: SilenceLedger = {
  endingsUnlocked: [],
  nodesVisited: [],
  branchesExplored: [],
  npcsEncountered: [],
  totalPlaytime: 0,
  completionPercentage: 0,
  firstEndingReached: false,
  treeMapUnlocked: false,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MAKE_CHOICE': {
      const { choiceId, nextNodeId } = action.payload;
      const choiceRecord: ChoiceRecord = {
        nodeId: state.currentNodeId,
        choiceId,
        timestamp: Date.now(),
      };
      return {
        ...state,
        currentNodeId: nextNodeId,
        history: [...state.history, state.currentNodeId],
        choicesMade: [...state.choicesMade, choiceRecord],
      };
    }
    case 'SET_NODE':
      return {
        ...state,
        currentNodeId: action.payload,
        history: [...state.history, state.currentNodeId],
      };
    case 'REWIND': {
      const steps = action.payload;
      if (state.history.length < steps) return state;
      const newHistory = state.history.slice(0, -steps);
      const newNodeId = newHistory[newHistory.length - 1] || 'start';
      return {
        ...state,
        currentNodeId: newNodeId,
        history: newHistory.slice(0, -1),
        choicesMade: state.choicesMade.slice(0, -steps),
      };
    }
    case 'RESTART':
      return {
        ...initialState,
        startTime: Date.now(),
      };
    case 'SET_BRANCH':
      return {
        ...state,
        branch: action.payload,
      };
    case 'SET_FLAG':
      return {
        ...state,
        flags: {
          ...state.flags,
          [action.payload.key]: action.payload.value,
        },
      };
    case 'LOAD_STATE':
      return {
        ...state,
        ...action.payload,
      };
    default:
      return state;
  }
}

function ledgerReducer(ledger: SilenceLedger, state: GameState, action: GameAction): SilenceLedger {
  switch (action.type) {
    case 'MAKE_CHOICE':
    case 'SET_NODE': {
      const nodeId = state.currentNodeId;
      if (!ledger.nodesVisited.includes(nodeId)) {
        return {
          ...ledger,
          nodesVisited: [...ledger.nodesVisited, nodeId],
        };
      }
      return ledger;
    }
    case 'SET_BRANCH': {
      const branch = action.payload;
      if (!ledger.branchesExplored.includes(branch)) {
        return {
          ...ledger,
          branchesExplored: [...ledger.branchesExplored, branch],
        };
      }
      return ledger;
    }
    default:
      return ledger;
  }
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const STORAGE_KEY = 'silence-bureau-state';
const LEDGER_KEY = 'silence-bureau-ledger';

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [ledger, setLedger] = React.useState<SilenceLedger>(initialLedger);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load saved state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      const savedLedger = localStorage.getItem(LEDGER_KEY);
      
      if (savedState) {
        const parsed = JSON.parse(savedState);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      }
      
      if (savedLedger) {
        setLedger(JSON.parse(savedLedger));
      }
    } catch (e) {
      console.error('Failed to load saved state:', e);
    }
    
    setIsLoaded(true);
  }, []);

  // Auto-save on state changes
  useEffect(() => {
    if (!isLoaded || typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [state, isLoaded]);

  // Update ledger when state changes
  useEffect(() => {
    if (!isLoaded) return;
    
    const newLedger = ledgerReducer(ledger, state, { type: 'SET_NODE', payload: state.currentNodeId });
    if (newLedger !== ledger) {
      setLedger(newLedger);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LEDGER_KEY, JSON.stringify(newLedger));
      }
    }
  }, [state.currentNodeId, isLoaded]);

  const makeChoice = useCallback((choiceId: string, nextNodeId: string) => {
    dispatch({ type: 'MAKE_CHOICE', payload: { choiceId, nextNodeId } });
  }, []);

  const rewind = useCallback((steps: number) => {
    dispatch({ type: 'REWIND', payload: steps });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  const canRewind = state.history.length > 0;

  const value: GameContextType = {
    state,
    dispatch,
    ledger,
    makeChoice,
    rewind,
    restart,
    canRewind,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}

// Helper to unlock an ending
export function unlockEnding(endingId: string) {
  if (typeof window === 'undefined') return;
  
  try {
    const savedLedger = localStorage.getItem(LEDGER_KEY);
    const ledger: SilenceLedger = savedLedger ? JSON.parse(savedLedger) : initialLedger;
    
    if (!ledger.endingsUnlocked.includes(endingId)) {
      const updatedLedger: SilenceLedger = {
        ...ledger,
        endingsUnlocked: [...ledger.endingsUnlocked, endingId],
        firstEndingReached: true,
        treeMapUnlocked: true,
      };
      localStorage.setItem(LEDGER_KEY, JSON.stringify(updatedLedger));
    }
  } catch (e) {
    console.error('Failed to unlock ending:', e);
  }
}

// Helper to record NPC encounter
export function recordNPC(npcId: string) {
  if (typeof window === 'undefined') return;
  
  try {
    const savedLedger = localStorage.getItem(LEDGER_KEY);
    const ledger: SilenceLedger = savedLedger ? JSON.parse(savedLedger) : initialLedger;
    
    if (!ledger.npcsEncountered.includes(npcId)) {
      const updatedLedger: SilenceLedger = {
        ...ledger,
        npcsEncountered: [...ledger.npcsEncountered, npcId],
      };
      localStorage.setItem(LEDGER_KEY, JSON.stringify(updatedLedger));
    }
  } catch (e) {
    console.error('Failed to record NPC:', e);
  }
}
