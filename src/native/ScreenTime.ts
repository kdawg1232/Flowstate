import { NativeModules, Platform } from 'react-native';

const { ScreenTimeModule } = NativeModules;

export interface ScreenTimeInterface {
  requestAuthorization(): Promise<boolean>;
  setScreenTimeBudget(minutes: number): Promise<void>;
  selectAppsToRestrict(): Promise<string[]>;
  getUsedMinutes(): Promise<number>;
}

const dummyImplementation: ScreenTimeInterface = {
  requestAuthorization: async () => true,
  setScreenTimeBudget: async () => {},
  selectAppsToRestrict: async () => [],
  getUsedMinutes: async () => 0,
};

const ScreenTime: ScreenTimeInterface = Platform.OS === 'ios' && ScreenTimeModule 
  ? ScreenTimeModule 
  : dummyImplementation;

export default ScreenTime;
