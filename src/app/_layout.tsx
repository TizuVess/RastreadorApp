import { AppNavigator } from '@/navigation/AppNavigator';
import { ActiveProfileProvider } from '@/contexts/ActiveProfileContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <AuthProvider>
          <ActiveProfileProvider>
            <AppNavigator />
          </ActiveProfileProvider>
        </AuthProvider>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}