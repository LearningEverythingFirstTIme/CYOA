'use client';

import React, { useState, useEffect } from 'react';
import { useGame } from '@/app/contexts/GameContext';
import type { StoryNode, SilenceLedger } from '@/app/types';

interface StoryMapProps {
  nodes: Record<string, StoryNode>;
  isOpen: boolean;
  onClose: () => void;
}

interface TreeNode {
  id: string;
  node: StoryNode;
  children: TreeNode[];
  depth: number;
}

function buildTree(nodes: Record<string, StoryNode>, startId: string = 'start', maxDepth: number = 10): TreeNode | null {
  const visited = new Set<string>();
  
  function buildNode(id: string, depth: number): TreeNode | null {
    if (depth > maxDepth || visited.has(id)) return null;
    visited.add(id);
    
    const node = nodes[id];
    if (!node) return null;
    
    const treeNode: TreeNode = {
      id,
      node,
      children: [],
      depth,
    };
    
    if (node.choices) {
      for (const choice of node.choices) {
        const child = buildNode(choice.next, depth + 1);
        if (child) {
          treeNode.children.push(child);
        }
      }
    }
    
    return treeNode;
  }
  
  return buildNode(startId, 0);
}

function TreeNodeComponent({
  treeNode,
  visitedNodes,
  currentNodeId,
  onNodeClick,
}: {
  treeNode: TreeNode;
  visitedNodes: string[];
  currentNodeId: string;
  onNodeClick: (id: string) => void;
}) {
  const isVisited = visitedNodes.includes(treeNode.id);
  const isCurrent = treeNode.id === currentNodeId;
  const isEnding = treeNode.node.ending;
  
  const nodeClasses = `
    inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-mono
    transition-all duration-300 cursor-pointer
    ${isCurrent ? 'bg-cyan-400 text-black animate-pulse scale-110' : ''}
    ${!isCurrent && isVisited ? 'bg-white/20 text-white border border-white/30' : ''}
    ${!isCurrent && !isVisited ? 'bg-black/40 text-white/20 border border-white/10' : ''}
    ${isEnding && isVisited ? 'border-pink-500/50 shadow-[0_0_10px_rgba(255,0,110,0.3)]' : ''}
  `;
  
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => onNodeClick(treeNode.id)}
        className={nodeClasses}
        title={`${treeNode.node.location || treeNode.id}${isEnding ? ' (Ending)' : ''}`}
      >
        {treeNode.depth + 1}
      </button>
      
      {treeNode.children.length > 0 && (
        <div className="flex gap-4 mt-4">
          {treeNode.children.map((child) => (
            <div key={child.id} className="relative">
              {/* Connection line */}
              <div className={`
                absolute -top-4 left-1/2 w-px h-4 -translate-x-1/2
                ${visitedNodes.includes(child.id) ? 'bg-cyan-400/50' : 'bg-white/10'}
              `} />
              <TreeNodeComponent
                treeNode={child}
                visitedNodes={visitedNodes}
                currentNodeId={currentNodeId}
                onNodeClick={onNodeClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StoryMap({ nodes, isOpen, onClose }: StoryMapProps) {
  const { state, dispatch } = useGame();
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [ledger, setLedger] = useState<SilenceLedger | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTree(buildTree(nodes));
      
      // Load ledger
      const saved = localStorage.getItem('silence-bureau-ledger');
      if (saved) {
        setLedger(JSON.parse(saved));
      }
    }
  }, [isOpen, nodes]);

  const handleNodeClick = (nodeId: string) => {
    dispatch({ type: 'SET_NODE', payload: nodeId });
    onClose();
  };

  if (!isOpen) return null;

  const visitedNodes = [...state.history, state.currentNodeId];
  const totalNodes = Object.keys(nodes).length;
  const visitedCount = new Set(visitedNodes).size;
  const completionRate = Math.round((visitedCount / totalNodes) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0a0a0f] border border-white/20 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="font-heading text-xl text-cyan-400">STORY MAP</h2>
            <p className="text-xs text-white/50 font-mono mt-1">
              {visitedCount} / {totalNodes} nodes visited ({completionRate}%)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-6 p-4 text-xs font-mono border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
            <span className="text-white/60">Current</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-white/20 border border-white/30"></span>
            <span className="text-white/60">Visited</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-black/40 border border-white/10"></span>
            <span className="text-white/60">Unexplored</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border border-pink-500/50"></span>
            <span className="text-white/60">Ending</span>
          </div>
        </div>

        {/* Tree */}
        <div className="p-8 overflow-auto">
          {tree ? (
            <div className="flex justify-center min-w-max">
              <TreeNodeComponent
                treeNode={tree}
                visitedNodes={visitedNodes}
                currentNodeId={state.currentNodeId}
                onNodeClick={handleNodeClick}
              />
            </div>
          ) : (
            <p className="text-center text-white/50">Loading map...</p>
          )}
        </div>

        {/* Ledger Summary */}
        {ledger && (
          <div className="p-4 border-t border-white/10 bg-white/5">
            <h3 className="font-mono text-xs tracking-wider text-pink-400 mb-3">SILENCE LEDGER</h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-white/40">Endings Unlocked: </span>
                <span className="text-white">{ledger.endingsUnlocked.length}</span>
              </div>
              <div>
                <span className="text-white/40">Branches Explored: </span>
                <span className="text-white">{ledger.branchesExplored.length}</span>
              </div>
              <div>
                <span className="text-white/40">NPCs Met: </span>
                <span className="text-white">{ledger.npcsEncountered.length}</span>
              </div>
              <div>
                <span className="text-white/40">Tree Map: </span>
                <span className={ledger.treeMapUnlocked ? 'text-cyan-400' : 'text-white/30'}>
                  {ledger.treeMapUnlocked ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
