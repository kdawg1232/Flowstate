import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { 
  Calculator, 
  Timer, 
  Zap, 
  Check, 
  Play, 
  ChevronDown, 
  ArrowRight, 
  RefreshCw, 
  Brain,
  Eraser,
  Trophy
} from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

// Types
type Operator = '+' | '-' | '*' | '/' | '';

interface Cage {
  id: string;
  cells: { r: number; c: number }[];
  operator: Operator;
  target: number;
}

interface CellData {
  value: number | null;
  notes: number[];
  isCorrect?: boolean;
}

interface Props {
  onComplete: (score: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (enabled: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = 4;
const CELL_SIZE = Math.min(SCREEN_WIDTH - 80, 320) / GRID_SIZE;
const GRID_PIXELS = CELL_SIZE * GRID_SIZE;

const KeenGame = ({ onComplete, isActive, theme = 'dark', onLockScroll }: Props) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [cages, setCages] = useState<Cage[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // Add a visual timer countdown if needed, or just count up

  const insets = useSafeAreaInsets();
  const isDark = theme === 'dark';
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isActive) setGameState(GameState.IDLE);
  }, [isActive]);

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      onLockScroll?.(false);
    } else {
      onLockScroll?.(true);
    }
    return () => onLockScroll?.(true);
  }, [gameState, onLockScroll]);

  // Visual timer effect
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState]);

  // --- Logic: Puzzle Generation ---

  const generateLatinSquare = useCallback((size: number): number[][] => {
    const square: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    
    const isValid = (r: number, c: number, val: number) => {
      for (let i = 0; i < size; i++) {
        if (square[r][i] === val || square[i][c] === val) return false;
      }
      return true;
    };

    const solve = (r: number, c: number): boolean => {
      if (r === size) return true;
      if (c === size) return solve(r + 1, 0);

      const nums = Array.from({ length: size }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
      for (const num of nums) {
        if (isValid(r, c, num)) {
          square[r][c] = num;
          if (solve(r, c + 1)) return true;
          square[r][c] = 0;
        }
      }
      return false;
    };

    solve(0, 0);
    return square;
  }, []);

  const generateCages = useCallback((size: number, sol: number[][]): Cage[] => {
    const cages: Cage[] = [];
    const visited = Array(size).fill(false).map(() => Array(size).fill(false));
    let cageIdCounter = 0;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (visited[r][c]) continue;

        const cageCells: { r: number; c: number }[] = [];
        const stack: { r: number; c: number }[] = [{ r, c }];
        
        // Random cage size: 1 to 3 cells (3 is max for 5x5 to keep it readable)
        const targetSize = Math.floor(Math.random() * 3) + 1;

        while (stack.length > 0 && cageCells.length < targetSize) {
          const curr = stack.shift()!;
          if (visited[curr.r][curr.c]) continue;

          visited[curr.r][curr.c] = true;
          cageCells.push(curr);

          const neighbors = [
            { r: curr.r + 1, c: curr.c },
            { r: curr.r - 1, c: curr.c },
            { r: curr.r, c: curr.c + 1 },
            { r: curr.r, c: curr.c - 1 },
          ].filter(n => n.r >= 0 && n.r < size && n.c >= 0 && n.c < size && !visited[n.r][n.c]);

          neighbors.sort(() => Math.random() - 0.5);
          for (const n of neighbors) {
            stack.push(n);
          }
        }

        const cageVals = cageCells.map(cell => sol[cell.r][cell.c]);
        let operator: Operator = '';
        let target = 0;

        if (cageCells.length === 1) {
          operator = '';
          target = cageVals[0];
        } else if (cageCells.length === 2) {
          const [v1, v2] = cageVals;
          const possibleOps: Operator[] = ['+', '*', '-'];
          if (v1 % v2 === 0 || v2 % v1 === 0) possibleOps.push('/');
          
          operator = possibleOps[Math.floor(Math.random() * possibleOps.length)];
          
          if (operator === '+') target = v1 + v2;
          else if (operator === '*') target = v1 * v2;
          else if (operator === '-') target = Math.abs(v1 - v2);
          else if (operator === '/') target = v1 > v2 ? v1 / v2 : v2 / v1;
        } else {
          operator = Math.random() > 0.4 ? '+' : '*';
          if (operator === '+') target = cageVals.reduce((a, b) => a + b, 0);
          else target = cageVals.reduce((a, b) => a * b, 1);
        }

        cages.push({
          id: `cage-${cageIdCounter++}`,
          cells: cageCells,
          operator,
          target
        });
      }
    }

    return cages;
  }, []);

  const initGame = useCallback(() => {
    const sol = generateLatinSquare(GRID_SIZE);
    const newCages = generateCages(GRID_SIZE, sol);
    
    setSolution(sol);
    setCages(newCages);
    setGrid(Array(GRID_SIZE).fill(null).map(() => 
      Array(GRID_SIZE).fill(null).map(() => ({ value: null, notes: [] }))
    ));
    setGameState(GameState.PLAYING);
    setStartTime(Date.now());
    setSelectedCell(null);
    setScore(0);
    setTimeLeft(120); // 2 minutes for a 4x4
  }, [generateLatinSquare, generateCages]);

  const solveGame = () => {
    if (gameState !== GameState.PLAYING) return;
    setGrid(solution.map(row => row.map(val => ({ value: val, notes: [] }))));
    // Brief delay before success
    setTimeout(() => {
      setGameState(GameState.SUCCESS);
      setScore(25); // Lower score for auto-solve
    }, 500);
  };

  // --- Handlers ---

  const handleCellPress = (r: number, c: number) => {
    if (gameState !== GameState.PLAYING) return;
    setSelectedCell({ r, c });
  };

  const handleNumberInput = (num: number) => {
    if (!selectedCell || gameState !== GameState.PLAYING) return;
    const { r, c } = selectedCell;

    const newGrid = [...grid.map(row => [...row])];
    const cell = { ...newGrid[r][c] };

    if (isNoteMode) {
      cell.value = null;
      if (cell.notes.includes(num)) {
        cell.notes = cell.notes.filter(n => n !== num);
      } else {
        cell.notes = [...cell.notes, num].sort();
      }
    } else {
      cell.value = cell.value === num ? null : num;
      cell.notes = [];
    }

    newGrid[r][c] = cell;
    setGrid(newGrid);
    checkWin(newGrid);
  };

  const handleErase = () => {
    if (!selectedCell || gameState !== GameState.PLAYING) return;
    const { r, c } = selectedCell;
    const newGrid = [...grid.map(row => [...row])];
    newGrid[r][c] = { value: null, notes: [] };
    setGrid(newGrid);
  };

  const checkWin = (currentGrid: CellData[][]) => {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (currentGrid[r][c].value === null) return;
      }
    }

    for (let i = 0; i < GRID_SIZE; i++) {
      const rowSet = new Set();
      const colSet = new Set();
      for (let j = 0; j < GRID_SIZE; j++) {
        rowSet.add(currentGrid[i][j].value);
        colSet.add(currentGrid[j][i].value);
      }
      if (rowSet.size !== GRID_SIZE || colSet.size !== GRID_SIZE) return;
    }

    for (const cage of cages) {
      const vals = cage.cells.map(cell => currentGrid[cell.r][cell.c].value as number);
      let isValid = false;
      
      if (cage.operator === '+') {
        isValid = vals.reduce((a, b) => a + b, 0) === cage.target;
      } else if (cage.operator === '*') {
        isValid = vals.reduce((a, b) => a * b, 1) === cage.target;
      } else if (cage.operator === '-') {
        isValid = Math.abs(vals[0] - vals[1]) === cage.target;
      } else if (cage.operator === '/') {
        isValid = (vals[0] / vals[1] === cage.target) || (vals[1] / vals[0] === cage.target);
      } else {
        isValid = vals[0] === cage.target;
      }

      if (!isValid) return;
    }

    const time = Math.floor((Date.now() - startTime) / 1000);
    setTimeTaken(time);
    setGameState(GameState.SUCCESS);
    setScore(50);
  };

  const handleContinue = () => {
    setGameState(GameState.FINISHED);
    onComplete(score);
  };

  // --- UI Helpers ---

  const getCageBorders = (r: number, c: number) => {
    const cellCage = cages.find(cage => cage.cells.some(cell => cell.r === r && cell.c === c));
    if (!cellCage) return {};

    const hasNeighbor = (dr: number, dc: number) => 
      cellCage.cells.some(cell => cell.r === r + dr && cell.c === c + dc);

    const thick = isDark ? '#22d3ee' : '#0891b2';
    const thin = isDark ? '#1e293b' : '#e2e8f0';

    const topIsCageEdge = !hasNeighbor(-1, 0);
    const bottomIsCageEdge = !hasNeighbor(1, 0);
    const leftIsCageEdge = !hasNeighbor(0, -1);
    const rightIsCageEdge = !hasNeighbor(0, 1);

    return {
      borderTopWidth: topIsCageEdge ? 4 : 1,
      borderBottomWidth: bottomIsCageEdge ? 4 : 1,
      borderLeftWidth: leftIsCageEdge ? 4 : 1,
      borderRightWidth: rightIsCageEdge ? 4 : 1,
      borderTopColor: topIsCageEdge ? thick : thin,
      borderBottomColor: bottomIsCageEdge ? thick : thin,
      borderLeftColor: leftIsCageEdge ? thick : thin,
      borderRightColor: rightIsCageEdge ? thick : thin,
    };
  };

  const getCageClue = (r: number, c: number) => {
    const cellCage = cages.find(cage => cage.cells.some(cell => cell.r === r && cell.c === c));
    if (!cellCage) return null;

    const sortedCells = [...cellCage.cells].sort((a, b) => a.r !== b.r ? a.r - b.r : a.c - b.c);
    if (sortedCells[0].r === r && sortedCells[0].c === c) {
      return `${cellCage.target}${cellCage.operator === '*' ? '×' : cellCage.operator === '/' ? '÷' : cellCage.operator}`;
    }
    return null;
  };

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const cardBgClass = isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200';

  return (
    <View className={`flex-1 px-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView 
            key="idle"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 items-center justify-center"
          >
            <View className={`w-20 h-20 ${isDark ? 'bg-cyan-500/20 border-cyan-500/40' : 'bg-white border-cyan-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Calculator color="#06b6d4" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>KEEN</Text>
            <Text className={`${subTextColorClass} text-[10px] uppercase tracking-[0.2em] mb-10 text-center max-w-[280px]`}>
              Fill the grid so each row and column contains 1-{GRID_SIZE}. Satisfy the arithmetic clues in each cage.
            </Text>
            <Pressable onPress={initGame} className="bg-cyan-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
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
              {score > 0 ? 'CALCULATION COMPLETE' : 'LOGIC FAILED'}
            </Text>
            
            <View className={`w-full max-w-[240px] ${isDark ? 'bg-cyan-950/40 border-cyan-500/20' : 'bg-white border-cyan-100'} border-2 py-8 rounded-[2.5rem] items-center mb-10 shadow-xl`}>
              <Text variant="mono" className={`${score > 0 ? 'text-cyan-400' : 'text-slate-500'} text-5xl mb-2 tracking-widest`}>{score}</Text>
              <Text weight="black" className={`${isDark ? 'text-cyan-500/60' : 'text-cyan-400'} text-[10px] uppercase tracking-[0.4em]`}>MENTAL REPS</Text>
            </View>

            <View className="items-center gap-8">
               <Pressable onPress={handleContinue} className={`${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} px-8 py-4 rounded-2xl flex-row items-center gap-3 border shadow-sm`}>
                  <Text weight="black" className="text-emerald-500 uppercase tracking-widest">NEXT READY</Text>
                  <ArrowRight color="#10b981" size={18} />
               </Pressable>
               
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
                  <Text variant="mono" className="text-cyan-500 text-sm">{Math.max(0, timeLeft)}s</Text>
                </View>
                <View className="flex-row gap-2">
                  <Pressable onPress={initGame} className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                    <RefreshCw size={14} color="#06b6d4" />
                    <Text weight="bold" className="text-cyan-500 text-[10px] uppercase">Reset</Text>
                  </Pressable>
                  <Pressable onPress={solveGame} className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                    <Brain size={14} color="#06b6d4" />
                    <Text weight="bold" className="text-cyan-500 text-[10px] uppercase">Solve</Text>
                  </Pressable>
                </View>
                <View className={`flex-row items-center gap-2 ${cardBgClass} px-4 py-2 rounded-full border`}>
                  <Zap size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
                </View>
              </View>

              {/* Game Grid */}
              <View 
                style={{ width: GRID_PIXELS, height: GRID_PIXELS }}
                className={`${cardBgClass} border-2 shadow-2xl relative`}
              >
                {grid.map((row, r) => (
                  <View key={r} className="flex-row">
                    {row.map((cell, c) => {
                      const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                      const clue = getCageClue(r, c);
                      const borders = getCageBorders(r, c);
                      
                      return (
                        <Pressable
                          key={`${r}-${c}`}
                          onPress={() => handleCellPress(r, c)}
                          style={[
                            { width: CELL_SIZE, height: CELL_SIZE },
                            borders,
                            isSelected && { backgroundColor: isDark ? '#164e63' : '#cffafe', zIndex: 10 }
                          ]}
                          hitSlop={6}
                          className="relative items-center justify-center"
                        >
                          {clue && (
                            <View className="absolute top-0.5 left-1">
                              <Text weight="black" className="text-[9px] text-cyan-500 opacity-90 leading-none">
                                {clue}
                              </Text>
                            </View>
                          )}
                          
                          {cell.value ? (
                            <Text 
                              weight="black" 
                              variant="mono" 
                              className={`text-2xl ${isSelected ? 'text-cyan-400' : textColorClass}`}
                            >
                              {cell.value}
                            </Text>
                          ) : (
                            <View style={{ width: CELL_SIZE, height: CELL_SIZE }} className="items-center justify-center">
                              {(() => {
                                const cols = GRID_SIZE <= 4 ? 2 : 3;
                                const noteSize = CELL_SIZE / cols;
                                return (
                                  <View style={{ width: noteSize * cols, height: noteSize * cols }} className="flex-row flex-wrap">
                                    {Array.from({ length: GRID_SIZE }, (_, i) => i + 1).map(n => (
                                      <View key={n} style={{ width: noteSize, height: noteSize }} className="items-center justify-center">
                                        {cell.notes.includes(n) && (
                                          <Text weight="bold" className={`text-[9px] ${isDark ? 'text-cyan-500' : 'text-cyan-600'}`}>{n}</Text>
                                        )}
                                      </View>
                                    ))}
                                  </View>
                                );
                              })()}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
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

              {/* Controls */}
              <View className="flex-1 w-full justify-center px-4">
                <View className="flex-row justify-center gap-4 mb-8">
                  <Pressable
                    onPress={() => setIsNoteMode(!isNoteMode)}
                    className={`flex-1 max-w-[140px] py-4 rounded-2xl items-center flex-row justify-center gap-2 border-2 ${isNoteMode ? 'bg-cyan-600 border-cyan-500' : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')}`}
                  >
                    <Brain size={18} color={isNoteMode ? 'white' : (isDark ? '#64748b' : '#94a3b8')} />
                    <Text weight="black" className={`text-[10px] uppercase tracking-widest ${isNoteMode ? 'text-white' : (isDark ? 'text-slate-400' : 'text-slate-600')}`}>NOTES</Text>
                  </Pressable>
                  
                  <Pressable
                    onPress={handleErase}
                    className={`flex-1 max-w-[140px] py-4 rounded-2xl items-center flex-row justify-center gap-2 border-2 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
                  >
                    <Eraser size={18} color={isDark ? '#64748b' : '#94a3b8'} />
                    <Text weight="black" className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ERASE</Text>
                  </Pressable>
                </View>

                <View className="flex-row flex-wrap justify-center gap-3">
                  {Array.from({ length: GRID_SIZE }, (_, i) => i + 1).map(num => (
                    <Pressable
                      key={num}
                      onPress={() => handleNumberInput(num)}
                      className={`w-14 h-14 rounded-3xl items-center justify-center border-2 ${
                        selectedCell 
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/10' 
                          : 'bg-slate-500/5 border-slate-500/10'
                      }`}
                    >
                      <Text variant="mono" weight="black" className={`text-xl ${selectedCell ? 'text-cyan-500' : subTextColorClass}`}>{num}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => setGameState(GameState.IDLE)}
                  className="mt-8 self-center"
                >
                  <Text weight="bold" className="text-slate-500 text-[10px] uppercase tracking-[0.3em]">ABORT MISSION</Text>
                </Pressable>
              </View>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

export default React.memo(KeenGame);
