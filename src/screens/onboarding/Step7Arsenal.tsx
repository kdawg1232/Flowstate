import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Brain, Dumbbell, Lock, BarChart3 } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const Step7Arsenal: React.FC<Props> = ({ onNext, onBack }) => (
  <View className="flex-1 px-6 bg-[#0a0a0c] pt-32">
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      <View className="mt-12 mb-10">
        <Text weight="black" className="text-3xl italic tracking-tighter uppercase text-white leading-tight">
          Your Calibration Arsenal.
        </Text>
      </View>
      
      <View className="gap-6 mb-12">
        {[
          { icon: Brain, title: "Mental Reps", desc: "10 brain calibrating games for all 6 cognitive functions" },
          { icon: Dumbbell, title: "Physical Reps", desc: "Manual-input exercises to keep your body in the circuit." },
          { icon: Lock, title: "The Gatekeeper", desc: "Hard-locks distracting apps when your 'Time Bank' hits zero." },
          { icon: BarChart3, title: "Neural Dashboard", desc: "Track your real-time processing speed and focus streaks." }
        ].map((item, i) => (
          <View key={i} className="flex-row gap-5">
            <View className="w-12 h-12 bg-white/5 rounded-2xl items-center justify-center shrink-0 border border-white/5">
              <item.icon size={20} color="#06b6d4" />
            </View>
            <View className="flex-1 justify-center">
              <Text weight="black" className="text-xs font-black uppercase tracking-widest mb-1 text-white">
                {item.title}
              </Text>
              <Text weight="bold" className="text-[10px] text-slate-500 leading-relaxed">
                {item.desc}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable 
        onPress={onNext}
        className="w-full py-5 bg-cyan-500 rounded-full items-center shadow-lg active:scale-95"
        style={{
          shadowColor: '#06b6d4',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 35,
        }}
      >
        <Text weight="black" className="text-black text-sm uppercase tracking-widest">
          Continue
        </Text>
      </Pressable>
    </ScrollView>
  </View>
);

export default Step7Arsenal;
