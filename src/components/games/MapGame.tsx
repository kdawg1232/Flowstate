
import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, Dimensions, GestureResponderEvent } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map as MapIcon, RotateCcw, Play, Zap, ChevronDown, Eye, Info } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

/**
 * Region Map Engine: Ported from C implementation (map.c)
 * Supports 4-color map puzzles on a grid with diagonal splits.
 * 
 * Key algorithms from C implementation:
 * - Region generation with weighted expansion
 * - Four-coloring with backtracking
 * - Solver with constraint propagation for unique solution verification
 * - Clue removal while maintaining unique solvability
 */

const FOUR = 4;

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

/**
 * Solver using constraint propagation (from C map_solver)
 * Returns: 0 = impossible, 1 = unique solution, 2 = multiple solutions
 */
const solveWithConstraints = (
  n: number,
  adj: Set<number>[],
  initialColors: (number | null)[],
  resultColors: number[]
): number => {
  // possible[i] is a bitmask of possible colors for region i
  const possible = new Array(n).fill((1 << FOUR) - 1); // All 4 colors possible initially
  const coloring = new Array(n).fill(-1);
  
  // Place initial clues
  const placeColor = (index: number, color: number): boolean => {
    if (!(possible[index] & (1 << color))) return false; // Can't place this color
    
    possible[index] = 1 << color;
    coloring[index] = color;
    
    // Rule out this color from all neighbors
    for (const neighbor of adj[index]) {
      possible[neighbor] &= ~(1 << color);
      if (possible[neighbor] === 0) return false; // Neighbor has no options left
    }
    return true;
  };
  
  // Place initial clues
  for (let i = 0; i < n; i++) {
    if (initialColors[i] !== null) {
      if (!placeColor(i, initialColors[i]!)) return 0; // Inconsistent clues
    }
  }
  
  // Constraint propagation loop
  let changed = true;
  while (changed) {
    changed = false;
    
    // Find regions with only one possible color
    for (let i = 0; i < n; i++) {
      if (coloring[i] >= 0) continue;
      
      const p = possible[i];
      if (p === 0) return 0; // No solution
      
      // Check if p is a power of 2 (only one bit set)
      if ((p & (p - 1)) === 0) {
        const c = Math.log2(p);
        if (!placeColor(i, c)) return 0;
        changed = true;
      }
    }
    
    // Check for pairs of adjacent regions that share the same two possible colors
    // If found, rule out those colors from their common neighbors
    for (let i = 0; i < n; i++) {
      if (coloring[i] >= 0) continue;
      const pi = possible[i];
      const bitCount = (pi & 1) + ((pi >> 1) & 1) + ((pi >> 2) & 1) + ((pi >> 3) & 1);
      if (bitCount !== 2) continue;
      
      for (const j of adj[i]) {
        if (j <= i || coloring[j] >= 0) continue;
        if (possible[j] !== pi) continue;
        
        // i and j are adjacent and share exactly the same 2 possible colors
        // Any region adjacent to both must not have either color
        for (const k of adj[i]) {
          if (k === j || coloring[k] >= 0) continue;
          if (adj[j].has(k) && (possible[k] & pi)) {
            possible[k] &= ~pi;
            if (possible[k] === 0) return 0;
            changed = true;
          }
        }
      }
    }
  }
  
  // Check if solved
  let allColored = true;
  for (let i = 0; i < n; i++) {
    if (coloring[i] < 0) {
      allColored = false;
      break;
    }
  }
  
  if (allColored) {
    for (let i = 0; i < n; i++) resultColors[i] = coloring[i];
    return 1; // Unique solution found
  }
  
  // Need to recurse - find region with fewest possibilities
  let bestRegion = -1;
  let bestCount = FOUR + 1;
  for (let i = 0; i < n; i++) {
    if (coloring[i] >= 0) continue;
    const p = possible[i];
    const count = (p & 1) + ((p >> 1) & 1) + ((p >> 2) & 1) + ((p >> 3) & 1);
    if (count < bestCount) {
      bestCount = count;
      bestRegion = i;
    }
  }
  
  if (bestRegion < 0) return 0;
  
  // Try each possible color
  let solutionsFound = 0;
  const savedResult = new Array(n).fill(-1);
  
  for (let c = 0; c < FOUR; c++) {
    if (!(possible[bestRegion] & (1 << c))) continue;
    
    // Create new clues array with this guess
    const newClues: (number | null)[] = [];
    for (let i = 0; i < n; i++) {
      newClues[i] = coloring[i] >= 0 ? coloring[i] : null;
    }
    newClues[bestRegion] = c;
    
    const tempResult = new Array(n).fill(-1);
    const subResult = solveWithConstraints(n, adj, newClues, tempResult);
    
    if (subResult === 2) return 2; // Multiple solutions in subtree
    if (subResult === 1) {
      if (solutionsFound === 0) {
        for (let i = 0; i < n; i++) savedResult[i] = tempResult[i];
      } else {
        return 2; // Found second solution
      }
      solutionsFound++;
    }
  }
  
  if (solutionsFound === 1) {
    for (let i = 0; i < n; i++) resultColors[i] = savedResult[i];
    return 1;
  }
  
  return 0;
};

