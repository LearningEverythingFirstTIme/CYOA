'use client';

import React, { useEffect, useState } from 'react';
import type { SilenceLedger, ChoiceRecord } from '@/app/types';

interface JourneyVisualizationProps {
  choicesMade: ChoiceRecord[];
  endingId: string;
  onComplete?: () => void;
}

// Generate a visual waveform from the choices made
function generateWaveform(choices: ChoiceRecord[]): number[] {
  const waveform: number[] = [];
  
  for (let i = 0; i < 100; i++) {
    const choiceIndex = Math.floor((i / 100) * choices.length);
    const choice = choices[choiceIndex];
    
    if (choice) {
      // Create variation based on choice ID hash
      const hash = choice.choiceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const amplitude = (hash % 50) + 20;
      waveform.push(amplitude);
    } else {
      waveform.push(10);
    }
  }
  
  return waveform;
}

// Get ending frequency pattern
function getEndingPattern(endingId: string): string {
  if (endingId.includes('white_noise')) return 'chaotic';
  if (endingId.includes('static')) return 'flat';
  if (endingId.includes('harmonic')) return 'sine';
  if (endingId.includes('absolute')) return 'spike';
  if (endingId.includes('capital')) return 'square';
  return 'noise';
}

export function JourneyVisualization({ choicesMade, endingId, onComplete }: JourneyVisualizationProps) {
  const [isAnimating, setIsAnimating] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const waveform = generateWaveform(choicesMade);
  const pattern = getEndingPattern(endingId);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setShowShare(true);
      onComplete?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const patternColors: Record<string, string> = {
    chaotic: '#ff006e',
    flat: '#888888',
    sine: '#00f0ff',
    spike: '#9d4edd',
    square: '#ff9f1c',
    noise: '#ffffff',
  };

  const patternNames: Record<string, string> = {
    chaotic: 'CHAOTIC FREQUENCY',
    flat: 'STATIC HUM',
    sine: 'HARMONIC WAVE',
    spike: 'ABSOLUTE SPIKE',
    square: 'CAPITAL PULSE',
    noise: 'WHITE NOISE',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8">
      {/* Background waveform animation */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {waveform.map((amp, i) => (
            <rect
              key={i}
              x={`${i}%`}
              y={`${50 - amp / 2}%`}
              width="1%"
              height={`${amp}%`}
              fill={patternColors[pattern]}
              className={isAnimating ? 'animate-pulse' : ''}
              style={{
                animationDelay: `${i * 10}ms`,
                opacity: isAnimating ? 0.3 + (amp / 100) * 0.7 : 0.5,
              }}
            />
          ))}
        </svg>
      </div>

      {/* Main visualization */}
      <div className="relative z-10 text-center">
        <h2 className="font-heading text-2xl md:text-4xl mb-2 tracking-[0.3em]">
          <span style={{ color: patternColors[pattern] }}>
            YOUR FREQUENCY
          </span>
        </h2>
        
        <p className="font-mono text-sm text-white/50 mb-8">
          {choicesMade.length} choices made across {Math.floor(choicesMade.length * 2.5)} minutes
        </p>

        {/* Central waveform display */}
        <div className="w-64 h-32 md:w-96 md:h-48 mb-8 relative">
          <svg viewBox="0 0 100 50" className="w-full h-full">
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={patternColors[pattern]} stopOpacity="0.2" />
                <stop offset="50%" stopColor={patternColors[pattern]} stopOpacity="1" />
                <stop offset="100%" stopColor={patternColors[pattern]} stopOpacity="0.2" />
              </linearGradient>
            </defs>
            
            {/* Waveform path */}
            <path
              d={waveform.map((amp, i) => {
                const x = i;
                const y = 25 + (pattern === 'sine' 
                  ? Math.sin(i * 0.2) * amp / 2
                  : pattern === 'spike'
                  ? (i === 50 ? -amp : 0)
                  : pattern === 'square'
                  ? (i % 10 < 5 ? -amp / 3 : amp / 3)
                  : pattern === 'flat'
                  ? amp / 10
                  : (Math.random() - 0.5) * amp
                );
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="url(#waveGradient)"
              strokeWidth="0.5"
              className={isAnimating ? '' : 'drop-shadow-[0_0_10px_currentColor]'}
              style={{
                color: patternColors[pattern],
                filter: `drop-shadow(0 0 10px ${patternColors[pattern]})`,
              }}
            />
            
            {/* Mirror waveform */}
            <path
              d={waveform.map((amp, i) => {
                const x = i;
                const y = 25 - (pattern === 'sine' 
                  ? Math.sin(i * 0.2) * amp / 2
                  : pattern === 'spike'
                  ? (i === 50 ? -amp : 0)
                  : pattern === 'square'
                  ? (i % 10 < 5 ? -amp / 3 : amp / 3)
                  : pattern === 'flat'
                  ? amp / 10
                  : (Math.random() - 0.5) * amp
                );
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke={patternColors[pattern]}
              strokeWidth="0.3"
              opacity="0.3"
            />
          </svg>

          {/* Pattern label */}
          <div 
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs tracking-[0.3em] px-3 py-1 rounded"
            style={{ 
              color: patternColors[pattern],
              border: `1px solid ${patternColors[pattern]}40`,
              background: `${patternColors[pattern]}10`,
            }}
          >
            {patternNames[pattern]}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mb-8 text-center">
          <div>
            <div className="font-heading text-2xl" style={{ color: patternColors[pattern] }}>
              {choicesMade.length}
            </div>
            <div className="font-mono text-xs text-white/40">CHOICES</div>
          </div>
          <div>
            <div className="font-heading text-2xl" style={{ color: patternColors[pattern] }}>
              {new Set(choicesMade.map(c => c.nodeId)).size}
            </div>
            <div className="font-mono text-xs text-white/40">NODES</div>
          </div>
          <div>
            <div className="font-heading text-2xl" style={{ color: patternColors[pattern] }}>
              {Math.floor((choicesMade.length / 50) * 100)}%
            </div>
            <div className="font-mono text-xs text-white/40">EXPLORED</div>
          </div>
        </div>

        {/* Share button */}
        {showShare && (
          <button
            onClick={() => {
              // Create shareable text
              const shareText = `I navigated the sonic economy of Audivale and reached the ${patternNames[pattern]} ending. ${choicesMade.length} choices led me here. #SilenceBureau`;
              navigator.clipboard.writeText(shareText);
              alert('Journey summary copied to clipboard!');
            }}
            className="font-mono text-sm px-6 py-3 border rounded transition-all hover:scale-105"
            style={{ 
              color: patternColors[pattern],
              borderColor: `${patternColors[pattern]}60`,
            }}
          >
            COPY JOURNEY
          </button>
        )}
      </div>
    </div>
  );
}
