
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Pressable, Dimensions, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize, RotateCcw, Play, Zap, ChevronDown, Eye } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

/**
 * Untangle Engine: Ported from Simon Tatham's Puzzles (untangle.c)
 * 
 * Key constants from C implementation:
 * - POINTDENSITY = 3 (grid size = sqrt(n * 3))
 * - MAXDEGREE = 4 (max edges per vertex)
 */

interface Node {
  id: number;
  x: number;
  y: number;
  solvedX: number;
  solvedY: number;
}

interface Edge {
  a: number;
  b: number;
}

interface PuzzleData {
  nodes: Node[];
  edges: Edge[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

// From C: POINTDENSITY = 3, MAXDEGREE = 4
const POINTDENSITY = 3;
const MAXDEGREE = 4;

// Calculate grid size limit based on number of points (from C: squarert(n * POINTDENSITY))
const coordLimit = (n: number): number => Math.ceil(Math.sqrt(n * POINTDENSITY));

/**
 * Precise line segment intersection test (ported from C cross() function)
 * Uses the same algorithm as the C implementation for accuracy
 */
const segmentsIntersect = (
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): boolean => {
  // Calculate cross products to determine which side of line a1-a2 points b1 and b2 are on
  // (b1 - a1) cross (a2 - a1)
  const d1 = (b1.x - a1.x) * (a2.y - a1.y) - (b1.y - a1.y) * (a2.x - a1.x);
  // (b2 - a1) cross (a2 - a1)
  const d2 = (b2.x - a1.x) * (a2.y - a1.y) - (b2.y - a1.y) * (a2.x - a1.x);
  
  // If both have same sign (both on same side), no intersection
  if ((d1 > 0 && d2 > 0) || (d1 < 0 && d2 < 0)) return false;
  
  // Handle collinear case
  if (d1 === 0 && d2 === 0) {
    // Points are collinear - check if segments overlap
    const minAx = Math.min(a1.x, a2.x), maxAx = Math.max(a1.x, a2.x);
    const minAy = Math.min(a1.y, a2.y), maxAy = Math.max(a1.y, a2.y);
    const minBx = Math.min(b1.x, b2.x), maxBx = Math.max(b1.x, b2.x);
    const minBy = Math.min(b1.y, b2.y), maxBy = Math.max(b1.y, b2.y);
    
    // Check if ranges overlap
    if (maxAx < minBx || maxBx < minAx || maxAy < minBy || maxBy < minAy) {
      return false;
    }
    // Ranges overlap - but we need to check if they share more than just an endpoint
    // For untangle, we consider endpoint-only touching as NOT crossing
    return true;
  }
  
  // Now check the other direction: which side of line b1-b2 are a1 and a2 on
  const d3 = (a1.x - b1.x) * (b2.y - b1.y) - (a1.y - b1.y) * (b2.x - b1.x);
  const d4 = (a2.x - b1.x) * (b2.y - b1.y) - (a2.y - b1.y) * (b2.x - b1.x);
  
  if ((d3 > 0 && d4 > 0) || (d3 < 0 && d4 < 0)) return false;
  
  return true;
};

/**
 * Check if a point lies on a line segment (used to prevent edges passing through nodes)
 */
const pointOnSegment = (
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
  tolerance: number = 0.5
): boolean => {
  // Check if p is collinear with a-b and within the segment bounds
  const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > tolerance * Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y), 1)) {
    return false;
  }
  
  // Check if p is within the bounding box of a-b
  const minX = Math.min(a.x, b.x) - tolerance;
  const maxX = Math.max(a.x, b.x) + tolerance;
  const minY = Math.min(a.y, b.y) - tolerance;
  const maxY = Math.max(a.y, b.y) + tolerance;
  
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
};

/**
 * Check if an edge exists in the edge list
 */
const isEdge = (edges: Edge[], a: number, b: number): boolean => {
  const minIdx = Math.min(a, b);
  const maxIdx = Math.max(a, b);
  return edges.some(e => e.a === minIdx && e.b === maxIdx);
};

/**
 * Generate an untangle puzzle using the algorithm from untangle.c
 */
