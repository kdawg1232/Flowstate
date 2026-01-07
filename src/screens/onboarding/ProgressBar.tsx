import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';

interface ProgressBarProps {
  progress: number; // 0 to 1
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <View className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
      <MotiView 
        animate={{ width: `${progress * 100}%` }}
        transition={{ type: 'timing', duration: 500 }}
        className="h-full bg-cyan-500 rounded-full"
      />
    </View>
  );
};
