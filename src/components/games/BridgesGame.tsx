import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Layers as BridgeIcon, Timer, Zap, Check, Play, ChevronDown, ArrowRight, RefreshCw, Brain } from 'lucide-react-native';
import Svg, { Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (score: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (enabled: boolean) => void;
}

interface Island {
  id: number;
  x: number; // grid x (0-indexed)
  y: number; // grid y (0-indexed)
  count: number;
  currentCount: number;
}

interface Bridge {
  id: string;
  fromId: number;
  toId: number;
  count: number; // 1 or 2
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 7;
const CELL_SIZE = Math.min(SCREEN_WIDTH - 80, 320) / GRID_SIZE;
const GAME_SIZE = CELL_SIZE * GRID_SIZE;
const ISLAND_RADIUS = CELL_SIZE * 0.35;

export default function BridgesGame({ onComplete, isActive, theme = 'dark', onLockScroll }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [islands, setIslands] = useState<Island[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>([]);
  const [solution, setSolution] = useState<Bridge[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedIsland, setSelectedIsland] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const generatePuzzle = useCallback(() => {
    const newIslands: Island[] = [];
    const solutionBridges: Bridge[] = [];
    const grid: (number | null)[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    const bridgeGrid: boolean[][] = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(false));
    
    const addIsland = (x: number, y: number) => {
      const id = newIslands.length;
      const island = { id, x, y, count: 0, currentCount: 0 };
      newIslands.push(island);
      grid[y][x] = id;
      return island;
    };

    const startX = Math.floor(Math.random() * GRID_SIZE);
    const startY = Math.floor(Math.random() * GRID_SIZE);
    
    let currentIsland = addIsland(startX, startY);
    const numTargetIslands = 6 + Math.floor(Math.random() * 4); // 6-10 islands

    for (let i = 0; i < numTargetIslands - 1; i++) {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      const shuffledDirs = directions.sort(() => Math.random() - 0.5);
      
      let found = false;
      for (const [dx, dy] of shuffledDirs) {
        // Try distances
        const dists = [2, 3, 4].sort(() => Math.random() - 0.5);
        for (const dist of dists) {
          const nx = currentIsland.x + dx * dist;
          const ny = currentIsland.y + dy * dist;
          
          if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && grid[ny][nx] === null) {
            // Check if path is clear (no islands and no existing bridges)
            let clear = true;
            for (let d = 1; d <= dist; d++) {
              const tx = currentIsland.x + dx * d;
              const ty = currentIsland.y + dy * d;
              if (grid[ty][tx] !== null && d < dist) {
                clear = false;
                break;
              }
              // Check for crossing bridges (if we are horizontal, check for vertical bridges, and vice versa)
              // But a simpler check: in our generator, we can just mark all bridge cells in bridgeGrid
              // and if we hit a cell already marked as bridge, it's a cross.
              if (bridgeGrid[ty][tx]) {
                clear = false;
                break;
              }
            }
            
            if (clear) {
              const newIsland = addIsland(nx, ny);
              const bridgeCount = Math.random() > 0.7 ? 2 : 1;
              solutionBridges.push({
                id: `${currentIsland.id}-${newIsland.id}`,
                fromId: currentIsland.id,
                toId: newIsland.id,
                count: bridgeCount
              });
              
              // Mark the path as occupied by bridges
              for (let d = 0; d <= dist; d++) {
                bridgeGrid[currentIsland.y + dy * d][currentIsland.x + dx * d] = true;
              }
              
              currentIsland.count += bridgeCount;
              newIsland.count += bridgeCount;
              currentIsland = newIsland;
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (!found) {
          // If stuck, pick an existing island and try again
          currentIsland = newIslands[Math.floor(Math.random() * newIslands.length)];
      }
    }

    // Filter out islands with 0 count (if any were added but never connected)
    const finalIslands = newIslands.filter(isl => isl.count > 0);
    // Re-index
    const idMap = new Map();
    finalIslands.forEach((isl, idx) => {
        idMap.set(isl.id, idx);
        isl.id = idx;
    });

    const mappedSolution = solutionBridges
      .filter(b => idMap.has(b.fromId) && idMap.has(b.toId))
      .map(b => ({
        ...b,
        fromId: idMap.get(b.fromId),
        toId: idMap.get(b.toId),
        id: `${idMap.get(b.fromId)}-${idMap.get(b.toId)}`
      }));
    
    setIslands(finalIslands);
    setBridges([]);
    setSolution(mappedSolution);
    setGameState(GameState.PLAYING);
    setTimeLeft(60);
  }, []);

  const solveGame = () => {
    if (gameState !== GameState.PLAYING) return;
    setBridges(solution);
    setGameState(GameState.SUCCESS);
    setScore(50); // Set to 50 reps
    if (timerRef.current) clearInterval(timerRef.current);
    // Board stays in SUCCESS state until user clicks CONTINUE
  };

  const handleContinue = () => {
    setGameState(GameState.FINISHED);
    onComplete(score);
  };

  const startGame = () => {
    setScore(0);
    generatePuzzle();
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

  const checkWin = useCallback((currentBridges: Bridge[]) => {
    // 1. Check if all island counts are correct
    const islandBridgeCounts = new Array(islands.length).fill(0);
    currentBridges.forEach(b => {
      islandBridgeCounts[b.fromId] += b.count;
      islandBridgeCounts[b.toId] += b.count;
    });

    const allCorrect = islands.every(isl => islandBridgeCounts[isl.id] === isl.count);
    if (!allCorrect) return false;

    // 2. Check connectivity (all islands must be connected)
    if (islands.length === 0) return false;
    const adj = Array.from({ length: islands.length }, () => [] as number[]);
    currentBridges.forEach(b => {
      adj[b.fromId].push(b.toId);
      adj[b.toId].push(b.fromId);
    });

    const visited = new Set<number>();
    const queue = [0];
    visited.add(0);

    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const v of adj[u]) {
        if (!visited.has(v)) {
          visited.add(v);
          queue.push(v);
        }
      }
    }

    return visited.size === islands.length;
  }, [islands]);

  const handleIslandPress = (id: number) => {
    if (gameState !== GameState.PLAYING) return;
    
    if (selectedIsland === null) {
      setSelectedIsland(id);
    } else if (selectedIsland === id) {
      setSelectedIsland(null);
    } else {
      // Try to connect
      const from = islands.find(isl => isl.id === selectedIsland)!;
      const to = islands.find(isl => isl.id === id)!;
      
      // Must be same row or column
      if (from.x === to.x || from.y === to.y) {
        // Check for islands in between
        let blocked = false;
        const xMin = Math.min(from.x, to.x);
        const xMax = Math.max(from.x, to.x);
        const yMin = Math.min(from.y, to.y);
        const yMax = Math.max(from.y, to.y);

        for (const isl of islands) {
          if (isl.id === from.id || isl.id === to.id) continue;
          if (from.x === to.x && isl.x === from.x && isl.y > yMin && isl.y < yMax) {
            blocked = true;
            break;
          }
          if (from.y === to.y && isl.y === from.y && isl.x > xMin && isl.x < xMax) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          // Check for crossing bridges
          const newBridgeLine = { p1: from, p2: to };
          for (const b of bridges) {
            if ((b.fromId === from.id && b.toId === to.id) || (b.fromId === to.id && b.toId === from.id)) continue;
            
            const bFrom = islands[b.fromId];
            const bTo = islands[b.toId];
            
            // Crossing check: one vertical, one horizontal
            const isNewVertical = from.x === to.x;
            const isBVertical = bFrom.x === bTo.x;
            
            if (isNewVertical !== isBVertical) {
              const v = isNewVertical ? newBridgeLine : { p1: bFrom, p2: bTo };
              const h = isNewVertical ? { p1: bFrom, p2: bTo } : newBridgeLine;
              
              const vX = v.p1.x;
              const vYMin = Math.min(v.p1.y, v.p2.y);
              const vYMax = Math.max(v.p1.y, v.p2.y);
              
              const hY = h.p1.y;
              const hXMin = Math.min(h.p1.x, h.p2.x);
              const hXMax = Math.max(h.p1.x, h.p2.x);
              
              if (vX > hXMin && vX < hXMax && hY > vYMin && hY < vYMax) {
                blocked = true;
                break;
              }
            }
          }
        }

        if (!blocked) {
          setBridges(prev => {
            const existingIdx = prev.findIndex(b => (b.fromId === from.id && b.toId === to.id) || (b.fromId === to.id && b.toId === from.id));
            let nextBridges;
            if (existingIdx > -1) {
              if (prev[existingIdx].count === 1) {
                nextBridges = prev.map((b, i) => i === existingIdx ? { ...b, count: 2 } : b);
              } else {
                nextBridges = prev.filter((_, i) => i !== existingIdx);
              }
            } else {
              nextBridges = [...prev, { id: `${from.id}-${to.id}`, fromId: from.id, toId: to.id, count: 1 }];
            }
            
            if (checkWin(nextBridges)) {
              setGameState(GameState.SUCCESS);
              setScore(50);
              if (timerRef.current) clearInterval(timerRef.current);
            }
            return nextBridges;
          });
        }
      }
      setSelectedIsland(null);
    }
  };

  const getIslandCurrentCount = (id: number) => {
    return bridges.reduce((acc, b) => {
      if (b.fromId === id || b.toId === id) return acc + b.count;
      return acc;
    }, 0);
  };

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';

  return (
    <View className={`flex-1 px-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center">
            <View className={`w-20 h-20 ${isDark ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white border-cyan-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <BridgeIcon color="#06b6d4" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Bridges</Text>
            <Text className={`${subTextColorClass} text-[10px] uppercase tracking-[0.2em] mb-10 text-center max-w-[280px]`}>
              Connect the islands. Each island needs a specific number of bridges. No crossings allowed.
            </Text>
            <Pressable onPress={startGame} className="bg-cyan-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">BEGIN FLOW</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED ? (
          <MotiView key="finished" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 items-center justify-center">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-6 border ${score > 0 ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'}`}>
              {score > 0 ? <Check color="#10b981" size={32} /> : <Zap color="#f43f5e" size={32} />}
            </View>
            <Text weight="black" className={`text-3xl italic mb-6 uppercase tracking-tighter text-center ${textColorClass}`}>
              {score > 0 ? 'ARCHITECT COMPLETE' : 'STRUCTURE FAILED'}
            </Text>
            
            <View className={`w-full max-w-[240px] ${isDark ? 'bg-cyan-950/40 border-cyan-500/20' : 'bg-white border-cyan-100'} border-2 py-8 rounded-[2.5rem] items-center mb-10 shadow-xl`}>
              <Text variant="mono" className={`${score > 0 ? 'text-cyan-400' : 'text-slate-500'} text-5xl mb-2 tracking-widest`}>{score}</Text>
              <Text weight="black" className={`${isDark ? 'text-cyan-500/60' : 'text-cyan-400'} text-[10px] uppercase tracking-[0.4em]`}>MENTAL REPS</Text>
            </View>

            <View className="items-center gap-8">
               <View className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} px-8 py-4 rounded-2xl flex-row items-center gap-3 border shadow-sm`}>
                  <Text weight="black" className="text-emerald-500 uppercase tracking-widest">NEXT READY</Text>
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
                  <Timer size={14} color="#06b6d4" />
                  <Text variant="mono" className="text-cyan-500 text-sm">{timeLeft}s</Text>
                </View>
                {gameState === GameState.PLAYING && (
                  <Pressable onPress={generatePuzzle} className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                    <RefreshCw size={14} color="#06b6d4" />
                    <Text weight="bold" className="text-cyan-500 text-[10px] uppercase">Reset</Text>
                  </Pressable>
                )}
                {gameState === GameState.PLAYING && (
                  <Pressable onPress={solveGame} className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                    <Brain size={14} color="#06b6d4" />
                    <Text weight="bold" className="text-cyan-500 text-[10px] uppercase">Solve</Text>
                  </Pressable>
                )}
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                  <Zap size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
                </View>
              </View>

              <View 
                style={{ width: GAME_SIZE, height: GAME_SIZE }} 
                className={`rounded-[2.5rem] ${cardBgClass} border-2 overflow-hidden items-center justify-center shadow-lg relative`}
              >
                <Svg width={GAME_SIZE} height={GAME_SIZE}>
                  {/* Bridges */}
                  {bridges.map(bridge => {
                    const from = islands.find(isl => isl.id === bridge.fromId)!;
                    const to = islands.find(isl => isl.id === bridge.toId)!;
                    const x1 = from.x * CELL_SIZE + CELL_SIZE/2;
                    const y1 = from.y * CELL_SIZE + CELL_SIZE/2;
                    const x2 = to.x * CELL_SIZE + CELL_SIZE/2;
                    const y2 = to.y * CELL_SIZE + CELL_SIZE/2;
                    
                    if (bridge.count === 1) {
                      return (
                        <Line
                          key={bridge.id}
                          x1={x1} y1={y1} x2={x2} y2={y2}
                          stroke={isDark ? "#06b6d4" : "#0891b2"}
                          strokeWidth={4}
                          strokeLinecap="round"
                        />
                      );
                    } else {
                      const offset = 6;
                      const isVertical = from.x === to.x;
                      return (
                        <React.Fragment key={bridge.id}>
                          <Line
                            x1={isVertical ? x1 - offset : x1}
                            y1={isVertical ? y1 : y1 - offset}
                            x2={isVertical ? x2 - offset : x2}
                            y2={isVertical ? y2 : y2 - offset}
                            stroke={isDark ? "#06b6d4" : "#0891b2"}
                            strokeWidth={3}
                            strokeLinecap="round"
                          />
                          <Line
                            x1={isVertical ? x1 + offset : x1}
                            y1={isVertical ? y1 : y1 + offset}
                            x2={isVertical ? x2 + offset : x2}
                            y2={isVertical ? y2 : y2 + offset}
                            stroke={isDark ? "#06b6d4" : "#0891b2"}
                            strokeWidth={3}
                            strokeLinecap="round"
                          />
                        </React.Fragment>
                      );
                    }
                  })}

                  {/* Islands */}
                  {islands.map(isl => {
                    const cx = isl.x * CELL_SIZE + CELL_SIZE/2;
                    const cy = isl.y * CELL_SIZE + CELL_SIZE/2;
                    const currentCount = getIslandCurrentCount(isl.id);
                    const isCorrect = currentCount === isl.count;
                    const isOver = currentCount > isl.count;
                    const isSelected = selectedIsland === isl.id;

                    return (
                      <React.Fragment key={isl.id}>
                        <SvgCircle
                          cx={cx} cy={cy} r={ISLAND_RADIUS}
                          fill={isDark ? (isSelected ? "#164e63" : "#0f172a") : (isSelected ? "#cffafe" : "#f1f5f9")}
                          stroke={isOver ? "#ef4444" : (isCorrect ? "#10b981" : (isSelected ? "#06b6d4" : (isDark ? "#1e293b" : "#e2e8f0")))}
                          strokeWidth={isSelected ? 3 : 2}
                          onPress={() => handleIslandPress(isl.id)}
                        />
                        <SvgText
                          x={cx} y={cy + 6}
                          fontSize="18"
                          fontWeight="900"
                          textAnchor="middle"
                          fill={isOver ? "#ef4444" : (isCorrect ? "#10b981" : (isDark ? "#94a3b8" : "#64748b"))}
                          onPress={() => handleIslandPress(isl.id)}
                        >
                          {isl.count}
                        </SvgText>
                      </React.Fragment>
                    );
                  })}
                </Svg>

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
                {gameState === GameState.SUCCESS ? (
                  <Pressable 
                    onPress={handleContinue}
                    className="bg-emerald-500 px-10 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl"
                  >
                    <Text weight="black" className="text-white uppercase tracking-widest">CONTINUE</Text>
                    <ArrowRight color="white" size={18} />
                  </Pressable>
                ) : (
                  <View className={`px-6 py-3 rounded-2xl ${isDark ? 'bg-slate-900/50' : 'bg-slate-200/50'} border border-slate-800/20`}>
                    <Text weight="black" className="text-cyan-500 text-xs uppercase tracking-[0.3em]">
                      {selectedIsland !== null ? "SELECT TARGET ISLAND" : "CONNECT THE NODES"}
                    </Text>
                  </View>
                )}
              </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}
