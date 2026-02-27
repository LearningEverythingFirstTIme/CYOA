export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  parentId?: string;
  children: string[];
  branch?: string;
}

export interface LayoutEdge {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isOnPath: boolean;
  isVisited: boolean;
  pathData: string;
}

export interface TreeLayout {
  nodes: Map<string, LayoutNode>;
  edges: LayoutEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

interface StoryNode {
  id: string;
  location: string;
  choices?: { next: string; text: string }[];
  ending?: boolean;
  branch?: string;
  content?: string;
}

interface LayoutOptions {
  branchFilter?: string;
  showEndingsOnly?: boolean;
  showVisitedOnly?: boolean;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const LEVEL_HEIGHT = 100;
const SIBLING_SPACING = 30;
const MIN_NODE_SPACING = 160;

/**
 * Builds a tree layout using an enhanced Reingold-Tilford algorithm
 * with support for filtering and improved edge routing
 */
export function calculateTreeLayout(
  nodes: Record<string, StoryNode>,
  startId: string = 'start',
  visitedNodes: string[] = [],
  currentPath: string[] = [],
  options: LayoutOptions = {}
): TreeLayout {
  const { branchFilter, showEndingsOnly, showVisitedOnly } = options;
  const visitedSet = new Set(visitedNodes);
  
  const layoutNodes = new Map<string, LayoutNode>();
  const layoutEdges: LayoutEdge[] = [];
  const visited = new Set<string>();
  
  // Helper to check if a node should be included
  function shouldIncludeNode(nodeId: string): boolean {
    const node = nodes[nodeId];
    if (!node) return false;
    
    // Branch filter
    if (branchFilter && node.branch !== branchFilter && nodeId !== 'start') {
      // Check if any children match the filter (with cycle detection)
      const hasMatchingDescendant = (id: string, seen: Set<string> = new Set()): boolean => {
        if (seen.has(id)) return false;
        seen.add(id);
        const n = nodes[id];
        if (!n) return false;
        if (n.branch === branchFilter) return true;
        if (n.choices) {
          return n.choices.some(c => hasMatchingDescendant(c.next, seen));
        }
        return false;
      };
      
      if (!hasMatchingDescendant(nodeId)) return false;
    }
    
    // Endings only filter
    if (showEndingsOnly && !node.ending) {
      // Check if any children are endings (with cycle detection)
      const hasEndingDescendant = (id: string, seen: Set<string> = new Set()): boolean => {
        if (seen.has(id)) return false;
        seen.add(id);
        const n = nodes[id];
        if (!n) return false;
        if (n.ending) return true;
        if (n.choices) {
          return n.choices.some(c => hasEndingDescendant(c.next, seen));
        }
        return false;
      };
      
      if (!hasEndingDescendant(nodeId)) return false;
    }
    
    // Visited only filter
    if (showVisitedOnly && !visitedSet.has(nodeId) && nodeId !== 'start') {
      return false;
    }
    
    return true;
  }
  
  // First pass: build the tree structure
  interface TreeNode {
    id: string;
    depth: number;
    parent?: TreeNode;
    children: TreeNode[];
    x: number;
    mod: number;
    branch?: string;
    width: number;
  }
  
  function buildTree(id: string, depth: number, parent?: TreeNode): TreeNode | null {
    if (visited.has(id)) {
      // Handle cycles - create a reference node
      if (nodes[id] && shouldIncludeNode(id)) {
        return {
          id,
          depth,
          parent,
          children: [],
          x: 0,
          mod: 0,
          branch: nodes[id].branch,
          width: NODE_WIDTH,
        };
      }
      return null;
    }
    
    if (!shouldIncludeNode(id)) {
      return null;
    }
    
    visited.add(id);
    const node = nodes[id];
    if (!node) return null;
    
    const treeNode: TreeNode = {
      id,
      depth,
      parent,
      children: [],
      x: 0,
      mod: 0,
      branch: node.branch,
      width: NODE_WIDTH,
    };
    
    if (node.choices) {
      for (const choice of node.choices) {
        const child = buildTree(choice.next, depth + 1, treeNode);
        if (child) {
          treeNode.children.push(child);
        }
      }
    }
    
    return treeNode;
  }
  
  const root = buildTree(startId, 0);
  if (!root) {
    return {
      nodes: layoutNodes,
      edges: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    };
  }
  
  // Second pass: assign initial X positions (post-order traversal)
  function assignInitialX(node: TreeNode): number {
    if (node.children.length === 0) {
      node.x = 0;
      return NODE_WIDTH + SIBLING_SPACING;
    }
    
    let totalWidth = 0;
    for (const child of node.children) {
      totalWidth += assignInitialX(child);
    }
    
    // Center parent over children
    const firstChild = node.children[0];
    const lastChild = node.children[node.children.length - 1];
    node.x = (firstChild.x + lastChild.x) / 2;
    
    return totalWidth;
  }
  
  assignInitialX(root);
  
  // Third pass: resolve overlaps with improved algorithm
  function resolveOverlaps(node: TreeNode, modSum: number): void {
    node.x += modSum;
    
    // Process children from left to right
    for (let i = 0; i < node.children.length - 1; i++) {
      const left = node.children[i];
      const right = node.children[i + 1];
      
      // Find the rightmost descendant of left subtree
      let rightmost = left;
      let rightmostMod = modSum + left.mod;
      while (rightmost.children.length > 0) {
        rightmost = rightmost.children[rightmost.children.length - 1];
        rightmostMod += rightmost.mod;
      }
      
      // Find the leftmost descendant of right subtree
      let leftmost = right;
      let leftmostMod = modSum + right.mod;
      while (leftmost.children.length > 0) {
        leftmost = leftmost.children[0];
        leftmostMod += leftmost.mod;
      }
      
      const minDistance = MIN_NODE_SPACING;
      const actualDistance = (leftmost.x + leftmostMod) - (rightmost.x + rightmostMod);
      
      if (actualDistance < minDistance) {
        const shift = minDistance - actualDistance;
        right.x += shift;
        right.mod += shift;
      }
    }
    
    // Recursively process children
    for (const child of node.children) {
      resolveOverlaps(child, modSum + child.mod);
    }
  }
  
  resolveOverlaps(root, 0);
  
  // Fourth pass: create layout nodes and edges with improved edge routing
  const pathSet = new Set(currentPath);
  
  function createLayout(node: TreeNode, modSum: number): void {
    const finalX = node.x + modSum;
    const finalY = node.depth * LEVEL_HEIGHT;
    
    const layoutNode: LayoutNode = {
      id: node.id,
      x: finalX,
      y: finalY,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      depth: node.depth,
      parentId: node.parent?.id,
      children: node.children.map(c => c.id),
      branch: node.branch,
    };
    
    layoutNodes.set(node.id, layoutNode);
    
    // Create edges with improved bezier curves
    for (const child of node.children) {
      const childX = child.x + modSum + child.mod;
      const childY = child.depth * LEVEL_HEIGHT;
      
      const sourceX = finalX + NODE_WIDTH / 2;
      const sourceY = finalY + NODE_HEIGHT;
      const targetX = childX + NODE_WIDTH / 2;
      const targetY = childY;
      
      // Calculate control points for smooth bezier curve
      const midY = (sourceY + targetY) / 2;
      
      // Create path data with cubic bezier
      const pathData = `M ${sourceX} ${sourceY} 
                        C ${sourceX} ${midY},
                          ${targetX} ${midY},
                          ${targetX} ${targetY}`;
      
      const edge: LayoutEdge = {
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        sourceX,
        sourceY,
        targetX,
        targetY,
        isOnPath: pathSet.has(node.id) && pathSet.has(child.id) && 
                  currentPath.indexOf(child.id) === currentPath.indexOf(node.id) + 1,
        isVisited: visitedSet.has(node.id) && visitedSet.has(child.id),
        pathData,
      };
      
      layoutEdges.push(edge);
      createLayout(child, modSum + child.mod);
    }
  }
  
  createLayout(root, 0);
  
  // Calculate bounds with padding
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const node of Array.from(layoutNodes.values())) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x + node.width);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);
  }
  
  // Handle empty layout case
  if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
    minX = 0;
    maxX = NODE_WIDTH + 160;
    minY = 0;
    maxY = NODE_HEIGHT + 160;
  }
  
  // Add padding
  const padding = 80;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;
  
  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
}

