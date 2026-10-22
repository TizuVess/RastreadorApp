import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, globalStyles } from '@/styles/globalStyles';

export function LobbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingBottom: Math.max(42, insets.bottom + 20) }]}>
      <View style={styles.brand}>
        <View style={styles.logo}><Text style={styles.logoSymbol}>◇</Text></View>
        <Text style={styles.title}>RastreoFácil</Text>
        <Text style={styles.subtitle}>Tu centro utilitario de{ '\n' }encomiendas y paquetes</Text>
      </View>
      <View style={styles.actions}>
        <Pressable style={globalStyles.button} onPress={() => router.push('/auth')}>
          <Text style={globalStyles.buttonText}>Iniciar sesión</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push('./guest')}>
          <Text style={styles.secondaryButtonText}>Continuar como invitado</Text>
        </Pressable>
        <Text style={styles.caption}>
          ¿Aún no tienes cuenta?{' '}
          <Text style={styles.link} onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}>Regístrate</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 72, paddingBottom: 42 },
  brand: { alignItems: 'center' },
  logo: { width: 64, height: 64, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF5FF', marginBottom: 12 },
  logoSymbol: { color: colors.primary, fontSize: 43, lineHeight: 48 },
  title: { color: colors.text, fontSize: 21, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  actions: { gap: 11 },
  secondaryButton: { minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: '#475467', fontSize: 14, fontWeight: '600' },
  caption: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: 1 },
  link: { color: colors.primary, fontWeight: '700' },
});