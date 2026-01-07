import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { Check, ArrowLeft } from 'lucide-react-native';
import { Text } from '../../ui/Text';

interface Props {
  onNext: () => void;
  onBack: () => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
}

const Step2Quiz: React.FC<Props> = ({ onNext, onBack, selectedTags, toggleTag }) => {
  const options = [
    "I doom-scroll for 1+ hours before bed.",
    "I open apps unconsciously (muscle memory).",
    "My attention span feels shorter than it used to.",
    "I feel physically sluggish after looking at my phone.",
    "I struggle to finish tasks without notifications."
  ];

  return (
    <View className="flex-1 px-6 bg-[#0a0a0c] pt-12">
      <Pressable 
        onPress={onBack}
        className="absolute top-12 left-6 p-2 z-50"
      >
        <ArrowLeft size={24} color="#64748b" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="mt-12 mb-2">
          <Text weight="black" className="text-3xl italic tracking-tighter uppercase text-white">
            Neural Calibration
          </Text>
        </View>
        <Text weight="bold" className="text-slate-500 text-[10px] uppercase tracking-[0.3em] mb-10">
          Tap all that apply to your daily routine.
        </Text>

        <View className="gap-3 mb-10">
          {options.map((opt, i) => {
            const isSelected = selectedTags.includes(opt);
            return (
              <Pressable
                key={i}
                onPress={() => toggleTag(opt)}
                className={`w-full p-5 rounded-2xl border flex-row items-center gap-4 transition-all ${
                  isSelected 
                    ? 'bg-emerald-500/10 border-emerald-500' 
                    : 'bg-white/5 border-white/5'
                } active:scale-[0.98]`}
                style={isSelected ? {
                  shadowColor: '#10b981',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.1,
                  shadowRadius: 20,
                } : undefined}
              >
                <View className={`w-5 h-5 rounded-full border items-center justify-center ${
                  isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700'
                }`}>
                  {isSelected && <Check size={12} color="black" strokeWidth={4} />}
                </View>
                <View className="flex-1">
                  <Text weight="bold" className={`text-xs leading-snug ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                    {opt}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable 
          onPress={onNext}
          disabled={selectedTags.length === 0}
          className={`w-full py-5 rounded-2xl items-center transition-all ${
            selectedTags.length > 0 
              ? 'bg-cyan-500 shadow-lg' 
              : 'bg-white/5 opacity-50'
          } active:scale-95`}
        >
          <Text weight="black" className={`text-sm uppercase tracking-widest ${
            selectedTags.length > 0 ? 'text-black' : 'text-slate-700'
          }`}>
            Analyze My Results
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
};

export default Step2Quiz;
