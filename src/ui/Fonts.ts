import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black, useFonts } from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, useFonts as useMonoFonts } from '@expo-google-fonts/jetbrains-mono';

export function useFlowstateFonts() {
  const [interLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  const [monoLoaded] = useMonoFonts({
    JetBrainsMono_500Medium,
  });

  return interLoaded && monoLoaded;
}

