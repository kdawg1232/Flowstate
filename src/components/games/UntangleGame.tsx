
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Pressable, Dimensions, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize, RotateCcw, Play, Zap, ChevronDown, Eye, Check, Layout } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

/**
 * Untangle Engine: Optimized for 6-node planar graphs with random starting layouts
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

const segmentsIntersect = (
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
) => {
  const ccw = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };
  
  // Shared endpoints don't count as intersection
  if (
    (p1.x === p3.x && p1.y === p3.y) ||
    (p1.x === p4.x && p1.y === p4.y) ||
    (p2.x === p3.x && p2.y === p3.y) ||
    (p2.x === p4.x && p2.y === p4.y)
  ) {
    return false;
  }

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
};

const generateUntangle = (numNodes: number = 6): PuzzleData => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const solvedPositions: { x: number; y: number }[] = [];
  const gridSize = 4;
  const usedCoords = new Set<string>();

  // Generate solved positions on a grid
  while (solvedPositions.length < numNodes) {
    const rx = Math.floor(Math.random() * gridSize);
    const ry = Math.floor(Math.random() * gridSize);
    const key = `${rx},${ry}`;
    if (!usedCoords.has(key)) {
      usedCoords.add(key);
      solvedPositions.push({
        x: 25 + (rx / (gridSize - 1)) * 50,
        y: 25 + (ry / (gridSize - 1)) * 50,
      });
    }
  }

  // Add edges greedily (ensuring initial planarity in solved state)
  for (let i = 0; i < numNodes; i++) {
    for (let j = i + 1; j < numNodes; j++) {
      const p1 = solvedPositions[i];
      const p2 = solvedPositions[j];
      let crosses = false;
      for (const edge of edges) {
        if (segmentsIntersect(p1, p2, solvedPositions[edge.a], solvedPositions[edge.b])) {
          crosses = true;
          break;
        }
      }
      if (!crosses && edges.length < numNodes * 1.5) {
        edges.push({ a: i, b: j });
      }
    }
  }

  // Create nodes with random tangled positions
  for (let i = 0; i < numNodes; i++) {
    nodes.push({
      id: i,
      x: 15 + Math.random() * 70,
      y: 15 + Math.random() * 70,
      solvedX: solvedPositions[i].x,
      solvedY: solvedPositions[i].y,
    });
  }

  return { nodes, edges };
};

interface Props {
  onComplete: (score: number) => void;
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
        left: pixelX - 22,
        top: pixelY - 22,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: isDragging ? 100 : 20,
      }}
    >
      <View
        style={{
          width: isDragging ? 18 : 14,
          height: isDragging ? 18 : 14,
          borderRadius: isDragging ? 9 : 7,
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
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Store edges in a ref for the planarity check to avoid stale closure
  const edgesRef = useRef<Edge[]>([]);
  edgesRef.current = edges;

  const isDark = theme === 'dark';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  const checkPlanarity = useCallback((currentNodes: Node[]) => {
    const currentEdges = edgesRef.current;
    if (currentNodes.length === 0 || currentEdges.length === 0) return false;
    
    for (let i = 0; i < currentEdges.length; i++) {
      for (let j = i + 1; j < currentEdges.length; j++) {
        const e1 = currentEdges[i];
        const e2 = currentEdges[j];
        
        // Skip if edges share a node
        if (e1.a === e2.a || e1.a === e2.b || e1.b === e2.a || e1.b === e2.b) continue;
        
        const n1a = currentNodes[e1.a];
        const n1b = currentNodes[e1.b];
        const n2a = currentNodes[e2.a];
        const n2b = currentNodes[e2.b];
        
        if (!n1a || !n1b || !n2a || !n2b) continue;
        
        if (segmentsIntersect(n1a, n1b, n2a, n2b)) {
          return false;
        }
      }
    }
    return true;
  }, []);

  const initGame = useCallback(() => {
    const puzzle = generateUntangle(6);
    setNodes(puzzle.nodes);
    setEdges(puzzle.edges);
    edgesRef.current = puzzle.edges;
    setGameState(GameState.PLAYING);
    setIsAutoSolved(false);
    setShowSuccessOverlay(false);
  }, []);

  const handleDragStart = useCallback(() => {
    onLockScroll?.(false);
  }, [onLockScroll]);

  const handleDrag = useCallback((id: number, x: number, y: number) => {
    setNodes(prev => prev.map(n => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  const handleDragEnd = useCallback(() => {
    onLockScroll?.(true);
    
    // Check planarity after a short delay to ensure state is settled
    setTimeout(() => {
      setNodes(currentNodes => {
        if (checkPlanarity(currentNodes)) {
          // Schedule victory state changes
          setTimeout(() => {
            setGameState(GameState.FINISHED);
            onComplete(50);
            setTimeout(() => setShowSuccessOverlay(true), 1000);
          }, 0);
        }
        return currentNodes;
      });
    }, 50);
  }, [checkPlanarity, onComplete, onLockScroll]);

  const handleAutoSolve = useCallback(() => {
    setNodes(prev => prev.map(n => ({ ...n, x: n.solvedX, y: n.solvedY })));
    setIsAutoSolved(true);
    setGameState(GameState.FINISHED);
    setShowSuccessOverlay(false);
  }, []);

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
    }
  }, [isActive]);

  return (
    <View className={`flex-1 w-full ${isDark ? 'bg-[#05070a]' : 'bg-slate-50'} px-6 pb-24 relative overflow-hidden`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView
            key="idle"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center"
          >
            <View
              className={`w-20 h-20 ${
                isDark ? 'bg-amber-500/20 border-amber-500/40' : 'bg-white border-amber-100'
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
            {/* Game Board Section */}
            <View className="flex-1 w-full items-center justify-center mb-10">
              <View className="relative w-full items-center">
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
                  {/* SVG Edges */}
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

                  {/* Draggable Nodes */}
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

                {/* Victory Overlay */}
                <AnimatePresence>
                  {showSuccessOverlay && (
                    <MotiView
                      from={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'timing', duration: 300 }}
                      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 7, 10, 0.9)', borderRadius: 48 }]}
                      className="items-center justify-center z-50 p-8"
                    >
                      <View className="w-20 h-20 rounded-full bg-emerald-500 items-center justify-center mb-8 border-4 border-emerald-400">
                        <Check color="white" size={44} strokeWidth={3} />
                      </View>
                      <Text weight="black" className="text-4xl text-white italic uppercase tracking-tighter text-center mb-2">
                        REP LOGGED
                      </Text>
                      <Text variant="mono" className="text-cyan-400 text-3xl tracking-widest mb-12 text-center">
                        +50 LOGIC XP
                      </Text>

                      <Pressable
                        onPress={() => setShowSuccessOverlay(false)}
                        className="w-full py-4 bg-white/5 border border-white/20 rounded-[2rem] flex-row items-center justify-center gap-3"
                      >
                        <Eye color="white" size={18} />
                        <Text weight="black" className="text-white text-[11px] uppercase tracking-widest">
                          Inspect Grid
                        </Text>
                      </Pressable>

                      <View className="items-center gap-6 opacity-60 mt-12">
                        <Text weight="bold" className="text-white text-[10px] uppercase tracking-[0.5em]">
                          Swipe for next rep
                        </Text>
                        <MotiView
                          from={{ translateY: 0 }}
                          animate={{ translateY: 10 }}
                          transition={{ loop: true, type: 'timing', duration: 1000 }}
                        >
                          <ChevronDown color="white" size={28} />
                        </MotiView>
                      </View>
                    </MotiView>
                  )}
                </AnimatePresence>

                {/* Layout Button */}
                {gameState === GameState.FINISHED && !isAutoSolved && !showSuccessOverlay && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="absolute top-6 right-6 z-40"
                  >
                    <Pressable
                      onPress={() => setShowSuccessOverlay(true)}
                      className="p-4 bg-emerald-500 rounded-3xl shadow-2xl active:scale-90"
                    >
                      <Layout color="black" size={24} />
                    </Pressable>
                  </MotiView>
                )}
              </View>
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
                    ) : (
                      <View className="items-center gap-4">
                        <Text weight="black" className="text-emerald-500 text-[12px] uppercase tracking-[0.4em] mb-6">
                          PLANAR RESOLUTION ACHIEVED
                        </Text>
                        <Pressable
                          onPress={initGame}
                          className={`px-10 py-4 rounded-2xl border flex-row items-center justify-center gap-3 ${
                            isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <RotateCcw color={isDark ? '#94a3b8' : '#64748b'} size={16} />
                          <Text
                            weight="black"
                            className={`text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                          >
                            New Puzzle
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
