'use client';

import React from 'react';
import { useGame } from '@/app/contexts/GameContext';
import type { SilenceLedger } from '@/app/types';

export function SilenceLedgerPanel() {
  const [ledger, setLedger] = React.useState<SilenceLedger | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    const loadLedger = () => {
      const saved = localStorage.getItem('silence-bureau-ledger');
      if (saved) {
        setLedger(JSON.parse(saved));
      }
    };

    loadLedger();
    window.addEventListener('storage', loadLedger);
    return () => window.removeEventListener('storage', loadLedger);
  }, []);

  if (!ledger) return null;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-40 font-mono text-xs tracking-wider 
                   text-white/50 hover:text-cyan-400 transition-colors
                   border border-white/20 hover:border-cyan-400/50 
                   px-3 py-2 rounded bg-black/50 backdrop-blur-sm"
      >
        {isOpen ? 'CLOSE' : 'LEDGER'}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 z-40 w-72 bg-[#0a0a0f]/95 backdrop-blur-md 
                        border border-white/20 rounded-lg overflow-hidden"
        >
          <div className="p-4 border-b border-white/10">
            <h2 className="font-heading text-lg text-cyan-400 tracking-wider">SILENCE LEDGER</h2>
            <p className="text-xs text-white/40 font-mono mt-1">Your journey through Audivale</p>
          </div>

          <div className="p-4 space-y-4">
            {/* Endings */}
            <div>
              <h3 className="font-mono text-xs tracking-wider text-pink-400 mb-2">ENDINGS UNLOCKED</h3>
              {ledger.endingsUnlocked.length > 0 ? (
                <ul className="space-y-1">
                  {ledger.endingsUnlocked.map((ending) => (
                    <li key={ending} className="text-xs text-white/70 font-mono">
                      ▪ {ending.replace(/_/g, ' ').toUpperCase()}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/30 italic">No endings discovered yet...</p>
              )}
            </div>

            {/* Branches */}
            <div>
              <h3 className="font-mono text-xs tracking-wider text-amber-400 mb-2">BRANCHES EXPLORED</h3>
              <div className="flex flex-wrap gap-2">
                {ledger.branchesExplored.length > 0 ? (
                  ledger.branchesExplored.map((branch) => (
                    <span 
                      key={branch}
                      className="text-xs px-2 py-1 rounded bg-white/10 text-white/70"
                    >
                      {branch}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-white/30 italic">No branches explored...</span>
                )}
              </div>
            </div>

            {/* NPCs */}
            <div>
              <h3 className="font-mono text-xs tracking-wider text-purple-400 mb-2">NPCs ENCOUNTERED</h3>
              {ledger.npcsEncountered.length > 0 ? (
                <ul className="space-y-1">
                  {ledger.npcsEncountered.map((npc) => (
                    <li key={npc} className="text-xs text-white/70 font-mono">
                      ▪ {npc}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/30 italic">No NPCs met yet...</p>
              )}
            </div>

            {/* Progress */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-xs text-white/50">COMPLETION</span>
                <span className="font-mono text-xs text-cyan-400">{ledger.completionPercentage}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all"
                  style={{ width: `${ledger.completionPercentage}%` }}
                />
              </div>
            </div>

            {/* Tree Map Status */}
            <div className="pt-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs text-white/50">STORY MAP</span>
                <span className={`
                  font-mono text-xs
                  ${ledger.treeMapUnlocked ? 'text-cyan-400' : 'text-white/30'}
                `}>
                  {ledger.treeMapUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
              {!ledger.treeMapUnlocked && (
                <p className="text-xs text-white/30 mt-1">
                  Reach any ending to unlock the full story map.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
