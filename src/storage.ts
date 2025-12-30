import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getString(key: string): Promise<string | null> {
  return await AsyncStorage.getItem(key);
}

export async function setString(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function getJson<T>(key: string): Promise<T | null> {
  const raw = await getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJson(key: string, value: unknown): Promise<void> {
  await setString(key, JSON.stringify(value));
}

