import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LobbyScreen } from '@/screens/LobbyScreen';
import { globalStyles } from '@/styles/globalStyles';

export default function IndexRoute() {
  const { session, loading } = useAuth();
  if (loading) {
    return <View style={[globalStyles.screen, { justifyContent: 'center' }]}><ActivityIndicator /></View>;
  }
  if (session) return <Redirect href="/profiles" />;
  return <LobbyScreen />;
}
