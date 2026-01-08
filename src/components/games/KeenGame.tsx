
import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Dimensions, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grid3X3, RotateCcw, Play, Zap, ChevronDown, Eye, Check } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

/** 
 * Ported logic from original C implementation 
 */

interface PuzzleData {
  w: number;
  solution: number[];
  dsf: number[];
  clues: Record<number, { target: number; op: string }>;
}

const MAXBLK = 6;

const dsf_init = (n: number) => Array(n).fill(-1);
const dsf_canonify = (dsf: number[], i: number): number => {
  if (dsf[i] < 0) return i;
  return (dsf[i] = dsf_canonify(dsf, dsf[i]));
};
const dsf_size = (dsf: number[], i: number): number => {
  const root = dsf_canonify(dsf, i);
  return -dsf[root];
};
const dsf_merge = (dsf: number[], i: number, j: number) => {
  let root1 = dsf_canonify(dsf, i);
  let root2 = dsf_canonify(dsf, j);
  if (root1 !== root2) {
    dsf[root1] += dsf[root2];
    dsf[root2] = root1;
  }
};

const generateKeen = (w: number = 4): PuzzleData => {
  const a = w * w;
  
  const grid = Array(a).fill(0);
  const isSafe = (idx: number, num: number) => {
    const r = Math.floor(idx / w);
    const c = idx % w;
    for (let i = 0; i < w; i++) {
      if (grid[r * w + i] === num || grid[i * w + c] === num) return false;
    }
    return true;
  };
  const solveLatin = (idx: number): boolean => {
    if (idx === a) return true;
    const nums = Array.from({ length: w }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    for (const n of nums) {
      if (isSafe(idx, n)) {
        grid[idx] = n;
        if (solveLatin(idx + 1)) return true;
        grid[idx] = 0;
      }
    }
    return false;
  };
  solveLatin(0);

  let dsf = dsf_init(a);
  const order = Array.from({ length: a }, (_, i) => i).sort(() => Math.random() - 0.5);
  const singletons = Array(a).fill(true);

  order.forEach(i => {
    if (!singletons[i]) return;
    const x = i % w, y = Math.floor(i / w);
    const neighbors = [];
    if (x > 0 && singletons[i - 1]) neighbors.push(i - 1);
    if (x < w - 1 && singletons[i + 1]) neighbors.push(i + 1);
    if (y > 0 && singletons[i - w]) neighbors.push(i - w);
    if (y < w - 1 && singletons[i + w]) neighbors.push(i + w);

    if (neighbors.length > 0 && Math.random() < 0.75) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      dsf_merge(dsf, i, target);
      singletons[i] = singletons[target] = false;
    }
  });

  order.forEach(i => {
    if (!singletons[i]) return;
    const x = i % w, y = Math.floor(i / w);
    const neighbors = [];
    if (x > 0 && dsf_size(dsf, i - 1) < MAXBLK) neighbors.push(i - 1);
    if (x < w - 1 && dsf_size(dsf, i + 1) < MAXBLK) neighbors.push(i + 1);
    if (y > 0 && dsf_size(dsf, i - w) < MAXBLK) neighbors.push(i - w);
    if (y < w - 1 && dsf_size(dsf, i + w) < MAXBLK) neighbors.push(i + w);

    if (neighbors.length > 0) {
      const target = neighbors[Math.floor(Math.random() * neighbors.length)];
      dsf_merge(dsf, i, target);
      singletons[i] = false;
    }
  });

  const clues: Record<number, { target: number; op: string }> = {};
  for (let i = 0; i < a; i++) {
    const root = dsf_canonify(dsf, i);
    if (clues[root]) continue;

    const cageCells = Array.from({ length: a }, (_, idx) => idx).filter(idx => dsf_canonify(dsf, idx) === root);
    const vals = cageCells.map(idx => grid[idx]);
    
    if (cageCells.length === 1) {
      clues[root] = { target: vals[0], op: '' };
    } else if (cageCells.length === 2) {
      const sorted = [...vals].sort((a, b) => b - a);
      const rand = Math.random();
      if (rand < 0.25) clues[root] = { target: vals[0] + vals[1], op: '+' };
      else if (rand < 0.5) clues[root] = { target: vals[0] * vals[1], op: '*' };
      else if (rand < 0.75) clues[root] = { target: sorted[0] - sorted[1], op: '-' };
      else if (sorted[0] % sorted[1] === 0) clues[root] = { target: sorted[0] / sorted[1], op: '/' };
      else clues[root] = { target: vals[0] + vals[1], op: '+' };
    } else {
      const op = Math.random() > 0.5 ? '*' : '+';
      const target = op === '*' ? vals.reduce((a, b) => a * b, 1) : vals.reduce((a, b) => a + b, 0);
      clues[root] = { target, op };
    }
  }

  return { w, solution: grid, dsf, clues };
};

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (lock: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_WIDTH - 48, 320);
const CELL_SIZE = GRID_SIZE / 4;

const KeenGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [userGrid, setUserGrid] = useState<number[]>([]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [isAutoSolved, setIsAutoSolved] = useState(false);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const initGame = useCallback(() => {
    const w = 4;
    const newPuzzle = generateKeen(w);
    setPuzzle(newPuzzle);
    setUserGrid(Array(w * w).fill(0));
    setGameState(GameState.PLAYING);
    setSelectedCell(null);
    setIsAutoSolved(false);
  }, []);

  const handleAutoSolve = () => {
    if (puzzle) {
      setUserGrid([...puzzle.solution]);
      setIsAutoSolved(true);
      setGameState(GameState.FINISHED);
      onComplete(0, false);
    }
  };

  const checkVictory = useCallback(() => {
    if (!puzzle || userGrid.includes(0) || isAutoSolved) return;

    for (let i = 0; i < puzzle.w; i++) {
      const row = new Set();
      const col = new Set();
      for (let j = 0; j < puzzle.w; j++) {
        row.add(userGrid[i * puzzle.w + j]);
        col.add(userGrid[j * puzzle.w + i]);
      }
      if (row.size !== puzzle.w || col.size !== puzzle.w) return;
    }

    const roots = Object.keys(puzzle.clues).map(Number);
    const validCages = roots.every(root => {
      const clue = puzzle.clues[root];
      const cageCells = Array.from({ length: puzzle.w * puzzle.w }, (_, idx) => idx)
        .filter(idx => dsf_canonify(puzzle.dsf, idx) === root);
      const vals = cageCells.map(idx => userGrid[idx]);

      if (clue.op === '+') return vals.reduce((a, b) => a + b, 0) === clue.target;
      if (clue.op === '*') return vals.reduce((a, b) => a * b, 1) === clue.target;
      if (clue.op === '-') {
        const sorted = [...vals].sort((a, b) => b - a);
        return sorted[0] - sorted[1] === clue.target;
      }
      if (clue.op === '/') {
        const sorted = [...vals].sort((a, b) => b - a);
        return sorted[0] / sorted[1] === clue.target;
      }
      return vals[0] === clue.target;
    });

    if (validCages) {
      setGameState(GameState.FINISHED);
      onComplete(10, true);
    }
  }, [userGrid, puzzle, onComplete, isAutoSolved]);

  useEffect(() => {
    if (isActive && gameState === GameState.PLAYING) checkVictory();
  }, [userGrid, isActive, gameState, checkVictory]);

  const handleInput = (num: number) => {
    if (selectedCell === null || gameState !== GameState.PLAYING) return;
    const next = [...userGrid];
    next[selectedCell] = next[selectedCell] === num ? 0 : num;
    setUserGrid(next);
  };

  const getBorderStyles = (idx: number) => {
    if (!puzzle) return {};
    const root = dsf_canonify(puzzle.dsf, idx);
    const r = Math.floor(idx / puzzle.w);
    const c = idx % puzzle.w;
    const isFinished = gameState === GameState.FINISHED;

    const heavyColor = isFinished ? '#10b981' : (isDark ? '#06b6d4' : '#0f172a');
    const lightColor = isFinished ? 'rgba(16, 185, 129, 0.2)' : (isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(226, 232, 240, 1)');

    const styles: any = {
      borderTopWidth: (r === 0 || dsf_canonify(puzzle.dsf, idx - puzzle.w) !== root) ? 2 : 0.5,
      borderBottomWidth: (r === puzzle.w - 1 || dsf_canonify(puzzle.dsf, idx + puzzle.w) !== root) ? 2 : 0.5,
      borderLeftWidth: (c === 0 || dsf_canonify(puzzle.dsf, idx - 1) !== root) ? 2 : 0.5,
      borderRightWidth: (c === puzzle.w - 1 || dsf_canonify(puzzle.dsf, idx + 1) !== root) ? 2 : 0.5,
      borderTopColor: (r === 0 || dsf_canonify(puzzle.dsf, idx - puzzle.w) !== root) ? heavyColor : lightColor,
      borderBottomColor: (r === puzzle.w - 1 || dsf_canonify(puzzle.dsf, idx + puzzle.w) !== root) ? heavyColor : lightColor,
      borderLeftColor: (c === 0 || dsf_canonify(puzzle.dsf, idx - 1) !== root) ? heavyColor : lightColor,
      borderRightColor: (c === puzzle.w - 1 || dsf_canonify(puzzle.dsf, idx + 1) !== root) ? heavyColor : lightColor,
    };

    return styles;
  };

  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
    }
  }, [isActive]);

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
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-cyan-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Grid3X3 color="#06b6d4" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase text-center ${textColor}`}>Keen Logic</Text>
            <Text className={`${subTextColor} text-xs uppercase tracking-[0.2em] mb-10 max-w-[240px] text-center leading-relaxed`}>
              Complete the grid. Every cage must satisfy the arithmetic target without repeats.
            </Text>
            <Pressable 
              onPress={initGame} 
              className="bg-cyan-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
            >
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">START REPS</Text>
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
            {/* Game Board Section - Centered in remaining space */}
            <View className="flex-1 w-full items-center justify-center mb-8">
              <View className="relative w-full items-center">
                {(() => {
                  const isFinished = gameState === GameState.FINISHED;
                  return (
                    <View 
                      style={{ width: GRID_SIZE, height: GRID_SIZE }}
                      className={`rounded-md overflow-hidden ${isFinished ? 'bg-emerald-500/5' : ''}`}
                    >
                      <View className="flex-row flex-wrap w-full h-full">
                        {puzzle && userGrid.map((val, i) => {
                          const isRoot = dsf_canonify(puzzle.dsf, i) === i;
                          const clue = puzzle.clues[i];
                          
                          return (
                            <Pressable
                              key={i}
                              onPress={() => !isFinished && setSelectedCell(i)}
                              style={[
                                { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
                                getBorderStyles(i),
                                selectedCell === i && !isFinished ? { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.05)' } : { backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'white' },
                                isFinished ? { backgroundColor: 'rgba(16, 185, 129, 0.05)' } : {}
                              ]}
                            >
                              {isRoot && clue && (
                                <Text 
                                  weight="black"
                                  className={`absolute top-1 left-1.5 text-[10px] leading-none ${isFinished ? 'text-emerald-500/60' : 'text-cyan-400'}`}
                                >
                                  {clue.target}{clue.op === '*' ? '×' : clue.op === '/' ? '÷' : clue.op}
                                </Text>
                              )}
                              <Text 
                                weight="black" 
                                className={`text-2xl ${val === 0 ? 'opacity-0' : (isFinished ? 'text-emerald-500' : textColor)}`}
                              >
                                {val}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {/* Victory Overlay */}
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
                      className="items-center justify-center rounded-xl"
                    >
                      <View 
                        className="w-16 h-16 rounded-full bg-emerald-500 items-center justify-center mb-6 border border-emerald-400"
                        style={{ shadowColor: '#10b981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20 }}
                      >
                        <Check color="white" size={32} />
                      </View>
                      <Text weight="black" className="text-3xl text-white italic uppercase tracking-tighter mb-1">REP LOGGED</Text>
                      <Text variant="mono" className="text-cyan-400 text-2xl tracking-widest mb-8">+10 LOGIC XP</Text>
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
            </View>

            {/* Input Controls Section - Bottom */}
            <View className="w-full items-center mb-8">
              <AnimatePresence exitBeforeEnter>
                {gameState === GameState.PLAYING ? (
                  <MotiView
                    key="controls"
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: 10 }}
                    className="w-full items-center"
                  >
                    <View className="flex-row gap-3 w-full max-w-[320px] justify-between mb-8">
                      {[1, 2, 3, 4].map(n => (
                        <Pressable 
                          key={n} 
                          onPress={() => handleInput(n)} 
                          className={`flex-1 py-5 rounded-2xl border-2 items-center justify-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
                        >
                          <Text weight="black" className={`text-lg ${textColor}`}>{n}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <View className="flex-row gap-4 w-full max-w-[320px]">
                      <Pressable 
                        onPress={initGame} 
                        className={`flex-1 py-4 rounded-2xl border flex-row items-center justify-center gap-2 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}
                      >
                        <RotateCcw size={14} color={isDark ? "#64748b" : "#94a3b8"} />
                        <Text weight="black" className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>New Grid</Text>
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
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

export default React.memo(KeenGame);
