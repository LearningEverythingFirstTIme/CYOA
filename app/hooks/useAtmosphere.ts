'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AtmosphereConfig, Branch } from '@/app/types';

const atmosphereConfigs: Record<Branch, AtmosphereConfig> = {
  archives: {
    branch: 'archives',
    primaryColor: '#00f0ff',
    secondaryColor: '#0066cc',
    pulseSpeed: 6,
    pulseStyle: 'smooth',
    hasCrystalline: true,
  },
  debt: {
    branch: 'debt',
    primaryColor: '#ff9f1c',
    secondaryColor: '#cc7700',
    pulseSpeed: 2,
    pulseStyle: 'steps',
  },
  hush: {
    branch: 'hush',
    primaryColor: '#ffb3d9',
    secondaryColor: '#ff80c0',
    pulseSpeed: 8,
    pulseStyle: 'smooth',
  },
  cathedral: {
    branch: 'cathedral',
    primaryColor: '#9d4edd',
    secondaryColor: '#ffd700',
    pulseSpeed: 5,
    pulseStyle: 'smooth',
    hasGeometry: true,
  },
  noise: {
    branch: 'noise',
    primaryColor: '#ffffff',
    secondaryColor: '#888888',
    pulseSpeed: 0.5,
    pulseStyle: 'glitch',
    hasGlitch: true,
  },
  neutral: {
    branch: 'neutral',
    primaryColor: '#00f0ff',
    secondaryColor: '#ff006e',
    pulseSpeed: 4,
    pulseStyle: 'smooth',
  },
};

export function useAtmosphere(currentBranch: Branch) {
  const [config, setConfig] = useState<AtmosphereConfig>(atmosphereConfigs.neutral);
  const [isTense, setIsTense] = useState(false);

  useEffect(() => {
    setConfig(atmosphereConfigs[currentBranch] || atmosphereConfigs.neutral);
  }, [currentBranch]);

  const triggerTense = useCallback((duration: number = 3000) => {
    setIsTense(true);
    setTimeout(() => setIsTense(false), duration);
  }, []);

  const atmosphereClass = React.useMemo(() => {
    const classes = [`atmosphere-${config.branch}`];
    if (isTense) classes.push('atmosphere-tense');
    return classes.join(' ');
  }, [config.branch, isTense]);

  return {
    config,
    isTense,
    triggerTense,
    atmosphereClass,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
  };
}

export function getBranchFromNodeId(nodeId: string): Branch {
  if (nodeId.startsWith('archivist') || nodeId.startsWith('archives')) return 'archives';
  if (nodeId.startsWith('debt') || nodeId.startsWith('collector')) return 'debt';
  if (nodeId.startsWith('child') || nodeId.startsWith('hush')) return 'hush';
  if (nodeId.startsWith('cathedral') || nodeId.startsWith('church')) return 'cathedral';
  if (nodeId.startsWith('noise') || nodeId.startsWith('white')) return 'noise';
  return 'neutral';
}
