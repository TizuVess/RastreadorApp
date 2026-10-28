import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, we default to light until the native color scheme is available.
 */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}