const generateUntangle = (numNodes: number = 10): PuzzleData => {
  const n = numNodes;
  const w = coordLimit(n);
  
  // Step 1: Choose n points from a w×w grid (from C: new_game_desc)
  const gridPoints: { x: number; y: number }[] = [];
  const allCoords: number[] = [];
  for (let i = 0; i < w * w; i++) allCoords.push(i);
  
  // Shuffle coordinates
  for (let i = allCoords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allCoords[i], allCoords[j]] = [allCoords[j], allCoords[i]];
  }
  
  // Pick first n coordinates
  for (let i = 0; i < n; i++) {
    const coord = allCoords[i];
    gridPoints.push({
      x: coord % w,
      y: Math.floor(coord / w),
    });
  }
  
  // Step 2: Build edges using the C algorithm
  // Track degree of each vertex
  const degree: number[] = Array(n).fill(0);
  const edges: Edge[] = [];
  
  // Create vertex list sorted by degree (initially all 0)
  // We'll process vertices in order of increasing degree
  const processOrder = Array.from({ length: n }, (_, i) => i);
  
  let addedAnyEdge = true;
  while (addedAnyEdge) {
    addedAnyEdge = false;
    
    // Sort vertices by degree (lowest first)
    processOrder.sort((a, b) => degree[a] - degree[b]);
    
    for (let i = 0; i < n; i++) {
      const j = processOrder[i];
      
      if (degree[j] >= MAXDEGREE) break; // No vertex can accept more edges
      
      // Find candidate vertices to connect to, sorted by distance
      const candidates: { idx: number; dist: number }[] = [];
      
      for (let k = i + 1; k < n; k++) {
        const ki = processOrder[k];
        
        // Skip if already at max degree or already connected
        if (degree[ki] >= MAXDEGREE || isEdge(edges, j, ki)) continue;
        
        const dx = gridPoints[ki].x - gridPoints[j].x;
        const dy = gridPoints[ki].y - gridPoints[j].y;
        candidates.push({ idx: ki, dist: dx * dx + dy * dy });
      }
      
      // Sort by distance (closest first)
      candidates.sort((a, b) => a.dist - b.dist);
      
      // Try to add an edge to closest valid candidate
      for (const cand of candidates) {
        const ki = cand.idx;
        const p1 = gridPoints[j];
        const p2 = gridPoints[ki];
        
        // Check 1: Does this edge pass through any other point?
        let passesThrough = false;
        for (let p = 0; p < n; p++) {
          if (p === j || p === ki) continue;
          if (pointOnSegment(gridPoints[p], p1, p2, 0.01)) {
            passesThrough = true;
            break;
          }
        }
        if (passesThrough) continue;
        
        // Check 2: Does this edge cross any existing edge?
        let crossesEdge = false;
        for (const e of edges) {
          if (e.a === j || e.a === ki || e.b === j || e.b === ki) continue;
          if (segmentsIntersect(p1, p2, gridPoints[e.a], gridPoints[e.b])) {
            crossesEdge = true;
            break;
          }
        }
        if (crossesEdge) continue;
        
        // Valid edge! Add it
        edges.push({ a: Math.min(j, ki), b: Math.max(j, ki) });
        degree[j]++;
        degree[ki]++;
        addedAnyEdge = true;
        break;
      }
      
      if (addedAnyEdge) break; // Restart the outer loop to re-sort by degree
    }
  }
  
  // Step 3: Create circle positions for the scrambled starting state
  // (from C: make_circle)
  const circlePositions: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const angle = (i * 2 * Math.PI) / n;
    circlePositions.push({
      x: 50 + 35 * Math.sin(angle),
      y: 50 - 35 * Math.cos(angle),
    });
  }
  
  // Step 4: Shuffle the mapping so that at least one crossing exists
  // (from C: the shuffle loop that ensures at least one crossing)
  let mapping = Array.from({ length: n }, (_, i) => i);
  let hasCrossing = false;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (!hasCrossing && attempts < maxAttempts) {
    attempts++;
    
    // Shuffle mapping
    for (let i = mapping.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mapping[i], mapping[j]] = [mapping[j], mapping[i]];
    }
    
    // Check if any edges cross in this arrangement
    for (let i = 0; i < edges.length && !hasCrossing; i++) {
      for (let j = i + 1; j < edges.length && !hasCrossing; j++) {
        const e1 = edges[i];
        const e2 = edges[j];
        
        // Skip edges that share a vertex
        if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
        
        const p1 = circlePositions[mapping[e1.a]];
        const p2 = circlePositions[mapping[e1.b]];
        const p3 = circlePositions[mapping[e2.a]];
        const p4 = circlePositions[mapping[e2.b]];
        
        if (segmentsIntersect(p1, p2, p3, p4)) {
          hasCrossing = true;
        }
      }
    }
  }
  
  // Step 5: Create nodes with scrambled (circle) positions and solved (grid) positions
  // Convert grid coordinates to percentage (0-100 range for display)
  const nodes: Node[] = [];
  for (let i = 0; i < n; i++) {
    const solvedPos = gridPoints[i];
    const scrambledPos = circlePositions[mapping[i]];
    
    nodes.push({
      id: i,
      x: scrambledPos.x,
      y: scrambledPos.y,
      // Convert grid coords to percentage (with padding)
      solvedX: 15 + (solvedPos.x / Math.max(w - 1, 1)) * 70,
      solvedY: 15 + (solvedPos.y / Math.max(w - 1, 1)) * 70,
    });
  }
  
  return { nodes, edges };
};

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (enabled: boolean) => void;
}

