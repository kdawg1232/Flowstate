import React from 'react';
import { View, Pressable } from 'react-native';
import { MotiView } from 'moti';
import { Brain, ArrowLeft } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const Step4Vision: React.FC<Props> = ({ onNext, onBack }) => (
  <View className="flex-1 items-center justify-center px-6 bg-[#0a0a0c] relative">
    {/* Back Button */}
    <Pressable 
      onPress={onBack}
      className="absolute top-12 left-6 p-2 z-[120]"
    >
      <ArrowLeft size={24} color="#64748b" />
    </Pressable>

    {/* Centered Headline */}
    <View className="mb-8 items-center">
      <Text weight="black" className="text-3xl italic tracking-tighter uppercase leading-tight text-white text-center">
        The symptom is{"\n"}
        <Text weight="black" className="text-[#ef4444]" style={{ shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15 }}>
          "Brain Decay."
        </Text>
      </Text>
    </View>

    {/* Visual Representation of Neural Decay */}
    <View className="relative mb-10 h-64 w-full items-center justify-center">
      {/* Glitching/Leaking Brain Core */}
      <MotiView
        animate={{ 
          opacity: [1, 0.7, 0.9, 0.6, 1],
          translateX: [0, -1, 1, -1, 0],
        }}
        transition={{ 
          type: 'timing',
          duration: 150, 
          loop: true, 
          repeatDelay: 1500 
        }}
        className="relative z-10"
      >
        <Brain 
          size={110} 
          strokeWidth={1.5} 
          color="#e2e8f0"
          style={{
            shadowColor: '#ef4444',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.7,
            shadowRadius: 25,
          }}
        />
      </MotiView>

      {/* Consumption Leakage / Red Particles */}
      {[...Array(8)].map((_, i) => (
        <MotiView
          key={i}
          from={{ opacity: 0, scale: 0, translateX: 0, translateY: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            translateX: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 150],
            translateY: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 150],
            scale: [0, 1.2, 0]
          }}
          transition={{ 
            type: 'timing',
            duration: 2500, 
            loop: true, 
            delay: i * 300,
          }}
          className="absolute w-1.5 h-1.5 rounded-full bg-[#ef4444]"
          style={{
            shadowColor: '#ef4444',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 8,
          }}
        />
      ))}

      <View className="mt-8">
        <Text weight="black" className="text-[10px] uppercase tracking-[0.4em] text-rose-500 text-center">
          Neural Leakage Detected
        </Text>
      </View>
    </View>

    {/* Combined & Centered Text Content */}
    <View className="max-w-[320px] mb-12 px-2">
      <Text weight="bold" className="text-white text-base leading-relaxed italic text-center">
        When consumption exceeds creation, your mental sharpness and physical willpower begin to decay. 
        Flowstate is designed to flip the script. 
        Stop consuming and start strengthening.
      </Text>
    </View>

    {/* Action Button */}
    <Pressable 
      onPress={onNext}
      className="w-full py-5 bg-cyan-500 rounded-2xl items-center shadow-lg active:scale-95"
      style={{
        shadowColor: '#06b6d4',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 35,
      }}
    >
      <Text weight="black" className="text-black text-sm uppercase tracking-widest">
        How we flip the script
      </Text>
    </Pressable>
  </View>
);

export default Step4Vision;
