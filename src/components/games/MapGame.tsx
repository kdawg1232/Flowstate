
import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Dimensions, StyleSheet, GestureResponderEvent } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map as MapIcon, Check, RotateCcw, Play, Zap, ChevronDown, Eye, Layout } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

/**
 * Region Map Engine: Ported from C implementation
 * Supports 4-color map puzzles on a grid with diagonal splits.
 */

enum Quadrant { TE = 0, BE = 1, LE = 2, RE = 3 }

interface MapData {
  w: number;
  h: number;
  n: number;
  grid: number[];
  adj: Set<number>[];
  clues: (number | null)[];
  solution: number[];
}

const generateMapPuzzle = (w: number, h: number, n: number): MapData => {
  const wh = w * h;
  const grid = new Array(wh * 4).fill(-1);
  
  const seeds = Array.from({ length: wh }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, n);
  seeds.forEach((cellIdx, regionId) => {
    for (let q = 0; q < 4; q++) grid[cellIdx * 4 + q] = regionId;
  });

  const filled = new Set(seeds);
  while (filled.size < wh) {
    const availableCells: number[] = [];
    for (let i = 0; i < wh; i++) if (grid[i * 4] === -1) {
      const x = i % w, y = Math.floor(i / w);
      const neighbors = [
        y > 0 ? (y - 1) * w + x : -1,
        y < h - 1 ? (y + 1) * w + x : -1,
        x > 0 ? y * w + (x - 1) : -1,
        x < w - 1 ? y * w + (x + 1) : -1
      ];
      for (const nb of neighbors) {
        if (nb !== -1 && grid[nb * 4] !== -1) {
          availableCells.push(i);
          break;
        }
      }
    }
    
    if (availableCells.length === 0) break;
    const target = availableCells[Math.floor(Math.random() * availableCells.length)];
    const tx = target % w, ty = Math.floor(target / w);
    const nbs = [
      ty > 0 ? (ty - 1) * w + tx : -1,
      ty < h - 1 ? (ty + 1) * w + tx : -1,
      tx > 0 ? ty * w + (tx - 1) : -1,
      tx < w - 1 ? ty * w + (tx + 1) : -1
    ].filter(v => v !== -1 && grid[v * 4] !== -1);
    
    const pickedRegion = grid[nbs[Math.floor(Math.random() * nbs.length)] * 4];
    for (let q = 0; q < 4; q++) grid[target * 4 + q] = pickedRegion;
    filled.add(target);
  }

  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const idxTL = (y - 1) * w + (x - 1);
      const idxTR = (y - 1) * w + x;
      const idxBL = y * w + (x - 1);
      const idxBR = y * w + x;

      if (grid[idxTL * 4] === grid[idxBR * 4] && grid[idxTR * 4] === grid[idxBL * 4] && grid[idxTL * 4] !== grid[idxTR * 4]) {
        if (Math.random() > 0.5) {
          grid[idxTR * 4 + Quadrant.LE] = grid[idxTL * 4];
          grid[idxBL * 4 + Quadrant.RE] = grid[idxTL * 4];
        } else {
          grid[idxTL * 4 + Quadrant.RE] = grid[idxTR * 4];
          grid[idxBR * 4 + Quadrant.LE] = grid[idxTR * 4];
        }
      }
    }
  }

  const adj = Array.from({ length: n }, () => new Set<number>());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const qT = grid[i * 4 + Quadrant.TE], qB = grid[i * 4 + Quadrant.BE];
      const qL = grid[i * 4 + Quadrant.LE], qR = grid[i * 4 + Quadrant.RE];
      if (qT !== qB) { adj[qT].add(qB); adj[qB].add(qT); }
      if (qL !== qR) { adj[qL].add(qR); adj[qR].add(qL); }
      if (qT !== qL) { adj[qT].add(qL); adj[qL].add(qT); }
      if (qT !== qR) { adj[qT].add(qR); adj[qR].add(qT); }
      if (qB !== qL) { adj[qB].add(qL); adj[qL].add(qB); }
      if (qB !== qR) { adj[qB].add(qR); adj[qR].add(qB); }

      if (x < w - 1) {
        const r1 = grid[i * 4 + Quadrant.RE];
        const r2 = grid[(y * w + x + 1) * 4 + Quadrant.LE];
        if (r1 !== r2) { adj[r1].add(r2); adj[r2].add(r1); }
      }
      if (y < h - 1) {
        const r1 = grid[i * 4 + Quadrant.BE];
        const r2 = grid[((y + 1) * w + x) * 4 + Quadrant.TE];
        if (r1 !== r2) { adj[r1].add(r2); adj[r2].add(r1); }
      }
    }
  }

  const solution = new Array(n).fill(-1);
  const solve = (idx: number): boolean => {
    if (idx === n) return true;
    const colors = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    for (const c of colors) {
      let ok = true;
      for (const neighbor of adj[idx]) {
        if (solution[neighbor] === c) {
          ok = false;
          break;
        }
      }
      if (ok) {
        solution[idx] = c;
        if (solve(idx + 1)) return true;
        solution[idx] = -1;
      }
    }
    return false;
  };
  solve(0);

  const clues: (number | null)[] = solution.map(c => Math.random() > 0.3 ? null : c);

  return { w, h, n, grid, adj, clues, solution };
};

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (lock: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

const MapGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [puzzle, setPuzzle] = useState<MapData | null>(null);
  const [userColors, setUserColors] = useState<number[]>([]);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isAutoSolved, setIsAutoSolved] = useState(false);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const initGame = useCallback(() => {
    const data = generateMapPuzzle(6, 8, 12);
    setPuzzle(data);
    setUserColors(data.clues.map(c => c ?? -1));
    setGameState(GameState.PLAYING);
    setShowSuccessOverlay(false);
    setIsAutoSolved(false);
  }, []);

  const handleRegionClick = (regionId: number) => {
    if (gameState !== GameState.PLAYING || puzzle?.clues[regionId] !== null) return;

    const nextColors = [...userColors];
    const current = nextColors[regionId];
    const next = (current + 2) % 5 - 1;
    nextColors[regionId] = next;
    setUserColors(nextColors);

    const isComplete = nextColors.every(c => c !== -1);
    if (isComplete) {
      let isValid = true;
      for (let i = 0; i < puzzle!.n; i++) {
        for (const neighbor of puzzle!.adj[i]) {
          if (nextColors[i] === nextColors[neighbor]) {
            isValid = false;
            break;
          }
        }
        if (!isValid) break;
      }

      if (isValid) {
        setGameState(GameState.FINISHED);
        onComplete(25, true);
        setTimeout(() => setShowSuccessOverlay(true), 800);
      }
    }
  };

  const handleAutoSolve = () => {
    if (!puzzle) return;
    setUserColors([...puzzle.solution]);
    setGameState(GameState.FINISHED);
    setIsAutoSolved(true);
    onComplete(0, false);
  };

  const colorMap = isDark 
    ? ['#06b6d4', '#f59e0b', '#6366f1', '#ec4899'] 
    : ['#0891b2', '#d97706', '#4f46e5', '#db2777'];
  const emptyColor = isDark ? '#0f172a' : '#f1f5f9';

  const getFill = (rId: number) => {
    const c = userColors[rId];
    return c === -1 ? emptyColor : colorMap[c];
  };

  const renderCell = (cellIdx: number) => {
    if (!puzzle || !puzzle.grid) return null;
    const { w } = puzzle;
    const x = cellIdx % w;
    const y = Math.floor(cellIdx / w);

    const qT = puzzle.grid[cellIdx * 4 + Quadrant.TE];
    const qB = puzzle.grid[cellIdx * 4 + Quadrant.BE];
    const qL = puzzle.grid[cellIdx * 4 + Quadrant.LE];
    const qR = puzzle.grid[cellIdx * 4 + Quadrant.RE];

    if (qT === undefined || qB === undefined || qL === undefined || qR === undefined) return null;

    return (
      <React.Fragment key={cellIdx}>
        <Path d={`M ${x} ${y} L ${x+1} ${y} L ${x+0.5} ${y+0.5} Z`} fill={getFill(qT)} />
        <Path d={`M ${x} ${y+1} L ${x+1} ${y+1} L ${x+0.5} ${y+0.5} Z`} fill={getFill(qB)} />
        <Path d={`M ${x} ${y} L ${x} ${y+1} L ${x+0.5} ${y+0.5} Z`} fill={getFill(qL)} />
        <Path d={`M ${x+1} ${y} L ${x+1} ${y+1} L ${x+0.5} ${y+0.5} Z`} fill={getFill(qR)} />
      </React.Fragment>
    );
  };

  // Handle tap on the SVG grid - determine which quadrant was tapped
  const handleGridTap = (event: GestureResponderEvent) => {
    if (gameState !== GameState.PLAYING || !puzzle) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const gridHeight = GRID_SIZE * (8/6);
    const cellWidth = GRID_SIZE / puzzle.w;
    const cellHeight = gridHeight / puzzle.h;
    
    const gridX = locationX / cellWidth;
    const gridY = locationY / cellHeight;
    
    const cellX = Math.floor(gridX);
    const cellY = Math.floor(gridY);
    
    if (cellX < 0 || cellX >= puzzle.w || cellY < 0 || cellY >= puzzle.h) return;
    
    const cellIdx = cellY * puzzle.w + cellX;
    
    // Determine which quadrant within the cell was tapped
    const localX = gridX - cellX; // 0 to 1
    const localY = gridY - cellY; // 0 to 1
    
    // The cell is divided into 4 triangles meeting at center (0.5, 0.5)
    // Top triangle: y < 0.5 and localY < localX and localY < (1 - localX)
    // Bottom triangle: y > 0.5 and localY > localX and localY > (1 - localX)  
    // Left triangle: x < 0.5 and localY > localX and localY < (1 - localX)
    // Right triangle: x > 0.5 and localY < localX and localY > (1 - localX)
    
    let regionId: number;
    
    const aboveDiag1 = localY < localX; // Above line from (0,0) to (1,1)
    const aboveDiag2 = localY < (1 - localX); // Above line from (0,1) to (1,0)
    
    if (aboveDiag1 && aboveDiag2) {
      // Top quadrant
      regionId = puzzle.grid[cellIdx * 4 + Quadrant.TE];
    } else if (!aboveDiag1 && !aboveDiag2) {
      // Bottom quadrant
      regionId = puzzle.grid[cellIdx * 4 + Quadrant.BE];
    } else if (!aboveDiag1 && aboveDiag2) {
      // Left quadrant
      regionId = puzzle.grid[cellIdx * 4 + Quadrant.LE];
    } else {
      // Right quadrant
      regionId = puzzle.grid[cellIdx * 4 + Quadrant.RE];
    }
    
    handleRegionClick(regionId);
  };

  const renderBorders = () => {
    if (!puzzle) return null;
    const { w, h, grid } = puzzle;
    const isFinished = gameState === GameState.FINISHED;
    const borders = [];
    const strokeWidth = 0.08;
    const strokeColor = isFinished ? '#10b981' : (isDark ? '#05070a' : '#ffffff');

    for (let i = 0; i < w * h; i++) {
      const x = i % w, y = Math.floor(i / w);
      const qT = grid[i * 4 + Quadrant.TE], qB = grid[i * 4 + Quadrant.BE];
      const qL = grid[i * 4 + Quadrant.LE], qR = grid[i * 4 + Quadrant.RE];

      if (qT !== qL) borders.push(<Line key={`ix1-${i}`} x1={x} y1={y} x2={x+0.5} y2={y+0.5} stroke={strokeColor} strokeWidth={strokeWidth} />);
      if (qT !== qR) borders.push(<Line key={`ix2-${i}`} x1={x+1} y1={y} x2={x+0.5} y2={y+0.5} stroke={strokeColor} strokeWidth={strokeWidth} />);
      if (qB !== qL) borders.push(<Line key={`ix3-${i}`} x1={x} y1={y+1} x2={x+0.5} y2={y+0.5} stroke={strokeColor} strokeWidth={strokeWidth} />);
      if (qB !== qR) borders.push(<Line key={`ix4-${i}`} x1={x+1} y1={y+1} x2={x+0.5} y2={y+0.5} stroke={strokeColor} strokeWidth={strokeWidth} />);

      if (x < w - 1) {
        if (grid[i * 4 + Quadrant.RE] !== grid[(i+1) * 4 + Quadrant.LE]) {
          borders.push(<Line key={`ebv-${i}`} x1={x+1} y1={y} x2={x+1} y2={y+1} stroke={strokeColor} strokeWidth={strokeWidth} />);
        }
      }
      if (y < h - 1) {
        if (grid[i * 4 + Quadrant.BE] !== grid[(i+w) * 4 + Quadrant.TE]) {
          borders.push(<Line key={`ebh-${i}`} x1={x} y1={y+1} x2={x+1} y2={y+1} stroke={strokeColor} strokeWidth={strokeWidth} />);
        }
      }
    }

    borders.push(<Rect key="outer" x={0} y={0} width={w} height={h} fill="none" stroke={strokeColor} strokeWidth={strokeWidth * 1.5} />);

    return borders;
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
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-pink-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <MapIcon color="#db2777" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase text-center ${textColor}`}>Region Map</Text>
            <Text className={`${subTextColor} text-xs uppercase tracking-[0.2em] mb-10 max-w-[240px] text-center leading-relaxed`}>
              Color each region with 4 available wavelengths. Adjacent sectors cannot share a frequency.
            </Text>
            <Pressable 
              onPress={initGame} 
              className="bg-pink-600 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
            >
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">INITIATE SCAN</Text>
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
            style={{ paddingTop: insets.top + 60 }}
          >
            {/* Game Board Section - Centered in remaining space */}
            <View className="flex-1 w-full items-center justify-center mb-10">
              <View className="relative w-full items-center">
                <View 
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={handleGridTap}
                  style={{ width: GRID_SIZE, height: GRID_SIZE * (8/6) }}
                  className={`rounded-3xl overflow-hidden border ${
                    gameState === GameState.FINISHED 
                      ? 'border-emerald-500/50' 
                      : (isDark ? 'border-white/5 bg-slate-900/40' : 'border-slate-200 bg-white shadow-inner')
                  }`}
                >
                  <Svg viewBox={`0 0 ${puzzle?.w ?? 6} ${puzzle?.h ?? 8}`} style={{ width: '100%', height: '100%' }}>
                    {puzzle && Array.from({ length: puzzle.w * puzzle.h }).map((_, i) => renderCell(i))}
                    {renderBorders()}
                  </Svg>
                </View>

                {/* Victory Overlay */}
                <AnimatePresence>
                  {showSuccessOverlay && (
                    <MotiView 
                      from={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95 }}
                      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5, 7, 10, 0.8)', borderRadius: 24 }]}
                      className="items-center justify-center z-50 p-8"
                    >
                      <View className="w-20 h-20 rounded-full bg-emerald-500 items-center justify-center mb-8 border-4 border-emerald-400">
                        <Check color="white" size={44} strokeWidth={3} />
                      </View>
                      <Text weight="black" className="text-4xl text-white italic uppercase tracking-tighter text-center mb-2">MAP LOGGED</Text>
                      <Text variant="mono" className="text-cyan-400 text-3xl tracking-widest mb-12 text-center">+25 LOGIC XP</Text>
                      
                      <Pressable 
                        onPress={() => setShowSuccessOverlay(false)}
                        className="w-full py-4 bg-white/5 border border-white/20 rounded-[2rem] flex-row items-center justify-center gap-3"
                      >
                        <Eye color="white" size={18} />
                        <Text weight="black" className="text-white text-[11px] uppercase tracking-widest">Inspect Map</Text>
                      </Pressable>

                      <View className="items-center gap-6 opacity-60 mt-12">
                        <Text weight="bold" className="text-white text-[10px] uppercase tracking-[0.5em]">Swipe for next rep</Text>
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

                {/* Layout Button to show overlay again */}
                {gameState === GameState.FINISHED && !isAutoSolved && !showSuccessOverlay && (
                  <MotiView from={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-4 right-4 z-40">
                    <Pressable 
                      onPress={() => setShowSuccessOverlay(true)}
                      className="p-3 bg-emerald-500 rounded-2xl shadow-2xl active:scale-90"
                    >
                      <Layout color="black" size={20} />
                    </Pressable>
                  </MotiView>
                )}
              </View>
            </View>

            {/* Controls Section - Bottom */}
            <View className="w-full items-center mb-8">
              <AnimatePresence exitBeforeEnter>
                {gameState === GameState.PLAYING ? (
                  <MotiView 
                    key="controls" 
                    from={{ opacity: 0, translateY: 10 }} 
                    animate={{ opacity: 1, translateY: 0 }} 
                    exit={{ opacity: 0, translateY: 10 }} 
                    className="w-full items-center px-4"
                  >
                    <Text weight="black" className={`${subTextColor} text-[10px] uppercase tracking-[0.5em] mb-10 text-center opacity-70`}>
                      Tap to cycle neural frequencies
                    </Text>
                    <View className="flex-row gap-4 w-full max-w-[320px]">
                      <Pressable 
                        onPress={initGame} 
                        className={`flex-1 py-4 rounded-2xl border flex-row items-center justify-center gap-3 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-sm'}`}
                      >
                        <RotateCcw color={isDark ? "#64748b" : "#94a3b8"} size={16} />
                        <Text weight="black" className={`text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Reset</Text>
                      </Pressable>
                      <Pressable 
                        onPress={handleAutoSolve} 
                        className={`flex-1 py-4 rounded-2xl border flex-row items-center justify-center gap-3 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white shadow-sm'}`}
                      >
                        <Zap color={isDark ? "#64748b" : "#94a3b8"} size={16} />
                        <Text weight="black" className={`text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Solve</Text>
                      </Pressable>
                    </View>
                  </MotiView>
                ) : (
                  <MotiView 
                    key="finished-state" 
                    from={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="items-center"
                  >
                    {isAutoSolved ? (
                      <View className="items-center">
                          <View className="w-14 h-14 rounded-full bg-amber-500/20 items-center justify-center mb-6 border border-amber-500/40">
                            <Eye color="#f59e0b" size={28} />
                          </View>
                          <Text weight="black" className={`text-2xl italic mb-2 uppercase tracking-tighter ${textColor}`}>BYPASS LOGGED</Text>
                          <Text weight="bold" className="text-slate-500 text-[11px] uppercase tracking-widest mb-10">Neural Rep skipped</Text>
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
                          <Text weight="black" className="text-emerald-500 text-[12px] uppercase tracking-[0.4em] mb-6">REGION STABILITY ACHIEVED</Text>
                          <Pressable 
                            onPress={initGame} 
                            className={`px-10 py-4 rounded-2xl border flex-row items-center justify-center gap-3 ${isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white'}`}
                          >
                            <RotateCcw color={isDark ? "#94a3b8" : "#64748b"} size={16} />
                            <Text weight="black" className={`text-[11px] uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>New Map</Text>
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

export default React.memo(MapGame);
