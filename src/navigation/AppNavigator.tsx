import { Stack } from 'expo-router';

export function AppNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="guest" />
      <Stack.Screen name="profiles" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="new-package" />
      <Stack.Screen name="package-detail" />
      <Stack.Screen name="user-profile" />
    </Stack>
  );
}