// Draggable Node Component using PanResponder
interface DraggableNodeProps {
  node: Node;
  isFinished: boolean;
  isDark: boolean;
  onDragStart: () => void;
  onDrag: (id: number, x: number, y: number) => void;
  onDragEnd: () => void;
}

const DraggableNode: React.FC<DraggableNodeProps> = React.memo(({
  node,
  isFinished,
  isDark,
  onDragStart,
  onDrag,
  onDragEnd,
}) => {
  const startPosRef = useRef({ x: 0, y: 0 });
  const nodeIdRef = useRef(node.id);
  const currentPosRef = useRef({ x: node.x, y: node.y });
  const [isDragging, setIsDragging] = useState(false);

  // Update refs without recreating PanResponder
  nodeIdRef.current = node.id;
  currentPosRef.current = { x: node.x, y: node.y };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isFinished,
    onMoveShouldSetPanResponder: () => !isFinished,
    onPanResponderGrant: () => {
      startPosRef.current = { x: currentPosRef.current.x, y: currentPosRef.current.y };
      setIsDragging(true);
      onDragStart();
    },
    onPanResponderMove: (_evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      // Convert pixel delta to percentage delta
      const deltaXPercent = (gestureState.dx / GRID_SIZE) * 100;
      const deltaYPercent = (gestureState.dy / GRID_SIZE) * 100;

      // Calculate new position
      const newX = Math.max(8, Math.min(92, startPosRef.current.x + deltaXPercent));
      const newY = Math.max(8, Math.min(92, startPosRef.current.y + deltaYPercent));

      onDrag(nodeIdRef.current, newX, newY);
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
      onDragEnd();
    },
    onPanResponderTerminate: () => {
      setIsDragging(false);
      onDragEnd();
    },
  }), [isFinished, onDragStart, onDrag, onDragEnd]);

  const nodeColor = isFinished ? '#10b981' : (isDark ? '#f59e0b' : '#d97706');
  const pixelX = (node.x / 100) * GRID_SIZE;
  const pixelY = (node.y / 100) * GRID_SIZE;

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: pixelX - 18,
        top: pixelY - 18,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: isDragging ? 100 : 20,
      }}
    >
      <View
        style={{
          width: isDragging ? 14 : 10,
          height: isDragging ? 14 : 10,
          borderRadius: isDragging ? 7 : 5,
          borderWidth: 1.5,
          borderColor: nodeColor,
          backgroundColor: isFinished ? '#10b981' : (isDark ? '#0f172a' : '#ffffff'),
          shadowColor: nodeColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDragging ? 0.8 : 0.5,
          shadowRadius: isDragging ? 12 : 8,
          elevation: isDragging ? 10 : 5,
        }}
      />
    </View>
  );
});

const UntangleGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isAutoSolved, setIsAutoSolved] = useState(false);
  const [showSolvedSummary, setShowSolvedSummary] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Store edges in a ref for the planarity check to avoid stale closure
  const edgesRef = useRef<Edge[]>([]);
  edgesRef.current = edges;

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  /**
   * Check if the current node positions form a planar (non-crossing) graph
   * Ported from C: mark_crossings()
   */
  const checkPlanarity = useCallback((currentNodes: Node[]) => {
    const currentEdges = edgesRef.current;
    if (currentNodes.length === 0 || currentEdges.length === 0) return false;
    
    // Check every pair of edges for crossings
    for (let i = 0; i < currentEdges.length; i++) {
      for (let j = i + 1; j < currentEdges.length; j++) {
        const e1 = currentEdges[i];
        const e2 = currentEdges[j];
        
        // Skip if edges share a vertex (they can't cross at a shared endpoint)
        if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
        
        const n1a = currentNodes[e1.a];
        const n1b = currentNodes[e1.b];
        const n2a = currentNodes[e2.a];
        const n2b = currentNodes[e2.b];
        
        if (!n1a || !n1b || !n2a || !n2b) continue;
        
        if (segmentsIntersect(n1a, n1b, n2a, n2b)) {
          return false; // Found a crossing - not planar
        }
      }
    }
    return true; // No crossings found - planar!
  }, []);

  const initGame = useCallback(() => {
    // Use 8 nodes for medium difficulty (C presets: 6, 10, 15, 20, 25)
    const puzzle = generateUntangle(10);
    setNodes(puzzle.nodes);
    setEdges(puzzle.edges);
    edgesRef.current = puzzle.edges;
    setGameState(GameState.PLAYING);
    setIsAutoSolved(false);
    setShowSolvedSummary(false);
  }, []);

  const handleDragStart = useCallback(() => {
    onLockScroll?.(false);
  }, [onLockScroll]);

  const handleDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  const handleDragEnd = useCallback(() => {
    onLockScroll?.(true);
    
    setTimeout(() => {
      setNodes(currentNodes => {
        if (checkPlanarity(currentNodes)) {
          setTimeout(() => {
            setShowSolvedSummary(false);
            setGameState(GameState.FINISHED);
          }, 0);
        }
        return currentNodes;
      });
    }, 50);
  }, [checkPlanarity, onLockScroll]);

  const handleAutoSolve = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, x: n.solvedX, y: n.solvedY })));
    setIsAutoSolved(true);
    setShowSolvedSummary(false);
    setGameState(GameState.FINISHED);
    onComplete(0, false);
  }, [onComplete]);

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
      setShowSolvedSummary(false);
    }
  }, [isActive]);

  const handleContinueFromSolved = useCallback(() => {
    setShowSolvedSummary(true);
    onLockScroll?.(true);
    setTimeout(() => onComplete(50, true), 120);
  }, [onComplete, onLockScroll]);

  return (
    <View className={`flex-1 w-full ${isDark ? 'bg-black' : 'bg-slate-50'} relative overflow-hidden`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView
            key="idle"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center px-6"
          >
            <View
              className={`w-20 h-20 ${
                isDark ? 'bg-black border-white/10' : 'bg-white border-amber-100'
              } rounded-3xl items-center justify-center mb-6 border`}
            >
              <Maximize color="#f59e0b" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase text-center ${textColor}`}>
              Planar Shift
            </Text>
            <Text className={`${subTextColor} text-xs uppercase tracking-[0.2em] mb-10 max-w-[240px] text-center leading-relaxed`}>
              Resolve the neural tangle. Reposition nodes until no paths cross.
            </Text>
            <Pressable
              onPress={initGame}
              className="bg-amber-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
            >
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">
                INITIATE LINK
              </Text>
            </Pressable>
          </MotiView>
        ) : (
          <MotiView
            key="playing"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center"
            style={{ paddingTop: insets.top + 80 }}
          >
            {/* Game Board / Solved Summary */}
            <View className="flex-1 w-full items-center justify-center mb-10">
              <AnimatePresence exitBeforeEnter>
                {gameState === GameState.FINISHED && !isAutoSolved && showSolvedSummary ? (
                  <MotiView
                    key="untangle-summary"
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: -10 }}
                    transition={{ type: 'timing', duration: 220 }}
                    style={{ width: GRID_SIZE, minHeight: GRID_SIZE * 0.6 }}
                    className="items-center justify-center"
                  >
                    <Text weight="black" className={`text-3xl italic uppercase tracking-tighter text-center mb-2 ${textColor}`}>
                      Total reps logged
                    </Text>
                    <Text variant="mono" className="text-emerald-400 text-2xl tracking-widest uppercase">
                      50 reps logged
                    </Text>
                    <View className="items-center gap-4 opacity-80 mt-8">
                      <Text weight="bold" className={`${subTextColor} text-[10px] uppercase tracking-[0.4em]`}>
                        Continue to next game
                      </Text>
                      <MotiView
                        from={{ translateY: 0 }}
                        animate={{ translateY: 10 }}
                        transition={{ loop: true, type: 'timing', duration: 1000 }}
                      >
                        <ChevronDown color={isDark ? "#64748b" : "#94a3b8"} size={24} />
                      </MotiView>
                    </View>
                  </MotiView>
                ) : (
                  <MotiView
                    key="untangle-board"
                    from={{ opacity: 0.98 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'timing', duration: 180 }}
                    className="relative w-full items-center"
                  >
                    <View
                      style={{ width: GRID_SIZE, height: GRID_SIZE }}
                      className={`rounded-[3rem] overflow-hidden border ${
                        gameState === GameState.FINISHED
                          ? 'bg-emerald-500/5 border-emerald-500/50'
                          : isDark
                          ? 'bg-slate-900/40 border-white/5'
                          : 'bg-white border-slate-200 shadow-inner'
                      }`}
                    >
                      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
                        {edges.map((e, idx) => {
                          const n1 = nodes[e.a];
                          const n2 = nodes[e.b];
                          if (!n1 || !n2) return null;
                          const isFinished = gameState === GameState.FINISHED;
                          const color = isFinished ? '#10b981' : isDark ? '#06b6d4' : '#0891b2';

                          return (
                            <Line
                              key={idx}
                              x1={n1.x}
                              y1={n1.y}
                              x2={n2.x}
                              y2={n2.y}
                              stroke={color}
                              strokeWidth="1.2"
                              strokeOpacity={isFinished ? 0.8 : 0.4}
                              strokeLinecap="round"
                            />
                          );
                        })}
                      </Svg>

                      {nodes.map((node) => (
                        <DraggableNode
                          key={node.id}
                          node={node}
                          isFinished={gameState === GameState.FINISHED}
                          isDark={isDark}
                          onDragStart={handleDragStart}
                          onDrag={handleDrag}
                          onDragEnd={handleDragEnd}
                        />
                      ))}
                    </View>
                  </MotiView>
                )}
              </AnimatePresence>
            </View>

            {/* Bottom Controls */}
            <View className="w-full items-center mb-8">
              <AnimatePresence exitBeforeEnter>
                {gameState === GameState.PLAYING ? (
                  <MotiView
                    key="controls"
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: 10 }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="w-full items-center px-4"
                  >
                    <Text
                      weight="black"
                      className={`${subTextColor} text-[10px] uppercase tracking-[0.5em] mb-10 text-center opacity-70`}
                    >
                      Untangle the neural pathways
                    </Text>
                    <View className="flex-row gap-4 w-full max-w-[320px]">
                      <Pressable
                        onPress={initGame}
                        className={`flex-1 py-5 rounded-[1.5rem] border flex-row items-center justify-center gap-3 ${
                          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-sm'
                        }`}
                      >
                        <RotateCcw color={isDark ? '#64748b' : '#94a3b8'} size={16} />
                        <Text
                          weight="black"
                          className={`text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        >
                          Reset
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={handleAutoSolve}
                        className={`flex-1 py-5 rounded-[1.5rem] border flex-row items-center justify-center gap-3 ${
                          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-sm'
                        }`}
                      >
                        <Zap color={isDark ? '#64748b' : '#94a3b8'} size={16} />
                        <Text
                          weight="black"
                          className={`text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
                        >
                          Solution
                        </Text>
                      </Pressable>
                    </View>
                  </MotiView>
                ) : (
                  <MotiView
                    key="finished-state"
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 300 }}
                    className="items-center"
                  >
                    {isAutoSolved ? (
                      <View className="items-center">
                        <View className="w-14 h-14 rounded-full bg-amber-500/20 items-center justify-center mb-6 border border-amber-500/40">
                          <Eye color="#f59e0b" size={28} />
                        </View>
                        <Text weight="black" className={`text-2xl italic mb-2 uppercase tracking-tighter ${textColor}`}>
                          BYPASS LOGGED
                        </Text>
                        <Text weight="bold" className="text-slate-500 text-[11px] uppercase tracking-widest mb-10">
                          Neural Rep skipped
                        </Text>
                        <MotiView
                          from={{ translateY: 0 }}
                          animate={{ translateY: 10 }}
                          transition={{ loop: true, type: 'timing', duration: 1000 }}
                        >
                          <ChevronDown color="#475569" size={32} />
                        </MotiView>
                      </View>
                    ) : showSolvedSummary ? null : (
                      <View className="items-center gap-4">
                        <Text weight="black" className="text-emerald-500 text-[12px] uppercase tracking-[0.4em] mb-6">
                          Untangle Solved
                        </Text>
                        <Pressable
                          onPress={handleContinueFromSolved}
                          className="bg-emerald-500 px-12 py-4 rounded-2xl flex-row items-center justify-center gap-3 shadow-xl active:scale-95"
                        >
                          <Text weight="black" className="text-white text-[11px] uppercase tracking-widest">
                            Continue
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </MotiView>
                )}
              </AnimatePresence>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

export default React.memo(UntangleGame);
