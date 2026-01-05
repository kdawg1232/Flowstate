import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Dimensions, TextInput, Modal, Alert } from 'react-native';
import { Plus, X, Check, Lock, AlertCircle, Flame, Trash2 } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Text } from '../ui/Text';
import type { Habit, UserStats } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  stats: UserStats;
  onUpdateStats: (stats: UserStats) => void;
  theme: 'light' | 'dark';
}

const COLORS = [
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 48 - 24) / 3; // 48 padding, 24 gap

export function HabitsScreen({ stats, onUpdateStats, theme }: Props) {
  const habits = stats.habits || [];
  const isSealed = stats.isDaySealed || false;
  
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  
  const [holdingHabitId, setHoldingHabitId] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  
  const [isHoldingSeal, setIsHoldingSeal] = useState(false);
  const [sealHoldProgress, setSealHoldProgress] = useState(0);
  
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();

  const isDark = theme === 'dark';
  const activeTextColor = isDark ? 'text-white' : 'text-slate-900';
  const cardBg = isDark ? 'bg-[#121214]' : 'bg-white';
  const borderColor = isDark ? 'border-white/5' : 'border-slate-200';
  const bgClass = isDark ? 'bg-[#08080a]' : 'bg-slate-50';

  const allDoneToday = habits.length > 0 && habits.every(h => h.completedToday);

  const calendarDays = useMemo(() => {
    const days = [];
    const history = stats.habitHistory || {};
    const sealed = stats.sealedDays || {};

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const isToday = i === 0;
      
      let status: 'success' | 'fail' | 'current' = 'fail';
      
      if (isToday) {
        status = 'current';
      } else {
        // A day is a success if it was sealed OR if any habits were completed
        const wasSealed = sealed[dateStr];
        const habitsDone = history[dateStr]?.length > 0;
        status = (wasSealed || habitsDone) ? 'success' : 'fail';
      }

      days.push({ day: date.getDate(), isToday, status, dateStr });
    }
    return days;
  }, [stats.habitHistory, stats.sealedDays]);

  const startHolding = (id: string, isCompleted: boolean) => {
    if (isSealed) return;
    setHoldingHabitId(id);
    setHoldProgress(0);
    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / 1500) * 100); // 1.5s for RN feel
      setHoldProgress(progress);
      if (progress >= 100) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        if (isCompleted) {
          uncompleteHabit(id);
        } else {
          completeHabit(id);
        }
        setHoldingHabitId(null);
        setHoldProgress(0);
      }
    }, 16);
  };

  const stopHolding = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setHoldingHabitId(null);
    setHoldProgress(0);
  };

  const startHoldingSeal = () => {
    setIsHoldingSeal(true);
    setSealHoldProgress(0);
    const startTime = Date.now();
    sealTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setSealHoldProgress(progress);
      if (progress >= 100) {
        if (sealTimerRef.current) clearInterval(sealTimerRef.current);
        const today = new Date().toISOString().split('T')[0];
        const newIsSealed = !isSealed;
        
        onUpdateStats({ 
          ...stats, 
          isDaySealed: newIsSealed,
          sealedDays: {
            ...stats.sealedDays,
            [today]: newIsSealed
          }
        });
        setIsHoldingSeal(false);
        setSealHoldProgress(0);
      }
    }, 16);
  };

  const stopHoldingSeal = () => {
    if (sealTimerRef.current) clearInterval(sealTimerRef.current);
    setIsHoldingSeal(false);
    setSealHoldProgress(0);
  };

  const completeHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newHabits = habits.map(h => 
      h.id === id ? { ...h, completedToday: true, lastCompletedDate: today, streak: h.streak + 1 } : h
    );
    
    // Update habit history
    const currentDayHistory = stats.habitHistory?.[today] || [];
    const newHabitHistory = {
      ...stats.habitHistory,
      [today]: [...new Set([...currentDayHistory, id])]
    };

    onUpdateStats({ 
      ...stats, 
      habits: newHabits,
      habitHistory: newHabitHistory
    });
  };

  const uncompleteHabit = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const newHabits = habits.map(h => 
      h.id === id ? { ...h, completedToday: false, streak: Math.max(0, h.streak - 1) } : h
    );
    
    // Update habit history by removing this ID
    const currentDayHistory = stats.habitHistory?.[today] || [];
    const newHabitHistory = {
      ...stats.habitHistory,
      [today]: currentDayHistory.filter(habitId => habitId !== id)
    };

    onUpdateStats({ 
      ...stats, 
      habits: newHabits,
      habitHistory: newHabitHistory
    });
  };

  const addHabit = () => {
    if (!newTitle.trim()) return;
    const newHabit: Habit = {
      id: Math.random().toString(36).substring(2, 11),
      title: newTitle.trim().toUpperCase(),
      completedToday: false,
      lastCompletedDate: null,
      streak: 0,
      color: selectedColor
    };
    onUpdateStats({ ...stats, habits: [...habits, newHabit] });
    setNewTitle('');
    setIsAdding(false);
  };

  const deleteHabit = (id: string) => {
    onUpdateStats({ ...stats, habits: habits.filter(h => h.id !== id) });
  };

  return (
    <View className={`flex-1 ${bgClass}`}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ padding: 24, paddingTop: insets.top + 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between mb-8">
           <Text weight="black" className={`text-3xl italic tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'} uppercase`}>Core Habits</Text>
           <Pressable 
             onPress={() => setIsAdding(true)}
             className={`${cardBg} p-3 rounded-2xl border ${borderColor} active:scale-95`}
           >
             <Plus size={20} color="#06b6d4" />
           </Pressable>
        </View>

        <View className="mb-8 border-y border-white/5 py-6">
          <Text weight="black" className="text-[10px] uppercase tracking-[0.3em] text-slate-600 mb-5 px-1">Neural History</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 px-1">
            {calendarDays.map((day, idx) => (
              <View key={idx} className="items-center gap-2 mr-4">
                <View className={`w-12 h-12 rounded-full border items-center justify-center ${
                  day.isToday 
                    ? (allDoneToday ? 'border-emerald-500 bg-emerald-500/10' : 'border-cyan-500 bg-cyan-500/10') 
                    : day.status === 'success' ? 'border-emerald-500/20' : 'border-rose-500/20'
                }`}>
                  {day.isToday ? (
                    allDoneToday ? <Check size={16} color="#34d399" strokeWidth={3} /> : <Text weight="black" className="text-[12px] text-cyan-400">S</Text>
                  ) : (
                    day.status === 'success' ? <Check size={14} color="#10b98166" strokeWidth={3} /> : <X size={14} color="#ef444466" strokeWidth={3} />
                  )}
                </View>
                <Text weight="black" className={`text-[9px] ${day.isToday ? 'text-white' : 'text-slate-700'}`}>{day.day}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className="flex-row flex-wrap gap-3 mb-10">
          {habits.map((habit) => {
            const isHoldingThis = holdingHabitId === habit.id;
            return (
              <Pressable
                key={habit.id}
                onPressIn={() => startHolding(habit.id, habit.completedToday)}
                onPressOut={stopHolding}
                style={{ 
                  width: COLUMN_WIDTH,
                  height: COLUMN_WIDTH,
                  backgroundColor: habit.completedToday ? habit.color : (isDark ? '#121214' : '#ffffff'),
                  borderColor: habit.completedToday ? habit.color : (isHoldingThis ? habit.color : habit.color + '40'),
                  borderWidth: 2,
                  borderRadius: 20,
                }}
                className="relative overflow-hidden items-center justify-center p-3 shadow-sm"
              >
                {/* Hold Progress Fill */}
                {isHoldingThis && (
                  <MotiView 
                    from={{ height: '0%' }}
                    animate={{ height: `${holdProgress}%` }}
                    transition={{ type: 'timing', duration: 0 }}
                    style={{ 
                      position: 'absolute', 
                      bottom: 0, 
                      left: 0, 
                      right: 0, 
                      backgroundColor: habit.completedToday ? 'rgba(0,0,0,0.4)' : habit.color, 
                      opacity: 0.8 
                    }}
                  />
                )}

                {/* Icons Overlay */}
                <View className="absolute top-2 left-2 right-2 flex-row justify-between items-center z-20">
                  <View className="w-4 h-4 items-center justify-center">
                    {habit.completedToday && <Check size={12} color="white" strokeWidth={5} />}
                  </View>
                  
                  {!isSealed && (
                    <Pressable 
                      onPress={() => deleteHabit(habit.id)}
                      className="p-1 opacity-40 active:opacity-100"
                    >
                      <Trash2 size={14} color={habit.completedToday ? "white" : "#64748b"} />
                    </Pressable>
                  )}
                </View>

                <Text 
                  weight="black" 
                  className={`text-[10px] uppercase text-center leading-tight tracking-wider px-1 z-10 ${habit.completedToday ? 'text-white' : activeTextColor}`}
                >
                  {habit.title}
                </Text>

                <View className="absolute bottom-3 left-3 right-3 flex-row justify-between items-center z-10">
                  <View 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: habit.completedToday ? '#ffffff' : habit.color,
                      shadowColor: habit.color,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: habit.completedToday ? 0 : 1,
                      shadowRadius: 5,
                      elevation: habit.completedToday ? 0 : 5
                    }} 
                  />
                  <View className="flex-row items-center gap-0.5">
                     <Flame size={10} color={habit.completedToday ? "white" : (habit.streak > 0 ? "#f97316" : "#334155")} />
                     <Text weight="black" variant="mono" className={`text-[8px] ${habit.completedToday ? 'text-white' : 'text-slate-600'}`}>
                       {habit.streak}
                     </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
          
          {habits.length === 0 && (
            <View className="w-full py-12 items-center justify-center opacity-30">
              <AlertCircle size={32} color={isDark ? "white" : "black"} className="mb-3" />
              <Text weight="black" className="text-[10px] uppercase tracking-widest text-center">Protocol Stream Empty</Text>
            </View>
          )}
        </View>

        <View className="mb-12 items-center">
          <Pressable 
            onPressIn={startHoldingSeal}
            onPressOut={stopHoldingSeal}
            className={`w-3/4 py-5 rounded-3xl relative overflow-hidden flex-row items-center justify-center gap-3 ${
              isSealed ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-[#121214] border border-white/5 shadow-2xl'
            }`}
          >
            {isHoldingSeal && (
               <MotiView 
                 from={{ width: '0%' }}
                 animate={{ width: `${sealHoldProgress}%` }}
                 transition={{ type: 'timing', duration: 0 }}
                 className="absolute left-0 top-0 bottom-0 bg-white/5" 
               />
            )}
            <View className={`p-1.5 rounded-full ${isSealed ? 'bg-emerald-500' : 'bg-slate-800'}`}>
              {isSealed ? <Check size={12} color="black" strokeWidth={4} /> : <Lock size={12} color="#64748b" strokeWidth={3} />}
            </View>
            <Text weight="black" className={`text-[11px] uppercase tracking-[0.2em] ${isSealed ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isSealed ? 'DAY SEALED' : 'SEAL THE DAY'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal visible={isAdding} transparent animationType="fade">
        <View className="flex-1 bg-black/95 justify-center items-center p-6">
          <MotiView 
            from={{ opacity: 0, scale: 0.9, translateY: 20 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            className={`${cardBg} w-full max-w-[340px] p-8 rounded-[3rem] border border-white/5 shadow-2xl`}
          >
            <Text weight="black" className={`text-3xl italic uppercase tracking-tighter mb-8 ${activeTextColor}`}>Add Protocol</Text>
            
            <View className="mb-8">
              <Text weight="black" className="text-[10px] text-slate-500 uppercase tracking-widest mb-3 ml-1">Label</Text>
              <TextInput 
                autoFocus 
                value={newTitle} 
                onChangeText={setNewTitle} 
                placeholder="E.G. MEDITATION" 
                placeholderTextColor={isDark ? "#1e293b" : "#cbd5e1"}
                className={`w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-sm font-black text-white uppercase tracking-wider outline-none ${newTitle ? 'border-cyan-500' : ''}`}
              />
            </View>

            <View className="mb-10">
              <Text weight="black" className="text-[10px] text-slate-500 uppercase tracking-widest mb-4 ml-1">Color Identity</Text>
              <View className="flex-row justify-between items-center px-1">
                {COLORS.map((c) => (
                  <Pressable 
                    key={c} 
                    onPress={() => setSelectedColor(c)} 
                    style={{ 
                      backgroundColor: c,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      borderWidth: selectedColor === c ? 3 : 0,
                      borderColor: 'white',
                      transform: [{ scale: selectedColor === c ? 1.2 : 1 }],
                      shadowColor: c,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: selectedColor === c ? 0.8 : 0,
                      shadowRadius: 10,
                      elevation: selectedColor === c ? 10 : 0
                    }} 
                  />
                ))}
              </View>
            </View>

            <View className="flex-row gap-4">
              <Pressable 
                onPress={() => setIsAdding(false)} 
                className="flex-1 py-5 bg-slate-900 rounded-2xl items-center"
              >
                <Text weight="black" className="text-slate-500 uppercase text-[10px] tracking-widest">Abort</Text>
              </Pressable>
              <Pressable 
                onPress={addHabit}
                className="flex-1 py-5 bg-cyan-500 rounded-2xl items-center shadow-[0_0_20px_rgba(6,182,212,0.4)]"
              >
                <Text weight="black" className="text-black uppercase text-[10px] tracking-widest">Initialize</Text>
              </Pressable>
            </View>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}
