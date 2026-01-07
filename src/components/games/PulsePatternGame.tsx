import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { Zap, AlertTriangle, CheckCircle2, Play, ChevronDown, ArrowRight } from 'lucide-react-native';
import { GameState } from '../../types';
import { LEVELS } from '../../constants';
import { Text } from '../../ui/Text';

interface Props {
  onComplete: (level: number) => void;
  isActive: boolean;
  theme?: 'light' | 'dark';
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 300);

function PulsePatternGame({ onComplete, isActive, theme = 'dark' }: Props) {
  const [internalLevel, setInternalLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [targetNodes, setTargetNodes] = useState<number[]>([]);
  const [decoyNodes, setDecoyNodes] = useState<number[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const [rotation, setRotation] = useState(0);
  const hasInitialized = useRef(false);

  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const config = useMemo(() => LEVELS.find(l => l.id === internalLevel) || LEVELS[LEVELS.length - 1], [internalLevel]);
  const totalNodes = config.gridSize * config.gridSize;

  const generateGame = useCallback(() => {
    const indices = Array.from({ length: totalNodes }, (_, i) => i);
    const shuffled = [...indices].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, config.activeNodes);
    let decoys: number[] = config.hasDecoys ? shuffled.slice(config.activeNodes, config.activeNodes + 3) : [];
    
    setTargetNodes(targets);
    setDecoyNodes(decoys);
    setSelectedNodes([]);
    setRotation(0);
    setGameState(GameState.OBSERVATION);

    setTimeout(() => {
      setGameState(GameState.RETENTION);
      setTimeout(() => {
        if (config.rotationDegrees) setRotation(config.rotationDegrees);
        setGameState(GameState.ACTION);
      }, 800);
    }, config.flashSpeed);
  }, [config, totalNodes]);

  useEffect(() => {
    if (!isActive) {
      setGameState(GameState.IDLE);
      hasInitialized.current = false;
    }
  }, [isActive]);

  const handleNodeClick = (index: number) => {
    if (gameState !== GameState.ACTION || selectedNodes.includes(index)) return;
    const newSelection = [...selectedNodes, index];
    setSelectedNodes(newSelection);
    
    if (!targetNodes.includes(index)) { 
      setGameState(GameState.FAILURE); 
      setTimeout(() => onComplete(internalLevel - 1), 100);
      return; 
    }
    
    if (newSelection.length === targetNodes.length) {
      setGameState(GameState.SUCCESS);
      setTimeout(() => {
        if (internalLevel < 10) {
          setInternalLevel(prev => prev + 1);
          hasInitialized.current = true;
        } else {
          setGameState(GameState.FINISHED);
          setTimeout(() => onComplete(10), 100);
        }
      }, 1000);
    }
  };

  useEffect(() => {
    if (hasInitialized.current && gameState === GameState.SUCCESS) {
       const timer = setTimeout(() => {
         generateGame();
       }, 1100);
       return () => clearTimeout(timer);
    }
  }, [internalLevel, gameState, generateGame]);

  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';
  const nodeBaseColor = isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-200/50 border-slate-300';

  return (
    <View className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      <AnimatePresence exitBeforeEnter>
        {(gameState === GameState.IDLE && !hasInitialized.current) ? (
          <MotiView key="instructions" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="items-center z-20 px-6">
            <View className={`w-20 h-20 ${isDark ? 'bg-black border-white/10' : 'bg-white border-cyan-100'} rounded-3xl items-center justify-center mb-6 border`}>
              <Zap color="#06b6d4" size={40} />
            </View>
            <Text weight="black" className={`text-3xl italic tracking-tighter mb-4 uppercase ${textColorClass}`}>Pulse Pattern</Text>
            <Text className={`${subTextColorClass} text-xs uppercase tracking-[0.2em] mb-10 text-center max-w-[240px]`}>Memorize the blue nodes. Re-power the circuit.</Text>
            <Pressable onPress={() => { hasInitialized.current = true; generateGame(); }} className="bg-cyan-500 px-10 py-4 rounded-2xl flex-row items-center gap-3 shadow-xl">
              <Play color="white" size={20} fill="white" />
              <Text weight="black" className="text-white uppercase">START NODE</Text>
            </Pressable>
          </MotiView>
        ) : gameState === GameState.FINISHED || gameState === GameState.FAILURE ? (
          <MotiView key="end" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="items-center justify-center px-6">
            <View className={`w-16 h-16 rounded-full items-center justify-center mb-6 border ${gameState === GameState.FINISHED ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'}`}>
              {gameState === GameState.FINISHED ? <Zap color="#10b981" /> : <AlertTriangle color="#f43f5e" />}
            </View>
            <Text weight="black" className={`text-3xl italic mb-2 uppercase tracking-tighter ${textColorClass}`}>
              {gameState === GameState.FINISHED ? 'NEURAL SYNC COMPLETE' : 'CORE OVERLOADED'}
            </Text>
            
            <View className={`${gameState === GameState.FINISHED ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-rose-500/10 border-rose-500/20'} border px-8 py-4 rounded-3xl items-center mb-10`}>
              <Text variant="mono" className={`${gameState === GameState.FINISHED ? 'text-cyan-500' : 'text-rose-500'} text-4xl mb-1 tracking-widest`}>
                {internalLevel}
              </Text>
              <Text weight="bold" className={`${gameState === GameState.FINISHED ? 'text-cyan-500/60' : 'text-rose-500/60'} text-[10px] uppercase tracking-[0.2em]`}>
                NODES SECURED
              </Text>
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
        ) : (gameState === GameState.OBSERVATION || gameState === GameState.ACTION || gameState === GameState.RETENTION || gameState === GameState.SUCCESS) ? (
          <MotiView key="game" from={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full items-center">
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
                  
                  let colorClass = nodeBaseColor;
                  if (isSelected && isTarget) colorClass = 'bg-cyan-500 border-cyan-300';
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
            <Text weight="bold" className={`${subTextColorClass} text-[11px] uppercase tracking-[0.4em]`}>
              {gameState === GameState.OBSERVATION ? "Observe Path" : gameState === GameState.ACTION ? "Reconstruct" : "Neural Lock..."}
            </Text>
          </MotiView>
        ) : (
          <View />
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
