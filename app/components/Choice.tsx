'use client';

import React, { useState, useEffect } from 'react';
import type { Choice } from '@/app/types';

interface ChoiceButtonProps {
  choice: Choice;
  index: number;
  onSelect: () => void;
  isSelected: boolean;
  isDisabled: boolean;
  totalChoices: number;
}

export function ChoiceButton({
  choice,
  index,
  onSelect,
  isSelected,
  isDisabled,
  totalChoices,
}: ChoiceButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  // Staggered animation delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 200 + 300);

    return () => clearTimeout(timer);
  }, [index]);

  // Fade out unchosen options
  useEffect(() => {
    if (isSelected) return;
    if (isDisabled && isVisible) {
      setIsFading(true);
    }
  }, [isDisabled, isVisible, isSelected]);

  const weightClasses = {
    light: 'border-white/10 hover:border-white/30',
    medium: 'border-cyan-400/30 hover:border-cyan-400/60',
    heavy: 'border-pink-500/40 hover:border-pink-500/70 shadow-[0_0_20px_rgba(255,0,110,0.1)]',
  };

  const weight = choice.weight || 'medium';

  return (
    <button
      onClick={onSelect}
      disabled={isDisabled}
      className={`
        relative w-full text-left p-5 rounded border transition-all duration-500
        ${weightClasses[weight]}
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
        ${isFading ? 'opacity-20 scale-95' : ''}
        ${isSelected ? 'bg-cyan-400/10 border-cyan-400' : 'bg-black/20'}
        ${isDisabled && !isSelected ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-white/5'}
        group
      `}
      style={{
        transitionDelay: isFading ? `${index * 50}ms` : '0ms',
      }}
    >
      {/* Choice Label */}
      <span className="font-mono text-xs tracking-[0.2em] text-pink-400 block mb-1">
        {String.fromCharCode(65 + index)} // {choice.id}
      </span>

      {/* Choice Text */}
      <span className={`
        text-white/90 group-hover:text-white transition-colors duration-300
        ${isSelected ? 'text-cyan-300' : ''}
      `}>
        {choice.text}
      </span>

      {/* Flavor Text - appears on hover */}
      <span className={`
        block mt-2 text-xs italic text-white/40 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300
        transform translate-y-1 group-hover:translate-y-0
      `}>
        {choice.flavor}
      </span>

      {/* Selection indicator */}
      {isSelected && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 animate-pulse">
          →
        </span>
      )}

      {/* Weight indicator line */}
      <div className={`
        absolute bottom-0 left-0 h-0.5 transition-all duration-500
        ${weight === 'heavy' ? 'w-full bg-gradient-to-r from-pink-500 to-purple-500' : ''}
        ${weight === 'medium' ? 'w-2/3 bg-gradient-to-r from-cyan-400 to-transparent' : ''}
        ${weight === 'light' ? 'w-1/3 bg-white/20' : ''}
      `} />
    </button>
  );
}

interface ChoiceContainerProps {
  choices: Choice[];
  onChoice: (choice: Choice) => void;
  disabled?: boolean;
}

export function ChoiceContainer({ choices, onChoice, disabled = false }: ChoiceContainerProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleSelect = (index: number, choice: Choice) => {
    if (disabled || selectedIndex !== null) return;
    
    setSelectedIndex(index);
    
    // Delay the actual choice to allow animation
    setTimeout(() => {
      onChoice(choice);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-3 mt-8">
      {choices.map((choice, index) => (
        <ChoiceButton
          key={choice.id}
          choice={choice}
          index={index}
          onSelect={() => handleSelect(index, choice)}
          isSelected={selectedIndex === index}
          isDisabled={disabled || (selectedIndex !== null && selectedIndex !== index)}
          totalChoices={choices.length}
        />
      ))}
    </div>
  );
}
