import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { Shield, Flame, Brain, Zap, Target, Dumbbell, BarChart3, Layers, Calculator, CheckCircle2 } from 'lucide-react-native';
import type { UserStats, Category } from '../types';
import { Text } from '../ui/Text';
import FlowPressure from '../components/FlowPressure';

type Props = {
  theme: 'light' | 'dark';
  stats: UserStats;
};

const CATEGORIES: Category[] = ['MEMORY', 'SPEED', 'LOGIC', 'FLEXIBILITY', 'MATH', 'PHYSICAL'];

const THEME_MAP: Record<Category, string> = {
  'MEMORY': '#06b6d4',
  'SPEED': '#f59e0b',
  'LOGIC': '#6366f1',
  'FLEXIBILITY': '#f43f5e',
  'MATH': '#3b82f6',
  'PHYSICAL': '#10b981'
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ProgressScreen({ theme, stats }: Props) {
  const isDark = theme === 'dark';
  const textColorClass = isDark ? 'text-white' : 'text-slate-900';
  const cardBgClass = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const subTextColorClass = isDark ? 'text-slate-500' : 'text-slate-400';

  // Progression Logic
  const level = stats.level;
  const xpRequiredForCurrentLevelStart = 5 * (level - 1) * level;
  const xpNeededToPassCurrentLevel = level * 10;
  const xpInCurrentLevel = Math.max(0, stats.xp - xpRequiredForCurrentLevelStart);
  const progressPercent = Math.min(100, (xpInCurrentLevel / xpNeededToPassCurrentLevel) * 100);

  const getStrength = (cat: Category) => {
    if (cat === 'MEMORY') return Math.min(100, (stats.gameStats.pulse?.cleanFinishes || 0) * 20);
    if (cat === 'SPEED') return Math.min(100, (stats.gameStats.signal?.cleanFinishes || 0) * 20);
    if (cat === 'LOGIC') {
      const totalClean = (stats.gameStats.keen?.cleanFinishes || 0) + 
                         (stats.gameStats.bridges?.cleanFinishes || 0);
      return Math.min(100, totalClean * 20);
    }
    if (cat === 'FLEXIBILITY') return Math.min(100, (stats.gameStats.logic_link?.cleanFinishes || 0) * 20);
    if (cat === 'MATH') return Math.min(100, (stats.gameStats.math_dash?.cleanFinishes || 0) * 20);
    if (cat === 'PHYSICAL') {
      const totalClean = (stats.gameStats.pushups?.cleanFinishes || 0) + 
                         (stats.gameStats.situps?.cleanFinishes || 0) + 
                         (stats.gameStats.planks?.cleanFinishes || 0);
      return Math.min(100, totalClean * 20);
    }
    return 0;
  };

  const activityNodes = useMemo(() => {
    return Array.from({ length: 28 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (27 - i));
      const dateStr = d.toISOString().split('T')[0];
      const reps = stats.activityHistory[dateStr] || 0;
      return { date: dateStr, reps };
    });
  }, [stats.activityHistory]);

  return (
    <ScrollView 
      className={`flex-1 ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}
      contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="mb-8 mt-16 flex-row items-center justify-between">
        <View>
           <Text weight="black" className={`text-3xl italic tracking-tighter ${textColorClass}`}>METRICS</Text>
           <Text weight="bold" variant="mono" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>
             Flow Level: {level}
           </Text>
        </View>
        <View className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} p-3 rounded-2xl border`}>
           <BarChart3 size={20} color="#06b6d4" />
        </View>
      </View>

      <FlowPressure 
        dailyReps={stats.dailyReps} 
        maxDailyReps={stats.maxDailyReps || 0} 
        theme={theme} 
      />

      <View className="flex-row gap-4 mb-6">
        <View className={`flex-1 ${cardBgClass} p-5 rounded-3xl relative overflow-hidden border`}>
          <Target size={32} color="#06b6d4" style={{ position: 'absolute', right: -8, top: -8, opacity: 0.1 }} />
          <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>Total Reps</Text>
          <Text weight="black" variant="mono" className={`text-3xl mt-1 ${textColorClass}`}>{stats.totalReps}</Text>
        </View>
        <View className={`flex-1 ${cardBgClass} p-5 rounded-3xl relative overflow-hidden border`}>
          <CheckCircle2 size={32} color="#10b981" style={{ position: 'absolute', right: -8, top: -8, opacity: 0.1 }} />
          <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>Daily Reps</Text>
          <Text weight="black" variant="mono" className={`text-3xl mt-1 ${textColorClass}`}>{stats.dailyReps}</Text>
        </View>
      </View>

      <View className={`${cardBgClass} p-6 rounded-3xl mb-8 relative border`}>
         <View className="flex-row justify-between items-end mb-3">
           <View>
             <Text weight="bold" className={`${subTextColorClass} text-[10px] uppercase tracking-widest`}>Neural Evolution</Text>
             <Text weight="black" className={`text-xl tracking-tight ${textColorClass}`}>LEVEL {level}</Text>
           </View>
           <Text variant="mono" className={`text-xs ${subTextColorClass}`}>
             {xpInCurrentLevel} / {xpNeededToPassCurrentLevel} <Text weight="bold" className="text-[10px] opacity-50 ml-1 uppercase">XP</Text>
           </Text>
         </View>
         <View className={`w-full h-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'} rounded-full overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <MotiView 
              from={{ width: '0%' }} 
              animate={{ width: `${progressPercent}%` }} 
              transition={{ type: 'timing', duration: 800 }}
              style={{ 
                height: '100%', 
                backgroundColor: '#06b6d4',
                shadowColor: '#06b6d4', 
                shadowOpacity: 0.5, 
                shadowRadius: 10 
              }}
            />
         </View>
      </View>

      <View className={`${cardBgClass} p-6 rounded-3xl mb-8 border`}>
        <View className="flex-row justify-between items-center mb-6">
          <Text weight="black" className={`text-[10px] ${subTextColorClass} uppercase tracking-[0.3em]`}>Activity Matrix</Text>
          <View className="flex-row gap-3 items-center">
            <View className="flex-row gap-1 items-center">
              <View className="w-1.5 h-1.5 rounded-sm bg-emerald-500/30" />
              <Text weight="bold" className={`text-[7px] ${subTextColorClass} uppercase`}>100+</Text>
            </View>
            <View className="flex-row gap-1 items-center">
              <View className="w-1.5 h-1.5 rounded-sm bg-emerald-500/60" />
              <Text weight="bold" className={`text-[7px] ${subTextColorClass} uppercase`}>500+</Text>
            </View>
            <View className="flex-row gap-1 items-center">
              <View className="w-1.5 h-1.5 rounded-sm bg-emerald-500" />
              <Text weight="bold" className={`text-[7px] ${subTextColorClass} uppercase`}>1000+</Text>
            </View>
          </View>
        </View>
        <View className="flex-row flex-wrap gap-2 justify-center">
          {activityNodes.map((node, i) => (
            <View 
              key={i} 
              style={{ width: (SCREEN_WIDTH - 88) / 7 - 4, height: (SCREEN_WIDTH - 88) / 7 - 4 }}
              className={`rounded-[4px] ${
                node.reps >= 1000 
                ? 'bg-emerald-500 shadow-sm' 
                : node.reps >= 500 
                ? 'bg-emerald-500/60' 
                : node.reps >= 100 
                ? 'bg-emerald-500/30' 
                : (isDark ? 'bg-slate-800' : 'bg-slate-100')
              }`}
            />
          ))}
        </View>
        <View className="flex-row justify-between mt-3 px-1">
          <Text weight="bold" className={`text-[8px] ${subTextColorClass} uppercase`}>28 Days Ago</Text>
          <Text weight="bold" className={`text-[8px] ${subTextColorClass} uppercase`}>Today</Text>
        </View>
      </View>

      <View className={`${cardBgClass} p-6 rounded-[2.5rem] mb-8 border shadow-sm`}>
        <Text weight="black" className={`text-[10px] ${subTextColorClass} uppercase tracking-[0.3em] mb-8 text-center`}>Neural Calibration</Text>
        <View className="gap-6">
          {CATEGORIES.map(cat => {
            const strength = getStrength(cat);
            return (
              <View key={cat} className="gap-2">
                <View className="flex-row justify-between items-end px-1">
                  <Text weight="bold" className={`text-[9px] ${isDark ? 'text-slate-300' : 'text-slate-600'} tracking-widest uppercase`}>{cat}</Text>
                  <Text variant="mono" className={`text-[9px] ${subTextColorClass}`}>{strength}%</Text>
                </View>
                <View className={`w-full h-1.5 ${isDark ? 'bg-slate-950' : 'bg-slate-100'} rounded-full overflow-hidden`}>
                  <MotiView 
                    from={{ width: '0%' }} 
                    animate={{ width: `${strength}%` }} 
                    transition={{ type: 'timing', duration: 800 }}
                    style={{ 
                      height: '100%',
                      backgroundColor: THEME_MAP[cat],
                      borderRadius: 999
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
