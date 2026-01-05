import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { ChevronRight, Zap, AlertTriangle, CheckCircle2, Play, Target, Timer, ChevronDown, ArrowRight } from 'lucide-react-native';
import { GameState } from '../../types';
import { Text } from '../../ui/Text';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface Props {
  onComplete: (score: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

type Direction = 'left' | 'right' | 'up' | 'down';

interface ArrowNode {
  dir: Direction;
  isCenter: boolean;
  x: number; // Percent 0-100
  y: number; // Percent 0-100
  delay: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = Math.min(SCREEN_WIDTH - 48, 320);

const ArrowIcon = ({ dir, color, size = 32 }: { dir: Direction, color: string, size?: number }) => {
  let rotate = '0deg';
  if (dir === 'left') rotate = '180deg';
  if (dir === 'up') rotate = '-90deg';
  if (dir === 'down') rotate = '90deg';

  return (
    <MotiView animate={{ rotate }} transition={{ type: 'spring', damping: 15, stiffness: 250 }}>
      <ChevronRight color={color} size={size} />
    </MotiView>
  );
};

function ArrowFlankerGame({ onComplete, isActive, theme = 'dark' }: Props) {
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [nodes, setNodes] = useState<ArrowNode[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitialized = useRef(false);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();

  const generateTrial = useCallback(() => {
    const mainDir: Direction = (['left', 'right', 'up', 'down'] as Direction[])[Math.floor(Math.random() * 4)];
    const isCongruent = Math.random() > 0.4;
    const opposites: Record<Direction, Direction> = { left: 'right', right: 'left', up: 'down', down: 'up' };
    const flankDir = isCongruent ? mainDir : opposites[mainDir];
    
    const formationType = Math.floor(Math.random() * 4); 
    const newNodes: ArrowNode[] = [];
    
    const TIGHT_RADIUS = 10; 
    const MEDIUM_RADIUS = 18;

    newNodes.push({ dir: mainDir, isCenter: true, x: 50, y: 50, delay: 0 });

    const getPos = (angleDeg: number, r: number) => ({
      x: 50 + r * Math.cos(angleDeg * (Math.PI / 180)),
      y: 50 + r * Math.sin(angleDeg * (Math.PI / 180))
    });

    let formationPoints: { angle: number, r: number }[] = [];

    if (formationType === 0) { // Tight Diamond / Cross
      formationPoints = [{ angle: 0, r: TIGHT_RADIUS }, { angle: 90, r: TIGHT_RADIUS }, { angle: 180, r: TIGHT_RADIUS }, { angle: 270, r: TIGHT_RADIUS }];
    } else if (formationType === 1) { // V-Shape
      const baseAngle = mainDir === 'right' ? 180 : mainDir === 'left' ? 0 : mainDir === 'up' ? 90 : 270;
      formationPoints = [{ angle: baseAngle - 30, r: TIGHT_RADIUS }, { angle: baseAngle + 30, r: TIGHT_RADIUS }, { angle: baseAngle - 45, r: MEDIUM_RADIUS }, { angle: baseAngle + 45, r: MEDIUM_RADIUS }];
    } else if (formationType === 2) { // Compact Hexagonal Ring
      for (let i = 0; i < 6; i++) formationPoints.push({ angle: i * 60, r: TIGHT_RADIUS + 2 });
    } else { // Irregular Scattered Cluster
      const count = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) formationPoints.push({ angle: Math.random() * 360, r: TIGHT_RADIUS + (Math.random() * 10) });
    }

    formationPoints.forEach((pt, i) => {
      const pos = getPos(pt.angle, pt.r);
      newNodes.push({ dir: flankDir, isCenter: false, x: pos.x, y: pos.y, delay: i * 0.02 });
    });

    setNodes(newNodes);
    setGameState(GameState.PLAYING);
    setFeedback(null);
  }, []);

  const startGame = () => {
    setScore(0);
    setTimeLeft(15);
    hasInitialized.current = true;
    generateTrial();
  };

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
      hasInitialized.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    }
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

  const handleSwipe = (dir: Direction) => {
    if (gameState !== GameState.PLAYING) return;
    const target = nodes.find(n => n.isCenter)?.dir;
    
    if (dir === target) {
      setScore(s => s + 1);
      setFeedback('correct');
      setTimeout(() => generateTrial(), 80);
    } else {
      setFeedback('wrong');
      setTimeout(() => generateTrial(), 250);
    }
  };

  const onGestureEvent = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, translationY } = event.nativeEvent;
      const threshold = 25;
      if (Math.abs(translationX) > Math.abs(translationY)) {
        if (translationX > threshold) handleSwipe('right');
        else if (translationX < -threshold) handleSwipe('left');
      } else {
        if (translationY > threshold) handleSwipe('down');
        else if (translationY < -threshold) handleSwipe('up');
      }
    }
  };

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const controlBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const arrowBaseColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <View className={`flex-1 items-center justify-center p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {(gameState === GameState.IDLE && !hasInitialized.current) ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center z-20">
            <View className={`w-20 h-20 ${isDark ? 'bg-indigo-500/20 border-indigo-500/40' : 'bg-white border-indigo-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Target color="#6366f1" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Arrow Flanker</Text>
            <Text className={`${subTextColorClass} text-xs uppercase tracking-[0.2em] mb-10 text-center max-w-[240px]`}>Focus on the dead center. Filter out the noise.</Text>
            <Pressable onPress={startGame} className="bg-indigo-500 px-12 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">INITIATE SCAN</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED ? (
          <MotiView key="results" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center z-20">
             <View className="w-16 h-16 rounded-full bg-emerald-500/20 items-center justify-center mb-6 border border-emerald-500/40">
              <CheckCircle2 color="#10b981" size={32} />
            </View>
               <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter ${textColorClass}`}>TARGETS ACQUIRED</Text>
               
               <View className="bg-indigo-500/10 border border-indigo-500/20 px-8 py-4 rounded-3xl items-center mb-10">
                 <Text variant="mono" className="text-indigo-500 text-4xl mb-1 tracking-widest">{score}</Text>
                 <Text weight="bold" className="text-indigo-500/60 text-[10px] uppercase tracking-[0.2em]">FOCUS SCORE</Text>
               </View>

             <View className="items-center gap-6">
               <View className="bg-white/5 px-6 py-4 rounded-2xl flex-row items-center gap-3">
                  <Text weight="black" className="text-emerald-500 uppercase">NEXT GAME READY</Text>
                  <ArrowRight color="#10b981" size={18} />
               </View>
               
               <View className="items-center gap-2 opacity-40">
                 <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
                 <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={20} />
               </View>
             </View>
          </MotiView>
        ) : (gameState === GameState.PLAYING || gameState === GameState.OBSERVATION) ? (
          <MotiView key="game" from={{ opacity: 1 }} className="w-full h-full items-center justify-center relative">
             <View style={{ top: insets.top + 80 }} className="absolute flex-row w-full justify-between px-2 z-10">
                <View className={`flex-row items-center gap-2 ${controlBgClass} px-4 py-2 rounded-full border`}>
                  <Timer size={14} color="#6366f1" />
                  <Text variant="mono" className="text-indigo-500 text-sm">{timeLeft}s</Text>
                </View>
                <View className={`flex-row items-center gap-2 ${controlBgClass} px-4 py-2 rounded-full border`}>
                  <Zap size={14} color="#eab308" />
                  <Text variant="mono" className="text-yellow-500 text-sm">{score}</Text>
                </View>
              </View>

            {nodes.length > 0 && (
              <PanGestureHandler onHandlerStateChange={onGestureEvent}>
                <View style={{ width: GRID_SIZE, height: GRID_SIZE }} className="relative">
                  {nodes.map((node, i) => (
                    <MotiView 
                      key={`${i}-${gameState}`}
                      from={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: node.delay, type: 'spring' }}
                      style={{ position: 'absolute', left: `${node.x}%`, top: `${node.y}%`, marginLeft: -16, marginTop: -16 }}
                    >
                      <ArrowIcon 
                        dir={node.dir} 
                        size={32} 
                        color={
                          feedback === 'correct' && node.isCenter ? '#10b981' : 
                          feedback === 'wrong' && node.isCenter ? '#f43f5e' : 
                          arrowBaseColor 
                        }
                      />
                    </MotiView>
                  ))}
                </View>
              </PanGestureHandler>
            )}

            <AnimatePresence>
              {feedback === 'correct' && (
                <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1.2, opacity: 0.15 }} exit={{ opacity: 0 }} className="absolute z-0">
                  <CheckCircle2 color="#10b981" size={240} />
                </MotiView>
              )}
              {feedback === 'wrong' && (
                <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-0">
                  <AlertTriangle color="#f43f5e" size={240} style={{ opacity: 0.15 }} />
                </MotiView>
              )}
            </AnimatePresence>
          </MotiView>
        ) : (
          <View />
        )}
      </AnimatePresence>
    </View>
  );
}

export default React.memo(ArrowFlankerGame);
