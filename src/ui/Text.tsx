import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

type Props = RNTextProps & {
  variant?: 'sans' | 'mono';
  weight?: 'regular' | 'semibold' | 'bold' | 'extrabold' | 'black' | 'monoMedium';
};

const fontMap: Record<NonNullable<Props['weight']>, string> = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  black: 'Inter_900Black',
  monoMedium: 'JetBrainsMono_500Medium',
};

export function Text({ variant = 'sans', weight, style, ...rest }: Props) {
  const resolvedWeight: Props['weight'] =
    weight ?? (variant === 'mono' ? 'monoMedium' : 'regular');

  return <RNText {...rest} style={[{ fontFamily: fontMap[resolvedWeight] }, style]} />;
}

