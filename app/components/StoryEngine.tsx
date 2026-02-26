'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useGame, unlockEnding, recordNPC } from '@/app/contexts/GameContext';
import { useAtmosphere, getBranchFromNodeId } from '@/app/hooks/useAtmosphere';
import { ParagraphTypewriter } from '@/app/components/Typewriter';
import { ChoiceContainer } from '@/app/components/Choice';
import { StoryMap } from '@/app/components/StoryMap';
import { JourneyVisualization } from '@/app/components/JourneyVisualization';
import { SilenceLedgerPanel } from '@/app/components/SilenceLedger';
import type { Story, StoryNode, Choice } from '@/app/types';

interface StoryEngineProps {
  story: Story;
}

export function StoryEngine({ story }: StoryEngineProps) {
  const { state, makeChoice, restart, ledger } = useGame();
  const [currentNode, setCurrentNode] = useState<StoryNode | null>(null);
  const [showChoices, setShowChoices] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [previousRecap, setPreviousRecap] = useState<string | null>(null);

  const branch = getBranchFromNodeId(state.currentNodeId);
  const { atmosphereClass, triggerTense } = useAtmosphere(branch);

  // Load current node
  useEffect(() => {
    const node = story.nodes[state.currentNodeId];
    if (node) {
      setCurrentNode(node);
      setShowChoices(false);

      // Check for convergence point
      if (node.convergence && state.history.length > 0) {
        const prevNodeId = state.history[state.history.length - 1];
        const prevNode = story.nodes[prevNodeId];
        if (prevNode) {
          setPreviousRecap(`Previously: ${prevNode.location}`);
        }
      } else {
        setPreviousRecap(null);
      }

      // Trigger tense atmosphere
      if (node.tense) {
        triggerTense(3000);
      }

      // Record NPC if present
      if (node.id.includes('archivist')) recordNPC('The Archivist');
      if (node.id.includes('collector')) recordNPC('The Debt Collector');
      if (node.id.includes('child')) recordNPC('The Hush Child');
      if (node.id.includes('curator')) recordNPC('The High Curator');
    }
  }, [state.currentNodeId, story.nodes, state.history, triggerTense]);

  // Handle choice selection
  const handleChoice = useCallback((choice: Choice) => {
    makeChoice(choice.id, choice.next);
  }, [makeChoice]);

  // Handle ending
  useEffect(() => {
    if (currentNode?.ending) {
      unlockEnding(currentNode.id);
      
      // Show journey visualization for final decision
      if (state.currentNodeId === 'dp50' || currentNode.id.includes('ending_')) {
        setShowJourney(true);
      }
    }
  }, [currentNode, state.currentNodeId]);

  if (!currentNode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-mono text-white/50">Loading...</p>
      </div>
    );
  }

  // Parse content into paragraphs
  const paragraphs = currentNode.content
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => p.replace(/^\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>'));

  return (
    <div className={`min-h-screen transition-all duration-1000 ${atmosphereClass}`}>
      {/* Scanlines overlay */}
      <div className="scanlines" />

      {/* Ledger Panel */}
      <SilenceLedgerPanel />

      {/* Map button */}
      <button
        onClick={() => setShowMap(true)}
        className="fixed top-4 left-4 z-40 font-mono text-xs tracking-wider 
                   text-white/50 hover:text-cyan-400 transition-colors
                   border border-white/20 hover:border-cyan-400/50 
                   px-3 py-2 rounded bg-black/50 backdrop-blur-sm"
      >
        MAP
      </button>

      {/* Main content */}
      <main className="story-container relative z-10">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="font-heading text-2xl md:text-4xl tracking-[0.3em] mb-2">
            <span className="bg-gradient-to-b from-white to-cyan-400 bg-clip-text text-transparent">
              {story.meta.title}
            </span>
          </h1>
          <p className="font-mono text-xs tracking-[0.5em] text-pink-400">
            {story.meta.description}
          </p>
        </header>

        {/* Story card */}
        <article className="bg-[#0a0a0f]/80 backdrop-blur-sm border border-white/10 rounded-lg p-6 md:p-8 waveform-border"
        >
          {/* Previous recap */}
          {previousRecap && (
            <div className="mb-6 p-3 bg-white/5 rounded border-l-2 border-cyan-400">
              <p className="font-mono text-xs text-cyan-400/70">{previousRecap}</p>
            </div>
          )}

          {/* Location */}
          <div className="font-mono text-xs tracking-[0.3em] text-amber-400 mb-6 flex items-center gap-2"
          >
            <span>▸</span>
            {currentNode.location}
          </div>

          {/* Content */}
          <ParagraphTypewriter
            paragraphs={paragraphs}
            speed={20}
            delayBetweenParagraphs={400}
            onComplete={() => setShowChoices(true)}
            className="story-content text-white/90"
            tenseParagraphs={currentNode.tense ? [paragraphs.length - 1] : []}
          />

          {/* Choices */}
          {currentNode.choices && showChoices && (
            <ChoiceContainer
              choices={currentNode.choices.map((c, i) => ({
                ...c,
                id: c.id || `choice_${i}`,
                flavor: c.flavor || getFlavorForChoice(c.text),
              }))}
              onChoice={handleChoice}
            />
          )}

          {/* Ending theme */}
          {currentNode.ending && currentNode.theme && (
            <div className="mt-8 p-4 border-t border-b border-white/10 text-center"
            >
              <p className="font-mono text-sm text-amber-400/80 italic">
                "{currentNode.theme}"
              </p>
            </div>
          )}

          {/* Restart button for endings */}
          {currentNode.ending && (
            <div className="mt-8 text-center">
              <button
                onClick={restart}
                className="font-mono text-sm tracking-[0.2em] px-6 py-3 
                           border border-cyan-400 text-cyan-400 
                           hover:bg-cyan-400 hover:text-black transition-all"
              >
                BEGIN AGAIN
              </button>
            </div>
          )}
        </article>

        {/* Progress indicator */}
        <div className="fixed bottom-0 left-0 right-0 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 via-pink-500 to-amber-400 transition-all duration-500"
            style={{ width: `${Math.min((state.history.length / 50) * 100, 100)}%` }}
          />
        </div>
      </main>

      {/* Story Map */}
      <StoryMap
        nodes={story.nodes}
        isOpen={showMap}
        onClose={() => setShowMap(false)}
      />

      {/* Journey Visualization */}
      {showJourney && (
        <JourneyVisualization
          choicesMade={state.choicesMade}
          endingId={currentNode.id}
          onComplete={() => setShowJourney(false)}
        />
      )}
    </div>
  );
}

// Generate flavor text based on choice content
function getFlavorForChoice(text: string): string {
  const flavors = [
    'A decision that echoes through the silence...',
    'The city holds its breath...',
    'Sound shifts in the distance...',
    'A frequency resonates with your intent...',
    'The sonic economy adjusts...',
    'Silence gathers like a storm...',
    'Your footsteps alter the waveform...',
    'A note hangs in the air...',
  ];
  
  // Simple hash of text to pick consistent flavor
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return flavors[hash % flavors.length];
}
