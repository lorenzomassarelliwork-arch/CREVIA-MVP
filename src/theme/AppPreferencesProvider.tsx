import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS, type ColorPalette } from './colors';

export type AppLanguage = 'it' | 'en';
export type AppThemeMode = 'automatic' | 'light' | 'dark';

type StoredPreferences = { hapticsEnabled: boolean; language: AppLanguage; themeMode: AppThemeMode };
type AppPreferencesContextValue = StoredPreferences & {
  colors: ColorPalette;
  isDark: boolean;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setThemeMode: (mode: AppThemeMode) => Promise<void>;
  triggerHaptic: () => Promise<void>;
};

const STORAGE_KEY = '@crevia/app-preferences';
const DEFAULT_PREFERENCES: StoredPreferences = { language: 'it', themeMode: 'automatic', hapticsEnabled: true };
const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: PropsWithChildren) {
  const systemColorScheme = useColorScheme();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setPreferences((current) => ({ ...current, ...(JSON.parse(raw) as Partial<StoredPreferences>) }));
    }).catch(() => undefined);
  }, []);

  const isDark = preferences.themeMode === 'dark' || (preferences.themeMode === 'automatic' && systemColorScheme === 'dark');
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  useEffect(() => { SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined); }, [colors.background]);

  const updatePreferences = useCallback((patch: Partial<StoredPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setLanguage = useCallback(async (language: AppLanguage) => updatePreferences({ language }), [updatePreferences]);
  const setThemeMode = useCallback(async (themeMode: AppThemeMode) => updatePreferences({ themeMode }), [updatePreferences]);
  const setHapticsEnabled = useCallback(async (hapticsEnabled: boolean) => updatePreferences({ hapticsEnabled }), [updatePreferences]);
  const triggerHaptic = useCallback(async () => { if (preferences.hapticsEnabled) await Haptics.selectionAsync(); }, [preferences.hapticsEnabled]);

  const value = useMemo(() => ({ ...preferences, colors, isDark, setLanguage, setThemeMode, setHapticsEnabled, triggerHaptic }), [preferences, colors, isDark, setLanguage, setThemeMode, setHapticsEnabled, triggerHaptic]);
  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) throw new Error('useAppPreferences deve essere usato dentro AppPreferencesProvider');
  return context;
}
