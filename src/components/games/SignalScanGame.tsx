import React, { useState, useEffect, useRef } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Zap, Check, X, Timer, Play, ChevronDown, Shapes, Info } from 'lucide-react-native';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (score: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

// Shape types
type ShapeType = 'circle' | 'square' | 'triangle' | 'diamond' | 'hexagon' | 'star';
const SHAPES: ShapeType[] = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHAPE_SIZE = Math.min(SCREEN_WIDTH * 0.35, 120);

// SVG Shape Components
const ShapeRenderer = ({ shape, color, size }: { shape: ShapeType; color: string; size: number }) => {
  const halfSize = size / 2;
  
  switch (shape) {
    case 'circle':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={halfSize} cy={halfSize} r={halfSize * 0.8} fill={color} />
        </Svg>
      );
    case 'square':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Rect x={size * 0.1} y={size * 0.1} width={size * 0.8} height={size * 0.8} fill={color} rx={size * 0.05} />
        </Svg>
      );
    case 'triangle':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon points={`${halfSize},${size * 0.1} ${size * 0.9},${size * 0.9} ${size * 0.1},${size * 0.9}`} fill={color} />
        </Svg>
      );
    case 'diamond':
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon points={`${halfSize},${size * 0.05} ${size * 0.95},${halfSize} ${halfSize},${size * 0.95} ${size * 0.05},${halfSize}`} fill={color} />
        </Svg>
      );
    case 'hexagon':
      const hexPoints = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = halfSize + halfSize * 0.8 * Math.cos(angle);
        const y = halfSize + halfSize * 0.8 * Math.sin(angle);
        hexPoints.push(`${x},${y}`);
      }
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon points={hexPoints.join(' ')} fill={color} />
        </Svg>
      );
    case 'star':
      const starPoints = [];
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? halfSize * 0.8 : halfSize * 0.4;
        const x = halfSize + radius * Math.cos(angle);
        const y = halfSize + radius * Math.sin(angle);
        starPoints.push(`${x},${y}`);
      }
      return (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Polygon points={starPoints.join(' ')} fill={color} />
        </Svg>
      );
    default:
      return null;
  }
};