/**
 * Get branch color for visual differentiation
 */
export function getBranchColor(branch?: string): string {
  const colors: Record<string, string> = {
    archives: '#00f0ff',
    debt: '#ff9f1c',
    hush: '#ffb3d9',
    cathedral: '#9d4edd',
    noise: '#ffffff',
    neutral: '#888888',
  };
  return colors[branch || 'neutral'] || colors.neutral;
}

/**
 * Calculate minimap transform for viewport indicator
 */
export function calculateMinimapViewport(
  containerWidth: number,
  containerHeight: number,
  bounds: { width: number; height: number },
  pan: { x: number; y: number },
  zoom: number
): { x: number; y: number; width: number; height: number } {
  const scaleX = 180 / bounds.width;
  const scaleY = 120 / bounds.height;
  const scale = Math.min(scaleX, scaleY);
  
  return {
    x: (-pan.x * scale) / zoom,
    y: (-pan.y * scale) / zoom,
    width: (containerWidth * scale) / zoom,
    height: (containerHeight * scale) / zoom,
  };
}

/**
 * Search nodes by text content
 */
export function searchNodes(
  nodes: Record<string, StoryNode>,
  query: string
): string[] {
  const lowerQuery = query.toLowerCase();
  const results: string[] = [];
  
  for (const [id, node] of Object.entries(nodes)) {
    if (
      id.toLowerCase().includes(lowerQuery) ||
      node.location?.toLowerCase().includes(lowerQuery) ||
      node.content?.toLowerCase().includes(lowerQuery) ||
      node.branch?.toLowerCase().includes(lowerQuery)
    ) {
      results.push(id);
    }
  }
  
  return results.slice(0, 10); // Limit to 10 results
}

