'use client';

import { useEffect, useState } from 'react';
import { StoryEngine } from '@/app/components/StoryEngine';
import type { Story } from '@/app/types';

export default function Home() {
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load the story data
    fetch('/data/silence-bureau.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load story');
        return res.json();
      })
      .then((data) => setStory(data))
      .catch((err) => {
        console.error('Failed to load story:', err);
        setError('Failed to load the story. Please try again.');
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="text-center">
          <p className="text-red-400 font-mono mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-cyan-400 font-mono text-sm hover:underline"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050508]">
        <div className="text-center">
          <p className="text-cyan-400 font-mono animate-pulse">Loading story...</p>
        </div>
      </div>
    );
  }

  return <StoryEngine story={story} />;
}
