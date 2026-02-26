'use client';

import { useState, useEffect, useCallback } from 'react';

interface TypewriterOptions {
  text: string;
  speed?: number;
  onComplete?: () => void;
  skipOnInteraction?: boolean;
}

export function useTypewriter({
  text,
  speed = 30,
  onComplete,
  skipOnInteraction = true,
}: TypewriterOptions) {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayText('');
    setIsComplete(false);
    setIsSkipped(false);
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (isSkipped || isComplete) return;

    if (currentIndex >= text.length) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    const timeout = setTimeout(() => {
      setDisplayText(text.slice(0, currentIndex + 1));
      setCurrentIndex(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timeout);
  }, [currentIndex, text, speed, isSkipped, isComplete, onComplete]);

  const skip = useCallback(() => {
    if (!isComplete) {
      setIsSkipped(true);
      setDisplayText(text);
      setIsComplete(true);
      onComplete?.();
    }
  }, [text, isComplete, onComplete]);

  useEffect(() => {
    if (!skipOnInteraction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        skip();
      }
    };

    const handleClick = () => {
      skip();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClick);
    };
  }, [skip, skipOnInteraction]);

  return {
    displayText,
    isComplete,
    isSkipped,
    skip,
    progress: text.length > 0 ? currentIndex / text.length : 0,
  };
}
