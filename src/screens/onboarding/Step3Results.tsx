import React from 'react';
import { View, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { AlertCircle, ChevronDown } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const Step3Results: React.FC<Props> = ({ onNext, onBack }) => (
  <View className="flex-1 items-center justify-center px-6 bg-[#0a0a0c]">
    <View className="mb-10 items-center justify-center">
      <MotiView
        animate={{ 
          translateX: [0, -2, 2, -1, 0],
        }}
        transition={{ 
          type: 'timing',
          duration: 150, 
          loop: true, 
          repeatDelay: 1200 
        }}
      >
        <AlertCircle 
          size={100} 
          color="#ef4444" 
          style={{
            shadowColor: '#ef4444',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
          }}
        />
      </MotiView>
    </View>

    <View className="max-w-[300px] mb-16">
      <Text weight="bold" className="text-slate-100 text-xl leading-relaxed italic text-center">
        Your brain’s reward pathways have been hacked by algorithms designed to keep you passive.
      </Text>
    </View>

    <Pressable 
      onPress={onNext}
      className="items-center gap-3"
    >
      <Text weight="black" className="text-[10px] uppercase tracking-[0.4em] text-slate-500 active:text-[#06b6d4]">
        See The Symptoms
      </Text>
      <MotiView
        animate={{ translateY: [0, 5, 0] }}
        transition={{ 
          type: 'timing',
          duration: 1500,
          loop: true 
        }}
      >
        <ChevronDown color="#475569" size={24} />
      </MotiView>
    </Pressable>
  </View>
);

export default Step3Results;
