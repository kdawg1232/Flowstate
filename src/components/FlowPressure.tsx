import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Zap, Activity, Shield, Flame, Lock } from 'lucide-react-native';
import { MILESTONES } from '../screentime';
import { MotiView } from 'moti';

type Props = {
  dailyReps: number;
  maxDailyReps: number;
  theme: 'light' | 'dark';
};

export default function FlowPressure({ dailyReps, maxDailyReps, theme }: Props) {
  const isDark = theme === 'dark';
  const cardBg = isDark ? 'bg-slate-900/50' : 'bg-white';
  const borderColor = isDark ? 'border-slate-800' : 'border-slate-200';
  const textColor = isDark ? 'text-white' : 'text-slate-900';
  const subTextColor = isDark ? 'text-slate-500' : 'text-slate-400';

  const progress = Math.min(100, (dailyReps / 1000) * 100);

  return (
    <View className={`${cardBg} p-6 rounded-[2.5rem] border ${borderColor} shadow-sm mb-6`}>
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text weight="black" className={`text-[10px] ${subTextColor} uppercase tracking-[0.2em]`}>
            Current Flow Pressure
          </Text>
          <View className="flex-row items-baseline mt-1">
            <Text weight="black" variant="mono" className={`text-5xl ${textColor}`}>
              {Math.floor(dailyReps)}
            </Text>
            <Text weight="bold" className={`ml-2 text-[10px] ${subTextColor} uppercase tracking-widest`}>
              Reps
            </Text>
          </View>
        </View>
        <View className={`${isDark ? 'bg-slate-800' : 'bg-slate-100'} p-4 rounded-3xl`}>
          <Zap size={24} color={dailyReps > 0 ? '#06b6d4' : (isDark ? '#1e293b' : '#cbd5e1')} />
        </View>
      </View>

      {/* Progress Bar with Milestone Markers */}
      <View className="relative h-2 w-full mb-10 mt-4">
        <View className={`absolute inset-0 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-full`} />
        <MotiView
          from={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'timing', duration: 1000 }}
          style={{ height: '100%', backgroundColor: '#06b6d4', borderRadius: 999 }}
        />
        {/* Milestone Markers */}
        {MILESTONES.map((m, i) => {
          const pos = (m.reps / 1000) * 100;
          if (pos > 100) return null;
          return (
            <View 
              key={i} 
              className="absolute h-4 w-[2px] -top-1" 
              style={{ left: `${pos}%`, backgroundColor: dailyReps >= m.reps ? '#06b6d4' : (isDark ? '#334155' : '#e2e8f0') }}
            />
          );
        })}
      </View>

      <Text weight="black" className={`text-[10px] ${subTextColor} uppercase tracking-[0.2em] mb-4`}>
        Active Daily Protocols
      </Text>

      <View className="gap-3">
        {MILESTONES.slice(0, 3).map((m, i) => {
          const isUnlocked = maxDailyReps >= m.reps;
          const Icon = i === 0 ? Lock : (i === 1 ? Flame : Shield);
          
          return (
            <View key={i} className={`flex-row items-center justify-between p-4 rounded-3xl ${isDark ? 'bg-slate-950/40' : 'bg-slate-50'} border ${isUnlocked ? 'border-cyan-500/30' : borderColor}`}>
              <View className="flex-row items-center gap-4">
                <View className={`${isUnlocked ? 'bg-cyan-500/10' : (isDark ? 'bg-slate-800' : 'bg-slate-200')} p-3 rounded-2xl`}>
                  <Icon size={18} color={isUnlocked ? '#06b6d4' : (isDark ? '#475569' : '#94a3b8')} />
                </View>
                <View>
                  <Text weight="black" className={`text-[11px] uppercase tracking-wider ${isUnlocked ? textColor : subTextColor}`}>
                    {m.label} Protocol
                  </Text>
                  <Text weight="bold" className={`text-[9px] ${subTextColor}`}>
                    {m.rewardLabel} Screen Time
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text variant="mono" weight="bold" className={`text-[10px] ${isUnlocked ? 'text-cyan-500' : subTextColor}`}>
                  {isUnlocked ? Math.min(m.reps, Math.floor(maxDailyReps)) : Math.floor(dailyReps)} <Text className="text-[8px] opacity-50">/ {m.reps}</Text>
                </Text>
              </View>
            </View>
          );
        })}
        
        {/* Absolute Flow / Unlimited */}
        <View className={`flex-row items-center justify-between p-4 rounded-3xl ${isDark ? 'bg-slate-950/40' : 'bg-slate-50'} border ${maxDailyReps >= 1000 ? 'border-cyan-500/30' : borderColor}`}>
          <View className="flex-row items-center gap-4">
            <View className={`${maxDailyReps >= 1000 ? 'bg-cyan-500/10' : (isDark ? 'bg-slate-800' : 'bg-slate-200')} p-3 rounded-2xl`}>
              <Shield size={18} color={maxDailyReps >= 1000 ? '#06b6d4' : (isDark ? '#475569' : '#94a3b8')} />
            </View>
            <View>
              <Text weight="black" className={`text-[11px] uppercase tracking-wider ${maxDailyReps >= 1000 ? textColor : subTextColor}`}>
                Absolute Flow
              </Text>
              <Text weight="bold" className={`text-[9px] ${subTextColor}`}>
                Unlimited Protocol Access
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text variant="mono" weight="bold" className={`text-[10px] ${maxDailyReps >= 1000 ? 'text-cyan-500' : subTextColor}`}>
              {maxDailyReps >= 1000 ? '1000' : Math.floor(dailyReps)} <Text className="text-[8px] opacity-50">/ 1000</Text>
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-8 flex-row items-center gap-2 pt-6 border-t border-slate-800/50">
        <Activity size={14} color="#f43f5e" />
        <Text weight="black" className="text-[9px] text-rose-500 uppercase tracking-[0.1em]">
          Neural Decay Active: -1 Rep / Min
        </Text>
      </View>
    </View>
  );
}
