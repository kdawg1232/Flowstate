import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { AlertCircle, ArrowLeft, Check, Lock, Zap, Shield } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const MILESTONES = [
  { val: 250, label: "The Focus Node", perk: "10 mins/hr of access", icon: Zap },
  { val: 500, label: "Sustained Momentum", perk: "20 mins/hr of access", icon: Zap },
  { val: 750, label: "High-Performance", perk: "30 mins/hr of access", icon: Zap },
  { val: 1000, label: "Total Calibration", perk: "Unlimited Protocol Access", icon: Shield }
];

const Step5Solution: React.FC<Props> = ({ onNext, onBack }) => {
  const [visibleCount, setVisibleCount] = useState(1);

  const handleBlockClick = (index: number) => {
    if (index === visibleCount - 1 && visibleCount < MILESTONES.length) {
      setVisibleCount(prev => prev + 1);
    }
  };

  const isComplete = visibleCount === MILESTONES.length;

  return (
    <View className="flex-1 w-full bg-[#0a0a0c] px-6 pt-12">
      {/* Back button */}
      <Pressable 
        onPress={onBack}
        className="absolute top-12 left-6 p-2 z-[120]"
      >
        <ArrowLeft size={24} color="#64748b" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header section */}
        <View className="mt-12 mb-10 items-center px-2">
          <Text weight="black" className="text-2xl italic tracking-tighter uppercase leading-tight mb-3 text-white text-center">
            The New Economy:{"\n"}
            <Text weight="black" className="text-[#06b6d4]">Effort = Access.</Text>
          </Text>
          <Text weight="bold" className="text-slate-500 text-[9px] uppercase tracking-[0.3em] max-w-[280px] leading-relaxed text-center">
            The gatekeeper between you and mindless scrolling.
          </Text>
        </View>

        {/* Milestone Blocks */}
        <View className="gap-3 mb-8">
          <AnimatePresence>
            {MILESTONES.slice(0, visibleCount).map((m, i) => {
              const isLastVisible = i === visibleCount - 1;
              const isFullyUnlocked = i < visibleCount - 1 || isComplete;
              
              return (
                <MotiView
                  key={i}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: 'timing', duration: 300 }}
                >
                  <Pressable
                    onPress={() => handleBlockClick(i)}
                    className={`w-full p-4 rounded-2xl border flex-row items-center gap-4 transition-all relative overflow-hidden ${
                      isLastVisible && !isComplete
                        ? 'bg-white/5 border-dashed border-white/20' 
                        : 'bg-[#06b6d4]/5 border-[#06b6d4]/20'
                    } active:scale-[0.98]`}
                    style={!isLastVisible || isComplete ? {
                      shadowColor: '#06b6d4',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.05,
                      shadowRadius: 20,
                    } : undefined}
                  >
                    {/* Visual indicator for current active interaction */}
                    {isLastVisible && !isComplete && (
                      <MotiView 
                        from={{ opacity: 0.05 }}
                        animate={{ opacity: 0.15 }}
                        transition={{ 
                          type: 'timing', 
                          duration: 1000, 
                          loop: true, 
                          repeatReverse: true 
                        }}
                        className="absolute inset-0 bg-cyan-400" 
                      />
                    )}

                    <View className="w-12 items-center justify-center">
                      <Text variant="mono" weight="black" className={`text-xs transition-colors ${isFullyUnlocked ? 'text-[#06b6d4]' : 'text-slate-600'}`}>
                        {m.val}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text weight="black" className={`text-[10px] uppercase tracking-widest mb-0.5 ${isFullyUnlocked ? 'text-white' : 'text-slate-500'}`}>
                        {m.label}
                      </Text>
                      <Text weight="bold" className={`text-[9px] ${isFullyUnlocked ? 'text-[#06b6d4]' : 'text-slate-700'}`}>
                        {m.perk}
                      </Text>
                    </View>

                    <View className="shrink-0">
                       {isFullyUnlocked ? <Check size={16} strokeWidth={3} color="#06b6d4" /> : <Lock size={16} color="#334155" />}
                    </View>
                  </Pressable>
                </MotiView>
              );
            })}
          </AnimatePresence>
          
          {/* Helper text to prompt clicking */}
          {!isComplete && (
            <MotiView 
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="items-center mt-2"
            >
              <Text weight="black" className="text-[8px] uppercase tracking-[0.4em] text-slate-700 text-center">
                Tap block to unlock next level
              </Text>
            </MotiView>
          )}
        </View>

        {/* Decay Warning */}
        <AnimatePresence>
          {isComplete && (
            <MotiView 
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl mb-8 flex-row items-center gap-3"
            >
               <AlertCircle size={16} color="#ef4444" className="shrink-0" />
               <View className="flex-1">
                 <Text weight="bold" className="text-[9px] text-rose-500 uppercase tracking-widest leading-relaxed">
                   <Text weight="black">Neural Decay:</Text> Lose 1 rep per minute of inactivity. Keep the current flowing.
                 </Text>
               </View>
            </MotiView>
          )}
        </AnimatePresence>

        {/* Continue Button */}
        <Pressable 
          onPress={onNext}
          disabled={!isComplete}
          className={`w-full py-5 rounded-2xl items-center transition-all ${
            isComplete 
              ? 'bg-cyan-500 shadow-lg' 
              : 'bg-white/5 opacity-20'
          } active:scale-95`}
          style={isComplete ? {
            shadowColor: '#06b6d4',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 35,
          } : undefined}
        >
          <Text weight="black" className={`text-sm uppercase tracking-widest ${isComplete ? 'text-black' : 'text-slate-800'}`}>
            See Success Stories
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

export default Step5Solution;
