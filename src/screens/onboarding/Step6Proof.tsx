import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Quote, Check, ArrowLeft } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const Step6Proof: React.FC<Props> = ({ onNext, onBack }) => {
  const [index, setIndex] = useState(0);
  const reviews = [
    { name: "Alex K.", sub: "Engineering Focus", text: "The math drills wake my brain up faster than coffee. Screen time is down 40%." },
    { name: "Marcus D.", sub: "Physical Gains", text: "My daily pushup count has tripled. It feels like a futuristic training program." }
  ];

  return (
    <View className="flex-1 px-6 bg-[#0a0a0c] pt-12">
      <Pressable 
        onPress={onBack}
        className="absolute top-12 left-6 p-2 z-50"
      >
        <ArrowLeft size={24} color="#64748b" />
      </Pressable>

      <View className="mt-12 mb-10">
        <Text weight="black" className="text-3xl italic tracking-tighter uppercase text-white leading-tight">
          From Scrollers to Calibrators.
        </Text>
      </View>
      
      <View className="relative h-72 mb-12">
        <AnimatePresence mode="wait">
          <MotiView
            key={index}
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'timing', duration: 400 }}
            className="absolute inset-0 bg-white/5 border border-white/10 rounded-[3rem] p-8 justify-center"
          >
            <View className="mb-6">
              <Quote size={40} color="#06b6d4" style={{ opacity: 0.2 }} />
            </View>
            <Text weight="bold" className="text-xl leading-relaxed italic mb-8 text-white">
              "{reviews[index].text}"
            </Text>
            <View className="flex-row items-center gap-4">
              <View className="w-10 h-10 bg-cyan-400/20 rounded-full items-center justify-center">
                <Check size={16} color="#06b6d4" />
              </View>
              <View>
                <Text weight="black" className="text-xs uppercase text-white tracking-widest">
                  {reviews[index].name}
                </Text>
                <Text weight="bold" className="text-[10px] text-[#06b6d4] uppercase tracking-widest">
                  {reviews[index].sub}
                </Text>
              </View>
            </View>
          </MotiView>
        </AnimatePresence>
      </View>

      <View className="flex-row justify-center gap-2 mb-12">
        {reviews.map((_, i) => (
          <Pressable 
            key={i} 
            onPress={() => setIndex(i)}
            className="p-2"
          >
            <MotiView 
              animate={{ 
                width: index === i ? 24 : 8,
                backgroundColor: index === i ? '#06b6d4' : 'rgba(255,255,255,0.1)'
              }}
              transition={{ type: 'timing', duration: 300 }}
              className="h-2 rounded-full"
            />
          </Pressable>
        ))}
      </View>

      <Pressable 
        onPress={onNext}
        className="w-full py-5 bg-cyan-500 rounded-2xl items-center shadow-lg active:scale-95"
        style={{
          shadowColor: '#06b6d4',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 35,
        }}
      >
        <Text weight="black" className="text-black text-sm uppercase tracking-widest">
          Explore The Toolbox
        </Text>
      </Pressable>
    </View>
  );
};

export default Step6Proof;