/**
 * Get all descendants of a node
 */
export function getDescendants(
  nodes: Record<string, StoryNode>,
  nodeId: string,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  
  const node = nodes[nodeId];
  if (!node || !node.choices) return [];
  
  const descendants: string[] = [];
  for (const choice of node.choices) {
    descendants.push(choice.next);
    descendants.push(...getDescendants(nodes, choice.next, visited));
  }
  
  return descendants;
}

/**
 * Get all ancestors of a node
 */
export function getAncestors(
  nodes: Record<string, StoryNode>,
  targetId: string,
  currentId: string = 'start',
  path: string[] = []
): string[] | null {
  if (currentId === targetId) {
    return [...path, currentId];
  }
  
  const node = nodes[currentId];
  if (!node || !node.choices) return null;
  
  for (const choice of node.choices) {
    const result = getAncestors(nodes, targetId, choice.next, [...path, currentId]);
    if (result) return result;
  }
  
  return null;
}

/**
 * Calculate path statistics
 */
export function calculatePathStats(
  nodes: Record<string, StoryNode>,
  path: string[]
): {
  totalNodes: number;
  endingsReached: number;
  branchesExplored: string[];
  depth: number;
} {
  const branches = new Set<string>();
  let endingsReached = 0;
  
  for (const nodeId of path) {
    const node = nodes[nodeId];
    if (node) {
      if (node.branch) branches.add(node.branch);
      if (node.ending) endingsReached++;
    }
  }
  
  return {
    totalNodes: path.length,
    endingsReached,
    branchesExplored: Array.from(branches),
    depth: Math.max(...path.map((_, i) => i)),
  };
}
