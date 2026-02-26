'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ParagraphTypewriterProps {
  paragraphs: string[];
  speed?: number;
  delayBetweenParagraphs?: number;
  onComplete?: () => void;
  className?: string;
  tenseParagraphs?: number[];
}

export function ParagraphTypewriter({
  paragraphs,
  speed = 25,
  delayBetweenParagraphs = 500,
  onComplete,
  className = '',
  tenseParagraphs = [],
}: ParagraphTypewriterProps) {
  const [completedParagraphs, setCompletedParagraphs] = useState<string[]>([]);
  const [currentParagraphIndex, setCurrentParagraphIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);

  useEffect(() => {
    setCompletedParagraphs([]);
    setCurrentParagraphIndex(0);
    setCurrentText('');
    setIsComplete(false);
    setIsSkipped(false);
  }, [paragraphs]);

  useEffect(() => {
    if (isSkipped) {
      setCompletedParagraphs(paragraphs);
      setCurrentParagraphIndex(paragraphs.length);
      setCurrentText('');
      setIsComplete(true);
      onComplete?.();
      return;
    }

    if (currentParagraphIndex >= paragraphs.length) {
      if (!isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const currentParagraph = paragraphs[currentParagraphIndex];

    if (currentText.length < currentParagraph.length) {
      const timeout = setTimeout(() => {
        setCurrentText(currentParagraph.slice(0, currentText.length + 1));
      }, speed);
      return () => clearTimeout(timeout);
    } else {
      const timeout = setTimeout(() => {
        setCompletedParagraphs(prev => [...prev, currentParagraph]);
        setCurrentParagraphIndex(prev => prev + 1);
        setCurrentText('');
      }, delayBetweenParagraphs);
      return () => clearTimeout(timeout);
    }
  }, [currentText, currentParagraphIndex, paragraphs, speed, delayBetweenParagraphs, isSkipped, isComplete, onComplete]);

  const skip = useCallback(() => {
    if (!isComplete) {
      setIsSkipped(true);
    }
  }, [isComplete]);

  useEffect(() => {
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
  }, [skip]);

  return (
    <div className={className}>
      {completedParagraphs.map((para, idx) => (
        <p
          key={idx}
          className={`mb-4 ${tenseParagraphs.includes(idx) ? 'vibrate-text' : ''}`}
          dangerouslySetInnerHTML={{ __html: para }}
        />
      ))}
      {currentParagraphIndex < paragraphs.length && (
        <p
          className={`mb-4 ${tenseParagraphs.includes(currentParagraphIndex) ? 'vibrate-text' : ''}`}
        >
          {currentText}
          <span className="animate-pulse">▊</span>
        </p>
      )}
      {!isComplete && (
        <button
          onClick={skip}
          className="fixed bottom-8 right-8 text-xs text-white/30 hover:text-white/60 
                     font-mono tracking-wider transition-colors z-50"
        >
          [SKIP]
        </button>
      )}
    </div>
  );
}
