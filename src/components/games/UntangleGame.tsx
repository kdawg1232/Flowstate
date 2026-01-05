import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions, PanResponder, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Shuffle, Timer, Zap, Check, Play, ChevronDown, ArrowRight } from 'lucide-react-native';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (score: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (enabled: boolean) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Edge {
  from: number;
  to: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_SIZE = Math.min(SCREEN_WIDTH - 60, 320);
const NODE_RADIUS = 15;

// Helper to check if two line segments (p1, p2) and (p3, p4) intersect
const doIntersect = (p1: Point, p2: Point, p3: Point, p4: Point) => {
  const ccw = (a: Point, b: Point, c: Point) => {
    const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (Math.abs(val) < 0.0001) return 0;
    return val > 0 ? 1 : 2;
  };

  const o1 = ccw(p1, p2, p3);
  const o2 = ccw(p1, p2, p4);
  const o3 = ccw(p3, p4, p1);
  const o4 = ccw(p3, p4, p2);

  if (o1 !== o2 && o3 !== o4) return true;
  return false;
};

export default function UntangleGame({ onComplete, isActive, theme = 'dark', onLockScroll }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [nodes, setNodes] = useState<Point[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [crossings, setCrossings] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const generatePlanarGraph = useCallback(() => {
    const numNodes = 7 + Math.floor(score / 2);
    const newEdges: Edge[] = [];
    const solvedNodes: Point[] = [];
    
    // 1. Generate nodes in random positions that are guaranteed to have a planar layout
    // We'll generate random points and greedily add non-intersecting edges
    for (let i = 0; i < numNodes; i++) {
      solvedNodes.push({
        x: Math.random() * (GAME_SIZE - 60) + 30,
        y: Math.random() * (GAME_SIZE - 60) + 30,
      });
    }

    // Sort edges by length to prefer shorter edges (makes the graph look cleaner)
    const possibleEdges: Edge[] = [];
    for (let i = 0; i < numNodes; i++) {
      for (let j = i + 1; j < numNodes; j++) {
        possibleEdges.push({ from: i, to: j });
      }
    }

    possibleEdges.sort((a, b) => {
      const distA = Math.pow(solvedNodes[a.from].x - solvedNodes[a.to].x, 2) + Math.pow(solvedNodes[a.from].y - solvedNodes[a.to].y, 2);
      const distB = Math.pow(solvedNodes[b.from].x - solvedNodes[b.to].x, 2) + Math.pow(solvedNodes[b.from].y - solvedNodes[b.to].y, 2);
      return distA - distB;
    });

    for (const edge of possibleEdges) {
      const p1 = solvedNodes[edge.from];
      const p2 = solvedNodes[edge.to];
      
      let crosses = false;
      for (const existing of newEdges) {
        const p3 = solvedNodes[existing.from];
        const p4 = solvedNodes[existing.to];
        
        // Don't count edges sharing a vertex
        if (edge.from === existing.from || edge.from === existing.to || edge.to === existing.from || edge.to === existing.to) continue;
        
        if (doIntersect(p1, p2, p3, p4)) {
          crosses = true;
          break;
        }
      }

      // Max edges for a planar graph is 3n-6. We'll stop a bit earlier for clarity.
      if (!crosses && newEdges.length < numNodes * 1.5) {
        newEdges.push(edge);
      }
    }

    // 2. Scramble the node positions for the player
    const scrambledNodes = solvedNodes.map(() => ({
      x: Math.random() * (GAME_SIZE - 40) + 20,
      y: Math.random() * (GAME_SIZE - 40) + 20,
    }));

    setNodes(scrambledNodes);
    setEdges(newEdges);
    setCrossings(-1);
    setGameState(GameState.PLAYING);
  }, [score]);

  const countCrossings = useCallback((currentNodes: Point[]) => {
    if (currentNodes.length === 0) return 0;
    let count = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const e1 = edges[i];
        const e2 = edges[j];
        
        // Don't count edges sharing a vertex
        if (e1.from === e2.from || e1.from === e2.to || e1.to === e2.from || e1.to === e2.to) continue;
        
        const p1 = currentNodes[e1.from];
        const p2 = currentNodes[e1.to];
        const p3 = currentNodes[e2.from];
        const p4 = currentNodes[e2.to];
        
        if (!p1 || !p2 || !p3 || !p4) continue;
        
        if (doIntersect(p1, p2, p3, p4)) {
          count++;
        }
      }
    }
    return count;
  }, [edges]);

  // Use a separate effect for level completion to avoid loops
  useEffect(() => {
    if (gameState === GameState.PLAYING && nodes.length > 0) {
      const c = countCrossings(nodes);
      setCrossings(c);
      
      if (c === 0) {
        setGameState(GameState.SUCCESS); // Transition to success state first
        setScore(30); // Award the reps immediately in the UI
        if (timerRef.current) clearInterval(timerRef.current);
        
        const timer = setTimeout(() => {
          setGameState(GameState.FINISHED);
          setTimeout(() => onComplete(30), 100);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [nodes, edges, countCrossings, gameState]); // Removed generatePlanarGraph from dependencies

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    generatePlanarGraph();
  };

  useEffect(() => {
    if (!isActive) setGameState(GameState.IDLE);
  }, [isActive]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft <= 0 && gameState === GameState.PLAYING) {
      setGameState(GameState.FINISHED);
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(() => onComplete(score), 100);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft, score, onComplete]);

  const handleNodeMove = useCallback((index: number, x: number, y: number) => {
    setNodes(prevNodes => {
      const newNodes = [...prevNodes];
      newNodes[index] = { 
        x: Math.max(0, Math.min(GAME_SIZE, x)), 
        y: Math.max(0, Math.min(GAME_SIZE, y)) 
      };
      return newNodes;
    });
  }, []);

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <View className={`flex-1 px-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center">
            <View className={`w-20 h-20 ${isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white border-indigo-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Shuffle color="#6366f1" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Untangle</Text>
            <Text className={`${subTextColorClass} text-[10px] uppercase tracking-[0.2em] mb-10 text-center max-w-[280px]`}>
              Move the nodes so that no lines cross each other.
            </Text>
            <Pressable onPress={startGame} className="bg-indigo-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">INITIALIZE</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED ? (
          <MotiView key="finished" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-6 border ${score > 0 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'}`}>
              {score > 0 ? <Check color="#10b981" size={32} /> : <Zap color="#f43f5e" size={32} />}
            </View>
            <Text weight="black" className={`text-3xl italic mb-6 uppercase tracking-tighter text-center ${textColorClass}`}>
              {score > 0 ? 'NETWORK UNTANGLED' : 'SIGNAL LOST'}
            </Text>
            
            <View className={`w-full max-w-[240px] ${isDark ? 'bg-indigo-950/40 border-indigo-500/20' : 'bg-white border-indigo-100'} border-2 py-8 rounded-[2.5rem] items-center mb-10 shadow-xl`}>
              <Text variant="mono" className={`${score > 0 ? 'text-indigo-400' : 'text-slate-500'} text-5xl mb-2 tracking-widest`}>{score}</Text>
              <Text weight="black" className={`${isDark ? 'text-indigo-500/60' : 'text-indigo-400'} text-[10px] uppercase tracking-[0.4em]`}>MENTAL REPS</Text>
            </View>

            <View className="items-center gap-8">
               <View className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} px-8 py-4 rounded-2xl flex-row items-center gap-3 border shadow-sm`}>
                  <Text weight="black" className="text-emerald-500 uppercase tracking-widest">NEXT GAME READY</Text>
                  <ArrowRight color="#10b981" size={18} />
               </View>
               
               <View className="items-center gap-3 opacity-40">
                 <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
                 <MotiView
                   from={{ translateY: -5 }}
                   animate={{ translateY: 5 }}
                   transition={{ loop: true, type: 'timing', duration: 1000 }}
                 >
                   <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={20} />
                 </MotiView>
               </View>
            </View>
          </MotiView>
        ) : (
          <MotiView key="play" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center">
             <View style={{ marginTop: insets.top + 80 }} className="w-full flex-row justify-between mb-8">
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                  <Timer size={14} color="#6366f1" />
                  <Text variant="mono" className="text-indigo-500 text-sm">{timeLeft}s</Text>
                </View>
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                  <Zap size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
                </View>
              </View>

              <View 
                style={{ width: GAME_SIZE, height: GAME_SIZE }} 
                className={`rounded-[2.5rem] ${cardBgClass} border-2 overflow-hidden items-center justify-center shadow-lg relative`}
              >
                <Svg width={GAME_SIZE} height={GAME_SIZE} style={StyleSheet.absoluteFill}>
                  {edges.map((edge, i) => {
                    const p1 = nodes[edge.from];
                    const p2 = nodes[edge.to];
                    if (!p1 || !p2) return null;
                    
                    // Check if this specific edge is crossing any other edge
                    let isCrossing = false;
                    for (let j = 0; j < edges.length; j++) {
                      if (i === j) continue;
                      const e2 = edges[j];
                      if (edge.from === e2.from || edge.from === e2.to || edge.to === e2.from || edge.to === e2.to) continue;
                      if (doIntersect(p1, p2, nodes[e2.from], nodes[e2.to])) {
                        isCrossing = true;
                        break;
                      }
                    }

                    return (
                      <Line
                        key={`edge-${i}`}
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isCrossing ? "#ef4444" : (gameState === GameState.SUCCESS ? "#10b981" : "#6366f1")}
                        strokeWidth={isCrossing ? 3 : 2}
                        opacity={isCrossing ? 1 : 0.6}
                      />
                    );
                  })}
                  {nodes.map((node, i) => (
                    <SvgCircle
                      key={`node-bg-${i}`}
                      cx={node.x}
                      cy={node.y}
                      r={NODE_RADIUS}
                      fill={isDark ? "#0f172a" : "#f1f5f9"}
                      stroke={gameState === GameState.SUCCESS ? "#10b981" : "#6366f1"}
                      strokeWidth={2}
                    />
                  ))}
                </Svg>

                {nodes.map((node, i) => (
                  <NodeDragHandler
                    key={`node-handler-${i}`}
                    index={i}
                    x={node.x}
                    y={node.y}
                    onMove={(x, y) => handleNodeMove(i, x, y)}
                    onDragStateChange={(isDragging) => onLockScroll?.(!isDragging)}
                    isSolved={gameState === GameState.SUCCESS}
                  />
                ))}
                
                {gameState === GameState.SUCCESS && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 bg-emerald-500/10 items-center justify-center pointer-events-none"
                  >
                    <View className="bg-emerald-500 rounded-full p-4 shadow-lg shadow-emerald-500/50">
                      <Check color="white" size={40} strokeWidth={4} />
                    </View>
                  </MotiView>
                )}
              </View>

              <View className="mt-8 items-center">
                <View className={`px-6 py-3 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'} border border-slate-800/20`}>
                  <Text weight="black" className={`${gameState === GameState.SUCCESS ? 'text-emerald-500' : 'text-rose-500'} text-xs uppercase tracking-[0.3em]`}>
                    {gameState === GameState.SUCCESS ? "INTERFERENCE CLEARED" : (crossings === -1 ? "CALCULATING..." : `${crossings} CROSSINGS DETECTED`)}
                  </Text>
                </View>
              </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

function NodeDragHandler({ index, x, y, onMove, onDragStateChange, isSolved }: { 
  index: number, 
  x: number, 
  y: number, 
  onMove: (x: number, y: number) => void,
  onDragStateChange?: (isDragging: boolean) => void,
  isSolved?: boolean
}) {
  const posRef = useRef({ x, y });
  const startPos = useRef({ x, y });
  const onMoveRef = useRef(onMove);
  const onDragStateChangeRef = useRef(onDragStateChange);

  useEffect(() => {
    posRef.current = { x, y };
  }, [x, y]);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    onDragStateChangeRef.current = onDragStateChange;
  }, [onDragStateChange]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: () => {
        onDragStateChangeRef.current?.(true);
        startPos.current = { x: posRef.current.x, y: posRef.current.y };
      },
      onPanResponderMove: (_, gestureState) => {
        onMoveRef.current(startPos.current.x + gestureState.dx, startPos.current.y + gestureState.dy);
      },
      onPanResponderRelease: () => {
        onDragStateChangeRef.current?.(false);
      },
      onPanResponderTerminate: () => {
        onDragStateChangeRef.current?.(false);
      },
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      style={{
        position: 'absolute',
        left: x - NODE_RADIUS * 2,
        top: y - NODE_RADIUS * 2,
        width: NODE_RADIUS * 4,
        height: NODE_RADIUS * 4,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <View 
        style={{
          width: NODE_RADIUS * 0.8,
          height: NODE_RADIUS * 0.8,
          borderRadius: 10,
          backgroundColor: isSolved ? '#10b981' : '#6366f1',
          shadowColor: isSolved ? '#10b981' : '#6366f1',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 5,
        }} 
      />
    </View>
  );
}
