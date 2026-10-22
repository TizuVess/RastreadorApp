import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/styles/globalStyles';

type TabIconProps = { color: ColorValue; size: number };

function HomeTabIcon({ color, size }: TabIconProps) {
  return <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>⌂</Text>;
}

function NewPackageTabIcon({ color, size }: TabIconProps) {
  return <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>+</Text>;
}

function ProfileTabIcon({ color, size }: TabIconProps) {
  return <Text style={{ color, fontSize: size, lineHeight: size + 4 }}>○</Text>;
}

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  if (!session) return <Redirect href="/auth" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#98A2B3',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(6, insets.bottom),
          backgroundColor: '#FFFFFF',
          borderTopColor: '#ECEDEF',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{ title: 'Inicio', tabBarIcon: HomeTabIcon }}
      />
      <Tabs.Screen
        name="packages/new"
        options={{ title: 'Nueva', tabBarIcon: NewPackageTabIcon }}
      />
      <Tabs.Screen
        name="account/index"
        options={{ title: 'Perfil', tabBarIcon: ProfileTabIcon }}
      />
    </Tabs>
  );
}
