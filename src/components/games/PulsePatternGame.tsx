import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Zap, AlertTriangle, CheckCircle2, Play, ChevronDown, Info } from 'lucide-react-native';
import { GameState } from '../../types';
import { LEVELS } from '../../constants';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (level: number, isClean: boolean) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
  onLockScroll?: (enabled: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 300);

function PulsePatternGame({ onComplete, isActive, theme = 'dark', onLockScroll }: Props) {
  const [internalLevel, setInternalLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [showInfo, setShowInfo] = useState(false);
  const [targetNodes, setTargetNodes] = useState<number[]>([]);
  const [decoyNodes, setDecoyNodes] = useState<number[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);
  const [showEndSummary, setShowEndSummary] = useState(false);
  const [endReps, setEndReps] = useState(0);
  const [endIsClean, setEndIsClean] = useState(false);
  const hasInitialized = useRef(false);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const config = useMemo(() => LEVELS.find(l => l.id === internalLevel) || LEVELS[LEVELS.length - 1], [internalLevel]);
  const totalNodes = config.gridSize * config.gridSize;

  const generateGame = useCallback((levelOverride?: number) => {
    const levelToPlay = levelOverride ?? internalLevel;
    const levelConfig = LEVELS.find(l => l.id === levelToPlay) || LEVELS[LEVELS.length - 1];
    const levelTotalNodes = levelConfig.gridSize * levelConfig.gridSize;
    const indices = Array.from({ length: levelTotalNodes }, (_, i) => i);
    const shuffled = [...indices].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, levelConfig.activeNodes);
    const decoys: number[] = levelConfig.hasDecoys ? shuffled.slice(levelConfig.activeNodes, levelConfig.activeNodes + 3) : [];
    
    setTargetNodes(targets);
    setDecoyNodes(decoys);
    setSelectedNodes([]);
    setRotation(0);
    setShowEndSummary(false);
    setEndReps(0);
    setEndIsClean(false);
    setGameState(GameState.OBSERVATION);

    setTimeout(() => {
      setGameState(GameState.RETENTION);
      setTimeout(() => {
        if (levelConfig.rotationDegrees) setRotation(levelConfig.rotationDegrees);
        setGameState(GameState.ACTION);
      }, 800);
    }, levelConfig.flashSpeed);
  }, [internalLevel]);

  useEffect(() => {
    if (!isActive) {
      setInternalLevel(1);
      setGameState(GameState.IDLE);
      setTargetNodes([]);
      setDecoyNodes([]);
      setSelectedNodes([]);
      setRotation(0);
      setEndReps(0);
      setShowEndSummary(false);
      setEndIsClean(false);
      hasInitialized.current = false;
    }
  }, [isActive]);

  const startNewGame = () => {
    hasInitialized.current = true;
    setInternalLevel(1);
    setEndReps(0);
    setShowEndSummary(false);
    setEndIsClean(false);
    generateGame(1);
  };

  const handleNodeClick = (index: number) => {
    if (gameState !== GameState.ACTION || selectedNodes.includes(index)) return;
    const newSelection = [...selectedNodes, index];
    setSelectedNodes(newSelection);
    
    if (!targetNodes.includes(index)) { 
      const reps = Math.max(0, internalLevel - 1);
      setEndReps(reps);
      setEndIsClean(false);
      setShowEndSummary(false);
      setGameState(GameState.FAILURE); 
      return; 
    }
    
    if (newSelection.length === targetNodes.length) {
      setGameState(GameState.SUCCESS);
      setTimeout(() => {
        if (internalLevel < 10) {
          const nextLevel = internalLevel + 1;
          setInternalLevel(nextLevel);
          hasInitialized.current = true;
          generateGame(nextLevel);
        } else {
          setEndReps(10);
          setEndIsClean(true);
          setShowEndSummary(false);
          setGameState(GameState.FINISHED);
        }
      }, 1000);
    }
  };

  const handleContinueFromReveal = () => {
    setShowEndSummary(true);
    // Delay completion callback slightly so summary screen paints first.
    setTimeout(() => onComplete(endReps, endIsClean), 120);
  };

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const nodeBaseColor = isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-200/50 border-slate-300';
  const isEndState = gameState === GameState.FINISHED || gameState === GameState.FAILURE;
  const isRevealPhase = isEndState && !showEndSummary;

  useEffect(() => {
    // Keep feed locked while "correct grid" reveal is visible.
    if (isRevealPhase) {
      onLockScroll?.(false);
    } else {
      onLockScroll?.(true);
    }
  }, [isRevealPhase, onLockScroll]);

  return (
    <View className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {(gameState === GameState.IDLE && !hasInitialized.current) ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="items-center z-20 px-6">
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-cyan-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Zap color="#06b6d4" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-2 uppercase ${textColorClass}`}>Pulse Pattern</Text>
            <Pressable onPress={() => setShowInfo(true)} className="mb-2 self-center">
              <Info size={20} color={isDark ? 'rgba(255,255,255,0.5)' : '#64748b'} />
            </Pressable>
            <Text className={`${subTextColorClass} text-xs uppercase tracking-[0.2em] mb-10 text-center max-w-[240px]`}>Memorize the blue nodes. Re-power the circuit.</Text>
            <Pressable onPress={startNewGame} className="bg-cyan-500 px-10 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">START NODE</Text>
            </Pressable>
          </MotiView>
        ) : (
          <MotiView key="game" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 w-full items-center justify-center">
            <AnimatePresence exitBeforeEnter>
              {showEndSummary ? (
                <MotiView key="summary" from={{ opacity: 0, translateY: 10 }} animate={{ opacity: 1, translateY: 0 }} exit={{ opacity: 0 }} className="items-center justify-center px-6">
                  <View className={`w-16 h-16 rounded-full items-center justify-center mb-6 border ${gameState === GameState.FINISHED ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'}`}>
                    {gameState === GameState.FINISHED ? <Zap color="#10b981" /> : <AlertTriangle color="#f43f5e" />}
                  </View>
                  <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter text-center ${textColorClass}`}>
                    Total reps logged
                  </Text>
                  <Text variant="mono" className="text-emerald-400 text-2xl tracking-widest uppercase mb-10">
                    {endReps} reps logged
                  </Text>

                  <View className="items-center gap-2 opacity-40">
                    <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-[0.4em]`}>Scroll to continue</Text>
                    <ChevronDown color={isDark ? "#94a3b8" : "#64748b"} size={20} />
                  </View>
                </MotiView>
              ) : (
                <MotiView key="board" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full items-center">
                  <View style={{ marginTop: insets.top + 80 }} className="mb-6 items-center">
                    <View className={`px-5 py-2 ${isDark ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-white border-cyan-100'} rounded-full flex-row items-center gap-2 border`}>
                       <Zap size={14} color="#06b6d4" fill="#06b6d4" />
                       <Text variant="mono" weight="bold" className="text-cyan-500 text-[11px] tracking-[0.2em]">LVL {internalLevel}</Text>
                    </View>
                  </View>

                  <View style={{ width: GRID_MAX_WIDTH, height: GRID_MAX_WIDTH }} className="relative mb-10">
                    <MotiView 
                      animate={{ rotate: `${rotation}deg` }}
                      transition={{ type: 'spring', damping: 15 }}
                      style={[styles.grid, { gridTemplateColumns: `repeat(${config.gridSize}, 1fr)` } as any]}
                      className="w-full h-full gap-2"
                    >
                      {Array.from({ length: totalNodes }).map((_, i) => {
                        const isSelected = selectedNodes.includes(i);
                        const isTarget = targetNodes.includes(i);
                        const isDecoy = decoyNodes.includes(i);
                        const isObservation = gameState === GameState.OBSERVATION;
                        const isReveal = isRevealPhase;
                        
                        let colorClass = nodeBaseColor;
                        if (isReveal && isTarget) colorClass = 'bg-cyan-500 border-cyan-300';
                        else if (isReveal && gameState === GameState.FAILURE && isSelected && !isTarget) colorClass = 'bg-rose-600 border-rose-400';
                        else if (isSelected && isTarget) colorClass = 'bg-cyan-500 border-cyan-300';
                        else if (isObservation && isTarget) colorClass = 'bg-cyan-400 border-cyan-300';
                        else if (isObservation && isDecoy) colorClass = 'bg-rose-500 border-rose-400';
                        else if (isSelected && !isTarget) colorClass = 'bg-rose-600 border-rose-400';

                        return (
                          <Pressable 
                            key={i} 
                            onPress={() => handleNodeClick(i)} 
                            style={{ 
                              width: (GRID_MAX_WIDTH - (config.gridSize - 1) * 8) / config.gridSize,
                              height: (GRID_MAX_WIDTH - (config.gridSize - 1) * 8) / config.gridSize
                            }}
                            className={`rounded-lg border transition-all duration-300 ${colorClass}`} 
                          />
                        );
                      })}
                    </MotiView>
                    
                    <AnimatePresence>
                      {gameState === GameState.SUCCESS && (
                        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`absolute inset-0 ${isDark ? 'bg-cyan-950/90' : 'bg-cyan-50/90'} items-center justify-center z-20 rounded-[20px]`}>
                          <CheckCircle2 color="#06b6d4" size={48} className="mb-4" />
                          <Text weight="black" className={`text-sm uppercase tracking-widest italic ${isDark ? 'text-cyan-100' : 'text-cyan-900'}`}>Node Verified</Text>
                        </MotiView>
                      )}
                    </AnimatePresence>
                  </View>
                  {isRevealPhase ? (
                    <View className="items-center">
                      <Text weight="bold" className={`${subTextColorClass} text-[11px] uppercase tracking-[0.35em] mb-4`}>
                        Correct grid shown
                      </Text>
                      <Pressable
                        onPress={handleContinueFromReveal}
                        className="bg-cyan-500 px-8 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl active:scale-95"
                      >
                        <Text weight="black" className="text-white uppercase tracking-wider">Continue</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text weight="bold" className={`${subTextColorClass} text-[11px] uppercase tracking-[0.4em]`}>
                      {gameState === GameState.OBSERVATION ? "Observe Path" : gameState === GameState.ACTION ? "Reconstruct" : "Neural Lock..."}
                    </Text>
                  )}
                </MotiView>
              )}
            </AnimatePresence>
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
                A grid of nodes appears. Some will light up blue — memorize which ones.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed mb-2">
                After the flash, the grid goes dark. Tap the nodes that were highlighted to re-power the circuit.
              </Text>
              <Text className="text-slate-400 text-sm leading-relaxed">
                Each level adds more nodes to remember. A wrong tap ends the round.
              </Text>
              <Pressable onPress={() => setShowInfo(false)} className="mt-6 bg-cyan-500/20 border border-cyan-500/40 py-3 rounded-2xl items-center">
                <Text weight="black" className="text-cyan-400 uppercase text-sm tracking-widest">Got It</Text>
              </Pressable>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </View>
  );
}

export default React.memo(PulsePatternGame);

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
});
