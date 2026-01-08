
import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Line, Circle, G, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Network, RotateCcw, Play, Zap, ChevronDown, Eye, Check } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

/**
 * Bridges Engine: Ported logic from C implementation
 */

interface Island {
  id: number;
  x: number;
  y: number;
  target: number;
}

interface Bridge {
  from: number;
  to: number;
  count: number; // 1 or 2
}

interface PuzzleData {
  islands: Island[];
  solution: Bridge[];
  width: number;
  height: number;
}

// DSF Helper
class DSF {
  parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    if (this.parent[i] === i) return i;
    return this.parent[i] = this.find(this.parent[i]);
  }
  union(i: number, j: number) {
    const rootI = this.find(i);
    const rootJ = this.find(j);
    if (rootI !== rootJ) this.parent[rootI] = rootJ;
  }
}

const generateBridges = (w: number = 7, h: number = 7): PuzzleData => {
  let bestPuzzle: PuzzleData | null = null;
  
  for (let g = 0; g < 10; g++) {
    const islands: Island[] = [];
    const solution: Bridge[] = [];
    const grid: (number | null)[] = Array(w * h).fill(null);

    const addIsland = (x: number, y: number, target: number = 0) => {
      const id = islands.length;
      const island = { id, x, y, target };
      islands.push(island);
      grid[y * w + x] = id;
      return island;
    };

    const firstX = 1 + Math.floor(Math.random() * (w - 2));
    const firstY = 1 + Math.floor(Math.random() * (h - 2));
    addIsland(firstX, firstY);

    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const maxIslands = 8 + Math.floor(Math.random() * 5); 

    let attempts = 0;
    while (islands.length < maxIslands && attempts < 200) {
      attempts++;
      const source = islands[Math.floor(Math.random() * islands.length)];
      const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
      
      const dist = 2 + Math.floor(Math.random() * 3);
      const nx = source.x + dx * dist;
      const ny = source.y + dy * dist;

      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (grid[ny * w + nx] !== null) continue;

      let clear = true;
      for (let i = 1; i < dist && clear; i++) {
        const tx = source.x + dx * i;
        const ty = source.y + dy * i;
        if (grid[ty * w + tx] !== null) {
          clear = false;
        }
      }

      if (clear) {
        // Check adjacency (ensure no "touching" islands)
        const neighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [adx, ady] of neighbors) {
          const ax = nx + adx;
          const ay = ny + ady;
          if (ax >= 0 && ax < w && ay >= 0 && ay < h) {
            const neighborId = grid[ay * w + ax];
            // If there's a neighbor that isn't the source, it's touching!
            if (neighborId !== null && neighborId !== source.id) {
              clear = false;
              break;
            }
          }
        }
      }

      if (clear) {
        const target = addIsland(nx, ny);
        const count = Math.random() > 0.7 ? 2 : 1;
        solution.push({ from: source.id, to: target.id, count });
        source.target += count;
        target.target += count;
      }
    }

    if (!bestPuzzle || islands.length > bestPuzzle.islands.length) {
      bestPuzzle = { islands, solution, width: w, height: h };
    }
    
    if (islands.length >= 6) break;
  }

  return bestPuzzle!;
};

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (lock: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

const BridgesGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [userBridges, setUserBridges] = useState<Bridge[]>([]);
  const [selectedIslandId, setSelectedIslandId] = useState<number | null>(null);
  const [isAutoSolved, setIsAutoSolved] = useState(false);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const getX = (x: number) => 10 + (x / 6) * 80;
  const getY = (y: number) => 10 + (y / 6) * 80;

  const initGame = useCallback(() => {
    const newPuzzle = generateBridges(7, 7);
    setPuzzle(newPuzzle);
    setUserBridges([]);
    setSelectedIslandId(null);
    setIsAutoSolved(false);
    setGameState(GameState.PLAYING);
  }, []);

  const handleAutoSolve = () => {
    if (puzzle) {
      setUserBridges([...puzzle.solution]);
      setIsAutoSolved(true);
      setGameState(GameState.FINISHED);
      onComplete(0, false);
    }
  };

  const getBridgeCount = (id1: number, id2: number) => {
    const b = userBridges.find(b => (b.from === id1 && b.to === id2) || (b.from === id2 && b.to === id1));
    return b ? b.count : 0;
  };

  const checkVictory = useCallback(() => {
    if (!puzzle || userBridges.length === 0 || isAutoSolved) return;

    const counts = Array(puzzle.islands.length).fill(0);
    userBridges.forEach(b => {
      counts[b.from] += b.count;
      counts[b.to] += b.count;
    });

    const allSatisfied = puzzle.islands.every(is => counts[is.id] === is.target);
    if (!allSatisfied) return;

    const dsf = new DSF(puzzle.islands.length);
    userBridges.forEach(b => dsf.union(b.from, b.to));
    
    const root = dsf.find(0);
    const fullyConnected = puzzle.islands.every(is => dsf.find(is.id) === root);

    if (fullyConnected) {
      setGameState(GameState.FINISHED);
      onComplete(50, true);
    }
  }, [userBridges, puzzle, onComplete, isAutoSolved]);

  useEffect(() => {
    if (isActive && gameState === GameState.PLAYING) checkVictory();
  }, [userBridges, isActive, gameState, checkVictory]);

  const handleIslandClick = (id: number) => {
    if (gameState !== GameState.PLAYING || !puzzle) return;

    if (selectedIslandId === null) {
      setSelectedIslandId(id);
    } else if (selectedIslandId === id) {
      setSelectedIslandId(null);
    } else {
      const island1 = puzzle.islands.find(is => is.id === selectedIslandId);
      const island2 = puzzle.islands.find(is => is.id === id);

      if (island1 && island2 && (island1.x === island2.x || island1.y === island2.y)) {
        const minX = Math.min(island1.x, island2.x);
        const maxX = Math.max(island1.x, island2.x);
        const minY = Math.min(island1.y, island2.y);
        const maxY = Math.max(island1.y, island2.y);
        
        const pathBlocked = puzzle.islands.some(is => {
          if (is.id === island1.id || is.id === island2.id) return false;
          if (island1.x === island2.x) {
            return is.x === island1.x && is.y > minY && is.y < maxY;
          } else {
            return is.y === island1.y && is.x > minX && is.x < maxX;
          }
        });

        const crossing = userBridges.some(b => {
          const b1 = puzzle.islands[b.from];
          const b2 = puzzle.islands[b.to];
          if (!b1 || !b2) return false;
          
          if (island1.x === island2.x) {
             if (b1.y === b2.y) {
               const bMinX = Math.min(b1.x, b2.x);
               const bMaxX = Math.max(b1.x, b2.x);
               return island1.x > bMinX && island1.x < bMaxX && b1.y > minY && b1.y < maxY;
             }
          } else {
            if (b1.x === b2.x) {
              const bMinY = Math.min(b1.y, b2.y);
              const bMaxY = Math.max(b1.y, b2.y);
              return island1.y > bMinY && island1.y < bMaxY && b1.x > minX && b1.x < maxX;
            }
          }
          return false;
        });

        if (!pathBlocked && !crossing) {
          const currentCount = getBridgeCount(island1.id, island2.id);
          const nextCount = (currentCount + 1) % 3;

          const nextBridges = userBridges.filter(b => 
            !((b.from === island1.id && b.to === island2.id) || (b.from === island2.id && b.to === island1.id))
          );
          
          if (nextCount > 0) {
            nextBridges.push({ from: island1.id, to: island2.id, count: nextCount });
          }
          setUserBridges(nextBridges);
        }
      }
      setSelectedIslandId(null);
    }
  };

  const getIslandStatus = (id: number) => {
    if (!puzzle) return 'normal';
    const island = puzzle.islands.find(is => is.id === id);
    if (!island) return 'normal';
    
    let current = 0;
    userBridges.forEach(b => {
      if (b.from === id || b.to === id) current += b.count;
    });

    if (current === island.target) return 'satisfied';
    if (current > island.target) return 'overflow';
    return 'normal';
  };

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
    }
  }, [isActive]);

  // Render the game board SVG
  const renderGameBoard = () => {
    if (!puzzle) return null;
    
    const isFinished = gameState === GameState.FINISHED;
    
    return (
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* Bridges */}
        {userBridges.map((b, idx) => {
          const i1 = puzzle.islands.find(is => is.id === b.from);
          const i2 = puzzle.islands.find(is => is.id === b.to);
          if (!i1 || !i2) return null;
          const x1 = getX(i1.x);
          const y1 = getY(i1.y);
          const x2 = getX(i2.x);
          const y2 = getY(i2.y);
          
          // Green when finished, indigo when playing
          const color = isFinished ? '#10b981' : (isDark ? '#6366f1' : '#4f46e5');
          
          if (b.count === 2) {
            const offset = 1.5;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const len = Math.sqrt(dx*dx + dy*dy) || 1;
            const ox = -dy / len * offset;
            const oy = dx / len * offset;
            return (
              <G key={`bridge-${idx}`}>
                <Line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} stroke={color} strokeWidth="1" strokeLinecap="round" />
                <Line x1={x1 - ox} y1={y1 - oy} x2={x2 - ox} y2={y2 - oy} stroke={color} strokeWidth="1" strokeLinecap="round" />
              </G>
            );
          }
          return (
            <Line key={`bridge-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1" strokeLinecap="round" />
          );
        })}

        {/* Islands */}
        {puzzle.islands.map((is) => {
          const x = getX(is.x);
          const y = getY(is.y);
          const status = getIslandStatus(is.id);
          
          let ringColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
          let bgColor = isDark ? '#0f172a' : '#ffffff';
          let txtColor = isDark ? '#ffffff' : '#0f172a';

          // Finished state - all green
          if (isFinished) {
            ringColor = '#10b981';
            bgColor = 'rgba(16, 185, 129, 0.2)';
            txtColor = '#10b981';
          } else if (selectedIslandId === is.id) {
            ringColor = '#06b6d4';
            bgColor = isDark ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)';
          } else if (status === 'satisfied') {
            ringColor = '#10b981';
            txtColor = '#10b981';
          } else if (status === 'overflow') {
            ringColor = '#f59e0b';
            txtColor = '#f59e0b';
          }

          return (
            <G key={`island-${is.id}`}>
              <Circle 
                cx={x} 
                cy={y} 
                r="6" 
                fill={bgColor} 
                stroke={ringColor} 
                strokeWidth="1.5"
                onPress={() => handleIslandClick(is.id)}
              />
              <SvgText 
                x={x} 
                y={y + 2}
                textAnchor="middle" 
                fontSize="5" 
                fontWeight="bold" 
                fill={txtColor}
                onPress={() => handleIslandClick(is.id)}
              >
                {is.target}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

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
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-indigo-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Network color="#6366f1" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase text-center ${textColor}`}>Neural Bridges</Text>
            <Text className={`${subTextColor} text-xs uppercase tracking-[0.2em] mb-10 max-w-[240px] text-center leading-relaxed`}>
              Connect all islands into a single network. Lines cannot cross.
            </Text>
            <Pressable 
              onPress={initGame} 
              className="bg-indigo-600 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
            >
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">LINK NODES</Text>
            </Pressable>
          </MotiView>
        ) : (
          <MotiView
            key="playing"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 300 }}
            className="flex-1 items-center justify-center"
          >
            {/* Game Board Container */}
            <View className="relative w-full items-center mb-12">
              <View 
                style={{ width: GRID_SIZE, height: GRID_SIZE }}
                className={`rounded-3xl overflow-hidden border ${
                  gameState === GameState.FINISHED 
                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                    : (isDark ? 'border-white/5 bg-slate-900/40' : 'border-slate-200 bg-white')
                }`}
              >
                {renderGameBoard()}
              </View>

              {/* Manual Victory Overlay - appears on top of board */}
              <AnimatePresence>
                {gameState === GameState.FINISHED && !isAutoSolved && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'timing', duration: 300 }}
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      width: GRID_SIZE,
                      height: GRID_SIZE,
                      alignSelf: 'center',
                      backgroundColor: 'rgba(5, 7, 10, 0.4)',
                    }}
                    className="items-center justify-center rounded-3xl"
                  >
                    <View 
                      className="w-16 h-16 rounded-full bg-emerald-500 items-center justify-center mb-6 border border-emerald-400"
                      style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 }}
                    >
                      <Check color="white" size={32} />
                    </View>
                    <Text weight="black" className="text-3xl text-white italic uppercase tracking-tighter mb-1">NETWORK SEALED</Text>
                    <Text variant="mono" className="text-cyan-400 text-2xl tracking-widest mb-8">+50 LOGIC XP</Text>
                    <View className="items-center gap-4 opacity-80 mt-4">
                      <Text weight="bold" className="text-white text-[10px] uppercase tracking-[0.4em]">Continue to next game</Text>
                      <MotiView
                        from={{ translateY: 0 }}
                        animate={{ translateY: 10 }}
                        transition={{ loop: true, type: 'timing', duration: 1000 }}
                      >
                        <ChevronDown color="white" size={24} />
                      </MotiView>
                    </View>
                  </MotiView>
                )}
              </AnimatePresence>
            </View>

            {/* Controls / Auto-solve UI */}
            <AnimatePresence exitBeforeEnter>
              {gameState === GameState.PLAYING ? (
                <MotiView
                  key="controls"
                  from={{ opacity: 0, translateY: 10 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  exit={{ opacity: 0, translateY: 10 }}
                  transition={{ type: 'timing', duration: 200 }}
                  className="w-full items-center"
                >
                  <Text weight="bold" className={`${subTextColor} text-[10px] uppercase tracking-[0.4em] mb-8 text-center`}>
                    {selectedIslandId !== null ? "Select second island" : "Tap an island to start"}
                  </Text>
                  <View className="flex-row gap-4 w-full max-w-[320px]">
                    <Pressable 
                      onPress={initGame} 
                      className={`flex-1 py-4 rounded-2xl border flex-row items-center justify-center gap-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}
                    >
                      <RotateCcw size={14} color={isDark ? "#64748b" : "#94a3b8"} />
                      <Text weight="black" className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Reset</Text>
                    </Pressable>
                    <Pressable 
                      onPress={handleAutoSolve} 
                      className={`flex-1 py-4 rounded-2xl border flex-row items-center justify-center gap-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}
                    >
                      <Zap size={14} color={isDark ? "#64748b" : "#94a3b8"} />
                      <Text weight="black" className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Auto-Solve</Text>
                    </Pressable>
                  </View>
                </MotiView>
              ) : isAutoSolved ? (
                <MotiView
                  key="autosolve-msg"
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'timing', duration: 300 }}
                  className="items-center"
                >
                  <View className="w-12 h-12 rounded-full bg-amber-500/20 items-center justify-center mb-4 border border-amber-500/40">
                    <Eye color="#f59e0b" size={24} />
                  </View>
                  <Text weight="black" className={`text-xl italic mb-1 uppercase tracking-tighter ${textColor}`}>SOLUTION REVEALED</Text>
                  <Text weight="bold" className="text-slate-500 text-[11px] uppercase tracking-widest mb-6">0 reps earned, continue to the next game</Text>
                  <MotiView
                    from={{ translateY: 0 }}
                    animate={{ translateY: 10 }}
                    transition={{ loop: true, type: 'timing', duration: 1000 }}
                  >
                    <ChevronDown color="#475569" size={24} />
                  </MotiView>
                </MotiView>
              ) : null}
            </AnimatePresence>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

export default React.memo(BridgesGame);
