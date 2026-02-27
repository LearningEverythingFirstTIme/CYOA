'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGame } from '@/app/contexts/GameContext';
import { useMapInteractions } from '@/app/hooks/useMapInteractions';
import { 
  calculateTreeLayout, 
  getBranchColor, 
  calculateMinimapViewport,
  searchNodes,
  type LayoutNode,
  type LayoutEdge,
  type TreeLayout
} from '@/app/lib/treeLayout';
import type { StoryNode, SilenceLedger } from '@/app/types';
import styles from './StoryMap.module.css';

interface StoryMapProps {
  nodes: Record<string, StoryNode>;
  isOpen: boolean;
  onClose: () => void;
}

// Branch filter options
const BRANCH_FILTERS = [
  { id: 'all', label: 'All Branches', color: '#888888' },
  { id: 'archives', label: 'Echo Archives', color: '#00f0ff' },
  { id: 'debt', label: 'Debt/Treasury', color: '#ff9f1c' },
  { id: 'hush', label: 'Hush Children', color: '#ffb3d9' },
  { id: 'cathedral', label: 'Cathedral', color: '#9d4edd' },
  { id: 'noise', label: 'White Noise', color: '#ffffff' },
];

export function StoryMap({ nodes, isOpen, onClose }: StoryMapProps) {
  const { state, dispatch } = useGame();
  const [ledger, setLedger] = useState<SilenceLedger | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [activeBranchFilter, setActiveBranchFilter] = useState<string>('all');
  const [showEndingsOnly, setShowEndingsOnly] = useState(false);
  const [showVisitedOnly, setShowVisitedOnly] = useState(false);
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [pathAnimation, setPathAnimation] = useState(true);
  
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    zoom,
    pan,
    setPan,
    isDragging,
    containerRef,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomTo,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    centerOnNode,
  } = useMapInteractions({
    initialZoom: 0.8,
    minZoom: 0.1,
    maxZoom: 4,
    zoomStep: 0.15,
  });

  // Load ledger when map opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const saved = localStorage.getItem('silence-bureau-ledger');
      if (saved) {
        setLedger(JSON.parse(saved));
      }
    }
  }, [isOpen]);

  // Calculate tree layout with filters
  const layout = useMemo(() => {
    if (!isOpen) return null;
    const currentPath = [...state.history, state.currentNodeId];
    const visitedNodes = Array.from(new Set(currentPath));
    return calculateTreeLayout(nodes, 'start', visitedNodes, currentPath, {
      branchFilter: activeBranchFilter === 'all' ? undefined : activeBranchFilter,
      showEndingsOnly,
      showVisitedOnly,
    });
  }, [isOpen, nodes, state.history, state.currentNodeId, activeBranchFilter, showEndingsOnly, showVisitedOnly]);

  // Update container size
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen, containerRef]);

  // Center on current node when layout loads
  useEffect(() => {
    if (!layout || !containerRef.current || containerSize.width === 0) return;
    
    const currentNode = layout.nodes.get(state.currentNodeId);
    if (currentNode) {
      centerOnNode(
        currentNode.x, 
        currentNode.y, 
        currentNode.width, 
        currentNode.height,
        containerSize.width,
        containerSize.height
      );
    }
  }, [layout, state.currentNodeId, containerSize, centerOnNode]);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchNodes(nodes, searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, nodes]);

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeDoubleClick = useCallback((nodeId: string) => {
    dispatch({ type: 'SET_NODE', payload: nodeId });
    onClose();
  }, [dispatch, onClose]);

  const handleJumpToNode = useCallback(() => {
    if (selectedNodeId) {
      dispatch({ type: 'SET_NODE', payload: selectedNodeId });
      onClose();
    }
  }, [selectedNodeId, dispatch, onClose]);

  const handleSearchResultClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSearchQuery('');
    setSearchResults([]);
    
    // Center on the searched node
    if (layout) {
      const node = layout.nodes.get(nodeId);
      if (node && containerSize.width > 0) {
        centerOnNode(
          node.x,
          node.y,
          node.width,
          node.height,
          containerSize.width,
          containerSize.height
        );
      }
    }
  }, [layout, containerSize, centerOnNode]);

  // Handle node hover with tooltip
  const handleNodeMouseEnter = useCallback((e: React.MouseEvent, nodeId: string) => {
    setHoveredNodeId(nodeId);
    
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip({ x: e.clientX, y: e.clientY, nodeId });
    }, 500);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    setTooltip(null);
  }, []);

  const handleNodeMouseMove = useCallback((e: React.MouseEvent) => {
    if (tooltip) {
      setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
    }
  }, [tooltip]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleZoomReset();
          break;
        case 'ArrowLeft':
          setPan(prev => ({ ...prev, x: prev.x + 50 }));
          break;
        case 'ArrowRight':
          setPan(prev => ({ ...prev, x: prev.x - 50 }));
          break;
        case 'ArrowUp':
          setPan(prev => ({ ...prev, y: prev.y + 50 }));
          break;
        case 'ArrowDown':
          setPan(prev => ({ ...prev, y: prev.y - 50 }));
          break;
        case 'Enter':
          if (selectedNodeId) {
            handleJumpToNode();
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            document.querySelector<HTMLInputElement>('.searchInput')?.focus();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleZoomReset, selectedNodeId, handleJumpToNode, setPan]);

  // Cleanup tooltip timeout
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen || !layout) return null;
  
  // Handle empty layout case (e.g., when filter excludes all nodes)
  if (layout.nodes.size === 0) {
    return (
      <div className={styles.storyMapOverlay}>
        <div className={styles.storyMapContainer}>
          <div className={styles.mapHeader}>
            <div>
              <h2 className={styles.mapTitle}>STORY MAP</h2>
              <p className={styles.mapSubtitle}>No nodes match the current filter</p>
            </div>
            <button className={styles.closeButton} onClick={onClose}>✕</button>
          </div>
          <div className={styles.emptyFilterState}>
            <p>Try selecting a different branch or clearing filters.</p>
            <button 
              className={styles.jumpButton}
              onClick={() => setActiveBranchFilter('all')}
            >
              Show All Branches
            </button>
          </div>
        </div>
      </div>
    );
  }

  const visitedNodes = new Set([...state.history, state.currentNodeId]);
  const totalNodes = Object.keys(nodes).length;
  const visitedCount = visitedNodes.size;
  const completionRate = Math.round((visitedCount / totalNodes) * 100);
  
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;
  const selectedLayoutNode = selectedNodeId ? layout.nodes.get(selectedNodeId) : null;

  // Calculate minimap viewport
  const minimapViewport = containerSize.width > 0 
    ? calculateMinimapViewport(containerSize.width, containerSize.height, layout.bounds, pan, zoom)
    : { x: 0, y: 0, width: 0, height: 0 };

  // Get endings count
  const endingsCount = Object.values(nodes).filter(n => n.ending).length;
  const endingsVisited = Array.from(visitedNodes).filter(id => nodes[id]?.ending).length;

  return (
    <div className={styles.storyMapOverlay}>
      <div className={styles.storyMapContainer}>
        {/* Header */}
        <div className={styles.mapHeader}>
          <div>
            <h2 className={styles.mapTitle}>STORY MAP</h2>
            <p className={styles.mapSubtitle}>
              {visitedCount} / {totalNodes} nodes visited ({completionRate}%) • {endingsVisited}/{endingsCount} endings
            </p>
          </div>
          <div className={styles.mapControls}>
            <button
              className={`${styles.controlButton} ${showSidebar ? styles.active : ''}`}
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? 'Hide Info' : 'Show Info'}
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search nodes... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map(nodeId => (
                  <button
                    key={nodeId}
                    onClick={() => handleSearchResultClick(nodeId)}
                    className={styles.searchResultItem}
                  >
                    {nodes[nodeId]?.location || nodeId}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Branch Filter */}
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Branch:</span>
            <select 
              className={styles.filterSelect}
              value={activeBranchFilter}
              onChange={(e) => setActiveBranchFilter(e.target.value)}
            >
              {BRANCH_FILTERS.map(filter => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className={styles.toggleGroup}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={showEndingsOnly}
                onChange={(e) => setShowEndingsOnly(e.target.checked)}
              />
              Endings Only
            </label>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={showVisitedOnly}
                onChange={(e) => setShowVisitedOnly(e.target.checked)}
              />
              Visited Only
            </label>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={pathAnimation}
                onChange={(e) => setPathAnimation(e.target.checked)}
              />
              Animate Path
            </label>
          </div>

          <div className={styles.zoomControls}>
            <button className={styles.zoomButton} onClick={handleZoomOut}>−</button>
            <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
            <button className={styles.zoomButton} onClick={handleZoomIn}>+</button>
            <button className={styles.zoomButton} onClick={handleZoomReset}>⟲</button>
          </div>
        </div>

        {/* Main Content */}
        <div className={styles.mapContent}>
          {/* SVG Canvas */}
          <div 
            ref={containerRef}
            className={styles.canvasContainer}
            onMouseDown={handlePanStart}
            onMouseMove={(e) => {
              handlePanMove(e);
              handleNodeMouseMove(e);
            }}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchStart={handlePanStart}
            onTouchMove={handlePanMove}
            onTouchEnd={handlePanEnd}
            onWheel={handleWheel}
          >
            <svg
              className={`${styles.svgCanvas} ${isDragging ? styles.dragging : ''}`}
              width="100%"
              height="100%"
              viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${containerSize.width / zoom} ${containerSize.height / zoom}`}
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="rgba(255, 255, 255, 0.3)" />
                </marker>
                <marker
                  id="arrowhead-visited"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#00f0ff" />
                </marker>
                <marker
                  id="arrowhead-current"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ff006e" />
                </marker>
                
                {/* Gradient definitions */}
                <linearGradient id="gradient-archives" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="100%" stopColor="#0066cc" />
                </linearGradient>
                <linearGradient id="gradient-debt" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff9f1c" />
                  <stop offset="100%" stopColor="#cc7700" />
                </linearGradient>
                <linearGradient id="gradient-hush" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffb3d9" />
                  <stop offset="100%" stopColor="#ff80c0" />
                </linearGradient>
                <linearGradient id="gradient-cathedral" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9d4edd" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
                <linearGradient id="gradient-noise" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#888888" />
                </linearGradient>
              </defs>

              {/* Grid Background */}
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
              </pattern>
              <rect 
                x={layout.bounds.minX} 
                y={layout.bounds.minY} 
                width={layout.bounds.width} 
                height={layout.bounds.height} 
                fill="url(#grid)" 
              />

              {/* Connection Lines */}
              {layout.edges.map((edge, index) => (
                <g key={edge.id}>
                  <path
                    d={edge.pathData}
                    className={`${styles.connectionLine} ${
                      edge.isOnPath ? styles.path : edge.isVisited ? styles.visited : styles.unvisited
                    } ${pathAnimation && edge.isOnPath ? styles.animated : ''}`}
                    markerEnd={edge.isOnPath ? "url(#arrowhead-current)" : edge.isVisited ? "url(#arrowhead-visited)" : "url(#arrowhead)"}
                    style={animationEnabled ? { animationDelay: `${index * 50}ms` } : undefined}
                  />
                  {/* Invisible wider path for easier hovering */}
                  <path
                    d={edge.pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="10"
                    className={styles.connectionHitArea}
                  />
                </g>
              ))}

              {/* Nodes */}
              {Array.from(layout.nodes.values()).map((node, index) => {
                const storyNode = nodes[node.id];
                const isVisited = visitedNodes.has(node.id);
                const isCurrent = state.currentNodeId === node.id;
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isEnding = storyNode?.ending;
                const branchColor = getBranchColor(node.branch || storyNode?.branch);
                const isSearchResult = searchResults.includes(node.id);
                
                // Get gradient ID based on branch
                const gradientId = node.branch ? `gradient-${node.branch}` : undefined;
                
                return (
                  <g
                    key={node.id}
                    className={`${styles.nodeGroup} ${isCurrent ? styles.nodeCurrent : ''} ${animationEnabled ? styles.animated : ''}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ animationDelay: `${index * 20}ms` }}
                    onClick={() => handleNodeClick(node.id)}
                    onDoubleClick={() => handleNodeDoubleClick(node.id)}
                    onMouseEnter={(e) => handleNodeMouseEnter(e, node.id)}
                    onMouseLeave={handleNodeMouseLeave}
                  >
                    {/* Selection highlight */}
                    {isSelected && (
                      <rect
                        x={-8}
                        y={-8}
                        width={node.width + 16}
                        height={node.height + 16}
                        rx={10}
                        fill="none"
                        stroke="#ff006e"
                        strokeWidth={2}
                        strokeDasharray="5,5"
                        className={styles.selectionHighlight}
                      />
                    )}
                    
                    {/* Hover highlight */}
                    {isHovered && !isSelected && (
                      <rect
                        x={-6}
                        y={-6}
                        width={node.width + 12}
                        height={node.height + 12}
                        rx={8}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.5)"
                        strokeWidth={1}
                      />
                    )}
                    
                    {/* Node background */}
                    <rect
                      className={styles.nodeRect}
                      width={node.width}
                      height={node.height}
                      rx={6}
                      fill={isCurrent 
                        ? '#00f0ff' 
                        : gradientId && isVisited
                          ? `url(#${gradientId})`
                          : isVisited 
                            ? 'rgba(255, 255, 255, 0.15)' 
                            : 'rgba(0, 0, 0, 0.6)'
                      }
                      stroke={isEnding && isVisited ? '#ff006e' : isSearchResult ? '#ffff00' : branchColor}
                      strokeWidth={isCurrent ? 3 : isEnding && isVisited ? 2 : 1}
                      filter={isCurrent ? 'url(#glow-strong)' : isVisited ? 'url(#glow)' : undefined}
                      opacity={isVisited || isCurrent ? 1 : 0.7}
                    />
                    
                    {/* Branch indicator bar */}
                    <rect
                      x={4}
                      y={4}
                      width={4}
                      height={node.height - 8}
                      rx={2}
                      fill={branchColor}
                      opacity={0.9}
                    />
                    
                    {/* Node depth number */}
                    <text
                      className={styles.nodeText}
                      x={node.width / 2}
                      y={node.height / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isCurrent ? '#000' : '#fff'}
                      fontWeight={isCurrent ? 'bold' : 'normal'}
                    >
                      {node.depth + 1}
                    </text>
                    
                    {/* Node location label */}
                    <text
                      className={styles.nodeLabel}
                      x={node.width / 2}
                      y={node.height + 14}
                      textAnchor="middle"
                      fill={isVisited ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)'}
                    >
                      {storyNode?.location?.substring(0, 18) || node.id}
                    </text>
                    
                    {/* Ending indicator star */}
                    {isEnding && isVisited && (
                      <text
                        x={node.width - 8}
                        y={16}
                        textAnchor="middle"
                        fontSize={12}
                        fill="#ff006e"
                        filter="url(#glow)"
                      >
                        ★
                      </text>
                    )}
                    
                    {/* Current position indicator */}
                    {isCurrent && (
                      <circle
                        cx={node.width / 2}
                        cy={-10}
                        r={4}
                        fill="#ff006e"
                        className={styles.currentIndicator}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Minimap */}
            <div className={styles.minimap}>
              <svg 
                width="100%" 
                height="100%" 
                viewBox={`${layout.bounds.minX} ${layout.bounds.minY} ${layout.bounds.width} ${layout.bounds.height}`}
              >
                {/* Background */}
                <rect
                  x={layout.bounds.minX}
                  y={layout.bounds.minY}
                  width={layout.bounds.width}
                  height={layout.bounds.height}
                  fill="rgba(0, 0, 0, 0.7)"
                />
                
                {/* Connection lines */}
                {layout.edges.map(edge => (
                  <path
                    key={edge.id}
                    d={edge.pathData}
                    fill="none"
                    stroke={edge.isVisited ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)'}
                    strokeWidth={1}
                  />
                ))}
                
                {/* Nodes */}
                {Array.from(layout.nodes.values()).map(node => {
                  const isVisited = visitedNodes.has(node.id);
                  const isCurrent = state.currentNodeId === node.id;
                  return (
                    <rect
                      key={node.id}
                      x={node.x}
                      y={node.y}
                      width={node.width}
                      height={node.height}
                      rx={2}
                      fill={isCurrent ? '#ff006e' : isVisited ? 'rgba(0, 240, 255, 0.6)' : 'rgba(255, 255, 255, 0.2)'}
                      stroke={isCurrent ? '#ff006e' : 'none'}
                      strokeWidth={isCurrent ? 2 : 0}
                    />
                  );
                })}
                
                {/* Viewport indicator */}
                <rect
                  className={styles.minimapViewport}
                  x={-pan.x / zoom - (containerSize.width / zoom - containerSize.width) / 2}
                  y={-pan.y / zoom - (containerSize.height / zoom - containerSize.height) / 2}
                  width={containerSize.width / zoom}
                  height={containerSize.height / zoom}
                />
              </svg>
            </div>

            {/* Floating Tooltip */}
            {tooltip && nodes[tooltip.nodeId] && (
              <div 
                className={styles.floatingTooltip}
                style={{
                  left: tooltip.x + 15,
                  top: tooltip.y + 15,
                }}
              >
                <div className={styles.tooltipTitle}>
                  {nodes[tooltip.nodeId].location}
                </div>
                <div className={styles.tooltipContent}>
                  {nodes[tooltip.nodeId].ending && (
                    <span className={styles.tooltipEnding}>★ ENDING</span>
                  )}
                  {nodes[tooltip.nodeId].branch && (
                    <span 
                      className={styles.tooltipBranch}
                      style={{ color: getBranchColor(nodes[tooltip.nodeId].branch) }}
                    >
                      {nodes[tooltip.nodeId].branch?.toUpperCase()}
                    </span>
                  )}
                  <p>{nodes[tooltip.nodeId].content?.substring(0, 100)}...</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className={styles.sidebar}>
              <div className={styles.sidebarHeader}>
                <h3 className={styles.sidebarTitle}>Node Details</h3>
              </div>
              
              <div className={styles.sidebarContent}>
                {selectedNode ? (
                  <>
                    <div className={styles.nodeInfo}>
                      <div className={styles.nodeInfoLabel}>Location</div>
                      <div className={`${styles.nodeInfoValue} ${styles.location}`}>
                        {selectedNode.location}
                      </div>
                    </div>
                    
                    <div className={styles.nodeInfo}>
                      <div className={styles.nodeInfoLabel}>Node ID</div>
                      <div className={styles.nodeInfoValue}>{selectedNodeId}</div>
                    </div>
                    
                    {selectedNode.branch && (
                      <div className={styles.nodeInfo}>
                        <div className={styles.nodeInfoLabel}>Branch</div>
                        <div 
                          className={styles.nodeInfoValue}
                          style={{ color: getBranchColor(selectedNode.branch) }}
                        >
                          {selectedNode.branch.toUpperCase()}
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.nodeInfo}>
                      <div className={styles.nodeInfoLabel}>Status</div>
                      <div className={styles.nodeInfoValue}>
                        {state.currentNodeId === selectedNodeId ? 
                          '🔵 Current Position' : 
                          visitedNodes.has(selectedNodeId!) ? 
                            '✓ Visited' : 
                            '○ Unexplored'}
                      </div>
                    </div>
                    
                    {selectedNode.ending && (
                      <div className={styles.nodeInfo}>
                        <div className={styles.nodeInfoLabel}>Type</div>
                        <div className={styles.nodeInfoValue} style={{ color: '#ff006e' }}>
                          ★ ENDING NODE
                        </div>
                      </div>
                    )}
                    
                    <div className={styles.nodeInfo}>
                      <div className={styles.nodeInfoLabel}>Content Preview</div>
                      <div className={`${styles.nodeInfoValue} ${styles.content}`}>
                        {selectedNode.content?.substring(0, 200)}...
                      </div>
                    </div>
                    
                    {selectedNode.choices && selectedNode.choices.length > 0 && (
                      <div className={styles.nodeInfo}>
                        <div className={styles.nodeInfoLabel}>Choices ({selectedNode.choices.length})</div>
                        <div className={styles.choicesList}>
                          {selectedNode.choices.map((choice, idx) => (
                            <div 
                              key={choice.id || idx}
                              className={styles.choiceItem}
                              onClick={() => {
                                const nextNode = layout?.nodes.get(choice.next);
                                if (nextNode && containerSize.width > 0) {
                                  centerOnNode(
                                    nextNode.x,
                                    nextNode.y,
                                    nextNode.width,
                                    nextNode.height,
                                    containerSize.width,
                                    containerSize.height
                                  );
                                  setSelectedNodeId(choice.next);
                                }
                              }}
                            >
                              <div className={styles.choiceText}>{choice.text}</div>
                              {choice.flavor && (
                                <div className={styles.choiceFlavor}>{choice.flavor}</div>
                              )}
                              <div className={styles.choiceDestination}>
                                → {nodes[choice.next]?.location || choice.next}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <button
                      className={styles.jumpButton}
                      onClick={handleJumpToNode}
                      disabled={!visitedNodes.has(selectedNodeId!) && selectedNodeId !== state.currentNodeId}
                    >
                      {visitedNodes.has(selectedNodeId!) || selectedNodeId === state.currentNodeId
                        ? 'Jump to This Node'
                        : 'Node Not Yet Unlocked'}
                    </button>
                  </>
                ) : (
                  <div className={styles.emptyState}>
                    <div className={styles.emptyStateIcon}>🗺️</div>
                    <div className={styles.emptyStateText}>
                      Select a node to view details
                    </div>
                    <div className={styles.emptyStateHint}>
                      Double-click to jump to a node
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSymbol} ${styles.current}`}></div>
            <span className={styles.legendText}>Current</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSymbol} ${styles.visited}`}></div>
            <span className={styles.legendText}>Visited</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSymbol} ${styles.unvisited}`}></div>
            <span className={styles.legendText}>Unexplored</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSymbol} ${styles.ending}`}></div>
            <span className={styles.legendText}>Ending</span>
          </div>
          <div className={styles.legendItem}>
            <div className={`${styles.legendSymbol} ${styles.path}`}></div>
            <span className={styles.legendText}>Your Path</span>
          </div>
        </div>

        {/* Stats Panel */}
        {ledger && (
          <div className={styles.statsPanel}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Endings</span>
              <span className={styles.statValue}>{ledger.endingsUnlocked.length}/8</span>
              <div className={styles.statBar}>
                <div 
                  className={styles.statBarFill}
                  style={{ width: `${(ledger.endingsUnlocked.length / 8) * 100}%` }}
                />
              </div>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Branches</span>
              <span className={styles.statValue}>{ledger.branchesExplored.length}/5</span>
              <div className={styles.statBar}>
                <div 
                  className={styles.statBarFill}
                  style={{ width: `${(ledger.branchesExplored.length / 5) * 100}%` }}
                />
              </div>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statLabel}>NPCs Met</span>
              <span className={styles.statValue}>{ledger.npcsEncountered.length}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
