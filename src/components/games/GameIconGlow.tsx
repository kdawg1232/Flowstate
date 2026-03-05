import React from 'react';
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';

type Props = {
  color: string;
  glowId: string;
};

const GameIconGlow: React.FC<Props> = ({ color, glowId }) => {
  return (
    <MotiView
      animate={{ opacity: [0.32, 0.7, 0.32] }}
      transition={{
        type: 'timing',
        duration: 4200,
        loop: true,
        easing: Easing.inOut(Easing.ease),
      }}
      className="absolute"
      pointerEvents="none"
    >
      <Svg height="720" width="720" viewBox="0 0 720 720">
        <Defs>
          <RadialGradient id={glowId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.72" />
            <Stop offset="18%" stopColor={color} stopOpacity="0.48" />
            <Stop offset="38%" stopColor={color} stopOpacity="0.25" />
            <Stop offset="58%" stopColor={color} stopOpacity="0.12" />
            <Stop offset="78%" stopColor={color} stopOpacity="0.04" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="360" cy="360" r="360" fill={`url(#${glowId})`} />
      </Svg>
    </MotiView>
  );
};

export default React.memo(GameIconGlow);