const generateMapPuzzle = (w: number, h: number, n: number): MapData => {
  const wh = w * h;
  const grid = new Array(wh * 4).fill(-1);
  
  // Place region seeds randomly
  const seeds = Array.from({ length: wh }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, n);
  seeds.forEach((cellIdx, regionId) => {
    for (let q = 0; q < 4; q++) grid[cellIdx * 4 + q] = regionId;
  });

  // Grow regions to fill the grid (simplified from C's weighted approach)
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

  // Apply diagonal smoothing (from C implementation)
  for (let y = 1; y < h; y++) {
    for (let x = 1; x < w; x++) {
      const idx = y * w + x;
      const c = grid[idx * 4];
      
      // Get the 4 neighbors' colors at the corners
      const tc = grid[((y-1) * w + x) * 4 + Quadrant.BE];
      const bc = grid[((y < h-1 ? y+1 : y) * w + x) * 4 + Quadrant.TE];
      const lc = grid[(y * w + (x-1)) * 4 + Quadrant.RE];
      const rc = grid[(y * w + (x < w-1 ? x+1 : x)) * 4 + Quadrant.LE];
      
      // If square is adjacent to two regions on opposite sides, make it diagonal
      if (tc !== bc && (tc === c || bc === c)) {
        if ((lc === tc && rc === bc) || (lc === bc && rc === tc)) {
          grid[idx * 4 + Quadrant.TE] = tc;
          grid[idx * 4 + Quadrant.BE] = bc;
          grid[idx * 4 + Quadrant.LE] = lc;
          grid[idx * 4 + Quadrant.RE] = rc;
        }
      }
    }
  }

  // Build adjacency graph
  const adj = Array.from({ length: n }, () => new Set<number>());
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const qT = grid[i * 4 + Quadrant.TE], qB = grid[i * 4 + Quadrant.BE];
      const qL = grid[i * 4 + Quadrant.LE], qR = grid[i * 4 + Quadrant.RE];
      
      // Internal adjacencies within the cell
      if (qT !== qB) { adj[qT].add(qB); adj[qB].add(qT); }
      if (qL !== qR) { adj[qL].add(qR); adj[qR].add(qL); }
      if (qT !== qL) { adj[qT].add(qL); adj[qL].add(qT); }
      if (qT !== qR) { adj[qT].add(qR); adj[qR].add(qT); }
      if (qB !== qL) { adj[qB].add(qL); adj[qL].add(qB); }
      if (qB !== qR) { adj[qB].add(qR); adj[qR].add(qB); }

      // Cross-cell adjacencies
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

  // Four-color the map using backtracking (from C fourcolour_recurse)
  const solution = new Array(n).fill(-1);
  const fourColor = (idx: number): boolean => {
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
        if (fourColor(idx + 1)) return true;
        solution[idx] = -1;
      }
    }
    return false;
  };
  fourColor(0);

  // Generate clues by removing colors while maintaining unique solvability
  // (Key logic from C: remove one at a time, verify unique solution remains)
  const clues: (number | null)[] = [...solution];
  
  // Count colors to ensure at least one of each remains
  const colorFreq = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) colorFreq[solution[i]]++;
  
  // Shuffle order for random clue removal
  const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
  
  for (const regionIdx of order) {
    const currentColor = clues[regionIdx];
    if (currentColor === null) continue;
    
    // Don't remove last instance of any color (need at least one for player to drag from)
    if (colorFreq[currentColor] <= 1) continue;
    
    // Try removing this clue
    const testClues = [...clues];
    testClues[regionIdx] = null;
    
    // Check if puzzle still has unique solution
    const testResult = new Array(n).fill(-1);
    const solveResult = solveWithConstraints(n, adj, testClues, testResult);
    
    if (solveResult === 1) {
      // Verify the solution matches our expected solution
      let matches = true;
      for (let i = 0; i < n; i++) {
        if (testResult[i] !== solution[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        clues[regionIdx] = null;
        colorFreq[currentColor]--;
      }
    }
  }

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
const SOLVED_PREVIEW_MS = 1000;

const MapGame: React.FC<Props> = ({ onComplete, isActive, theme = 'dark', onLockScroll }) => {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [showInfo, setShowInfo] = useState(false);
  const [puzzle, setPuzzle] = useState<MapData | null>(null);
  const [userColors, setUserColors] = useState<number[]>([]);
  const [isAutoSolved, setIsAutoSolved] = useState(false);
  const [showSolvedSummary, setShowSolvedSummary] = useState(false);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';

  const initGame = useCallback(() => {
    // Increased difficulty: 7x9 grid with 18 regions (from 6x8 with 12)
    // More regions = more constraints = harder puzzle
    const data = generateMapPuzzle(7, 9, 18);
    setPuzzle(data);
    setUserColors(data.clues.map(c => c ?? -1));
    setGameState(GameState.PLAYING);
    setIsAutoSolved(false);
    setShowSolvedSummary(false);
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
    const gridHeight = GRID_SIZE * (puzzle.h / puzzle.w);
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
      setShowSolvedSummary(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (gameState === GameState.FINISHED && !isAutoSolved) {
      setShowSolvedSummary(false);
      const timer = setTimeout(() => {
        setShowSolvedSummary(true);
      }, SOLVED_PREVIEW_MS);
      return () => clearTimeout(timer);
    }
    setShowSolvedSummary(false);
  }, [gameState, isAutoSolved]);

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
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-2 uppercase text-center ${textColor}`}>Region Map</Text>
            <Pressable onPress={() => setShowInfo(true)} className="mb-2 self-center">
              <Info size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#64748b'} />
            </Pressable>
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
              <AnimatePresence exitBeforeEnter>
                {gameState === GameState.FINISHED && !isAutoSolved && showSolvedSummary ? (
                  <MotiView
                    key="map-solved-summary"
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: -10 }}
                    transition={{ type: 'timing', duration: 220 }}
                    style={{ width: GRID_SIZE, minHeight: GRID_SIZE * 0.6 }}
                    className="items-center justify-center"
                  >
                    <Text weight="black" className={`text-3xl italic uppercase tracking-tighter text-center mb-2 ${textColor}`}>
                      Map logged
                    </Text>
                    <Text variant="mono" className="text-emerald-400 text-2xl tracking-widest uppercase">
                      25 reps logged
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
                    key="map-board"
                    from={{ opacity: 0.98 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'timing', duration: 180 }}
                    className="relative w-full items-center"
                  >
                    <View 
                      onStartShouldSetResponder={() => true}
                      onResponderRelease={handleGridTap}
                      style={{ width: GRID_SIZE, height: GRID_SIZE * (9/7) }}
                      className={`rounded-3xl overflow-hidden border ${
                        gameState === GameState.FINISHED 
                          ? 'border-emerald-500/50' 
                          : (isDark ? 'border-white/5 bg-slate-900/40' : 'border-slate-200 bg-white shadow-inner')
                      }`}
                    >
                      <Svg viewBox={`0 0 ${puzzle?.w ?? 7} ${puzzle?.h ?? 9}`} style={{ width: '100%', height: '100%' }}>
                        {puzzle && Array.from({ length: puzzle.w * puzzle.h }).map((_, i) => renderCell(i))}
                        {renderBorders()}
                      </Svg>
                    </View>
                  </MotiView>
                )}
              </AnimatePresence>
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
                    ) : null}
                  </MotiView>
                )}
              </AnimatePresence>
            </View>
          </MotiView>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'timing', duration: 200 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
            className="items-center justify-center px-8 bg-black/85"
          >
            <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setShowInfo(false)} />
            <MotiView
              from={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'timing', duration: 200 }}
              style={{ zIndex: 51, width: '100%' }}
              className="bg-slate-900 rounded-3xl p-8 border border-white/10"
            >
              <Text weight="black" className="text-white text-xl uppercase tracking-tighter mb-5">How to Play</Text>
              <Text className="text-slate-400 text-sm leading-relaxed mb-2">
                A map with many regions is displayed. Tap a region to cycle through 4 available colors.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed mb-2">
                No two regions that share a border can use the same color.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed">
                Color every region on the map without any adjacent regions matching to solve the puzzle.
              </Text>
              <Pressable onPress={() => setShowInfo(false)} className="mt-6 bg-pink-600/30 border border-pink-500/40 py-3 rounded-2xl items-center">
                <Text weight="black" className="text-pink-400 uppercase text-sm tracking-widest">Got It</Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
};

export default React.memo(MapGame);