function SignalScanGame({ onComplete, isActive, theme = 'dark' }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [showInfo, setShowInfo] = useState(false);
  const [shapeHistory, setShapeHistory] = useState<number[]>([]); // History of shape indices
  const [currentShapeIdx, setCurrentShapeIdx] = useState<number>(0);
  const [nBackLevel, setNBackLevel] = useState<number>(1); // 1, 2, or 3
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const getRandomNBack = (currentRound: number): number => {
    // Start with 1-back, gradually introduce 2-back and 3-back
    if (currentRound < 3) return 1; // First few rounds are always 1-back
    if (currentRound < 6) return Math.random() < 0.7 ? 1 : 2; // Mostly 1-back, some 2-back
    // After round 6, mix of all levels
    const rand = Math.random();
    if (rand < 0.4) return 1;
    if (rand < 0.75) return 2;
    return 3;
  };

  const startGame = () => { 
    setScore(0); 
    setRound(0);
    setTimeLeft(20); 
    setFeedback(null);
    setNBackLevel(1);
    
    // Initialize with first shape (observation phase)
    const initialIdx = Math.floor(Math.random() * SHAPES.length);
    setCurrentShapeIdx(initialIdx);
    // Start with empty compare history so first actionable round has no prior match target.
    setShapeHistory([]);
    setGameState(GameState.OBSERVATION);

    // After brief observation, start playing
    setTimeout(() => {
      nextRound([], 1);
    }, 1000);
  };

  const nextRound = (history: number[], roundNum: number) => {
    // Determine N-back level for this round
    const newNBack = getRandomNBack(roundNum);
    setNBackLevel(newNBack);
    
    // Generate new shape - sometimes make it match the N-back target
    let newShapeIdx: number;
    const targetIdx = history.length >= newNBack ? history[history.length - newNBack] : null;
    
    // 40% chance to match if we have enough history
    if (targetIdx !== null && Math.random() < 0.4) {
      newShapeIdx = targetIdx;
    } else {
      newShapeIdx = Math.floor(Math.random() * SHAPES.length);
    }
    
    setCurrentShapeIdx(newShapeIdx);
    setRound(roundNum);
    setFeedback(null);
    setGameState(GameState.PLAYING);
  };

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isActive]);

  const finishedScoreRef = useRef(0);

  useEffect(() => {
    if (gameState === GameState.PLAYING && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft <= 0 && gameState === GameState.PLAYING) {
      if (timerRef.current) clearInterval(timerRef.current);
      finishedScoreRef.current = score;
      setGameState(GameState.FINISHED);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeLeft, score]);

  useEffect(() => {
    if (gameState === GameState.FINISHED) {
      const timer = setTimeout(() => onComplete(finishedScoreRef.current, true), 1200);
      return () => clearTimeout(timer);
    }
  }, [gameState, onComplete]);

  const handleDecision = (userSaysMatch: boolean) => {
    if (gameState !== GameState.PLAYING) return;
    
    // Check if we have enough history to compare
    if (shapeHistory.length < nBackLevel) {
      // Not enough history - "no match" is always correct
      if (!userSaysMatch) {
        setScore(s => s + 1);
        setFeedback('correct');
      } else {
        setFeedback('wrong');
      }
    } else {
      // Compare with N-back shape
      const targetShapeIdx = shapeHistory[shapeHistory.length - nBackLevel];
      const isActualMatch = currentShapeIdx === targetShapeIdx;
      
      if (userSaysMatch === isActualMatch) {
        setScore(s => s + 1);
        setFeedback('correct');
      } else {
        setFeedback('wrong');
      }
    }
    
    // Update history and move to next round
    const newHistory = [...shapeHistory, currentShapeIdx];
    // Keep only last 4 shapes in history (enough for 3-back)
    const trimmedHistory = newHistory.slice(-4);
    setShapeHistory(trimmedHistory);
    
    setTimeout(() => {
      nextRound(trimmedHistory, round + 1);
    }, 200);
  };

  const getNBackText = () => {
    switch (nBackLevel) {
      case 1: return '1 SHAPE AGO';
      case 2: return '2 SHAPES AGO';
      case 3: return '3 SHAPES AGO';
      default: return '1 SHAPE AGO';
    }
  };

  const currentShape = SHAPES[currentShapeIdx];
  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const controlBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  const shapeColor = feedback === 'correct' ? '#10b981' : feedback === 'wrong' ? '#f43f5e' : '#f59e0b';

  return (
    <View className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {gameState === GameState.IDLE ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'timing', duration: 250 }} className="flex-1 items-center justify-center px-6">
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-amber-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Shapes color="#f59e0b" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-2 uppercase ${textColorClass}`}>Shape Memory</Text>
            <Pressable onPress={() => setShowInfo(true)} className="mb-2 self-center">
              <Info size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#64748b'} />
            </Pressable>
            <Text className={`${subTextColorClass} text-xs uppercase tracking-[0.2em] mb-10 text-center max-w-[260px] leading-relaxed`}>
              N-Back Challenge: Does the current shape match the one shown N shapes ago?
            </Text>
            <Pressable onPress={startGame} className="bg-amber-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">BEGIN TEST</Text>
            </Pressable>
          </MotiView>
        ) : (gameState === GameState.PLAYING || gameState === GameState.OBSERVATION) ? (
          <MotiView key="play" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'timing', duration: 250 }} className="flex-1 items-center">
            {/* Header Stats */}
            <View style={{ marginTop: insets.top + 60 }} className="w-full flex-row justify-between px-4 mb-6">
              <View className={`flex-row items-center gap-2 ${controlBgClass} px-4 py-2 rounded-full border`}>
                <Timer size={14} color="#f59e0b" />
                <Text variant="mono" className="text-amber-500 text-sm">{timeLeft}s</Text>
              </View>
              <View className={`flex-row items-center gap-2 ${controlBgClass} px-4 py-2 rounded-full border`}>
                <Zap size={14} color="#eab308" />
                <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
              </View>
            </View>
            
            {/* N-Back Level Indicator (only when enough history exists) */}
            {gameState === GameState.PLAYING && shapeHistory.length >= nBackLevel && (
              <MotiView 
                key={`nback-${round}`}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4"
              >
                <View className={`${controlBgClass} px-6 py-2 rounded-full border-2 ${
                  nBackLevel === 1 ? 'border-emerald-500/50' : 
                  nBackLevel === 2 ? 'border-amber-500/50' : 
                  'border-rose-500/50'
                }`}>
                  <Text weight="black" className={`text-sm tracking-widest ${
                    nBackLevel === 1 ? 'text-emerald-500' : 
                    nBackLevel === 2 ? 'text-amber-500' : 
                    'text-rose-500'
                  }`}>
                    MATCH {getNBackText()}?
                  </Text>
                </View>
              </MotiView>
            )}
            
            {/* Shape Display */}
            <View className="flex-1 items-center justify-center w-full">
              <MotiView 
                key={`${currentShapeIdx}-${round}`}
                from={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className={`w-48 h-48 rounded-[2.5rem] border-2 items-center justify-center shadow-xl ${
                  feedback === 'correct' ? 'border-emerald-500 bg-emerald-500/10' : 
                  feedback === 'wrong' ? 'border-rose-500 bg-rose-500/10' : 
                  (isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white')
                }`}
              >
                <ShapeRenderer shape={currentShape} color={shapeColor} size={SHAPE_SIZE} />
              </MotiView>
              
              <Text weight="bold" className={`mt-8 ${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>
                {gameState === GameState.OBSERVATION ? "Memorize this shape..." : `Round ${round + 1}`}
              </Text>
            </View>

            {/* Decision Buttons */}
            <View className="w-full flex-row gap-4 px-4 mb-10">
              <Pressable 
                onPress={() => handleDecision(false)} 
                disabled={gameState === GameState.OBSERVATION} 
                className={`flex-1 ${controlBgClass} py-5 rounded-[2rem] border-2 items-center gap-1 active:scale-95 ${gameState === GameState.OBSERVATION ? 'opacity-30' : ''}`}
              >
                <X color="#f43f5e" size={24} strokeWidth={3} />
                <Text weight="black" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>NO MATCH</Text>
              </Pressable>
              <Pressable 
                onPress={() => handleDecision(true)} 
                disabled={gameState === GameState.OBSERVATION} 
                className={`flex-1 ${controlBgClass} py-5 rounded-[2rem] border-2 items-center gap-1 active:scale-95 ${gameState === GameState.OBSERVATION ? 'opacity-30' : ''}`}
              >
                <Check color="#10b981" size={24} strokeWidth={3} />
                <Text weight="black" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>MATCH</Text>
              </Pressable>
            </View>
          </MotiView>
        ) : (
          <MotiView key="finished" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'timing', duration: 250 }} className="flex-1 items-center justify-center px-6">
            <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
              <Check color="#10b981" size={32} />
            </View>
            <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter text-center ${textColorClass}`}>
              Total reps logged
            </Text>
            <Text variant="mono" className="text-emerald-400 text-2xl tracking-widest uppercase mb-10">
              {finishedScoreRef.current} reps logged
            </Text>

            <View className="items-center gap-2 opacity-40">
              <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
              <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={20} />
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
                A shape appears on screen. Your job: does it match the shape shown <Text weight="bold" className="text-white">N steps ago</Text>?
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed mb-2">
                Tap <Text weight="bold" className="text-emerald-400">YES</Text> if the current shape is the same as the one N shapes back, or <Text weight="bold" className="text-rose-400">NO</Text> if it differs.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed">
                The N level increases as you progress, making the memory challenge harder. You have 20 seconds.
              </Text>
              <Pressable onPress={() => setShowInfo(false)} className="mt-6 bg-amber-500/20 border border-amber-500/40 py-3 rounded-2xl items-center">
                <Text weight="black" className="text-amber-400 uppercase text-sm tracking-widest">Got It</Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

export default React.memo(SignalScanGame);
