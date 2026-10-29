import { colors, globalStyles } from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function LobbyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: Math.max(30, insets.bottom + 20) }]}>
      {/* Sección de Marca e Identidad */}
      <View style={styles.brand}>
        <View style={styles.logoContainer}>
          <Ionicons name="cube-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.title}>RastreoFácil</Text>
        <Text style={styles.subtitle}>Tu centro utilitario de{ '\n' }encomiendas y paquetes</Text>
      </View>

      {/* Sección de Acciones y CTA con jerarquía clara */}
      <View style={styles.actions}>
        <Pressable style={globalStyles.button} onPress={() => router.push('/auth')}>
          <Text style={globalStyles.buttonText}>Iniciar sesión</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('./guest')}>
          <Text style={styles.secondaryButtonText}>Continuar como invitado</Text>
        </Pressable>

        <Pressable 
          style={styles.captionContainer}
          onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })}
        >
          <Text style={styles.caption}>
            ¿Aún no tienes cuenta?{' '}
            <Text style={styles.link}>Regístrate</Text>
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    justifyContent: 'space-between', 
    paddingHorizontal: 24, 
  },
  brand: { 
    alignItems: 'center',
    marginTop: 40,
  },
  logoContainer: { 
    width: 72, 
    height: 72, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#EFF5FF', 
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  title: { 
    color: colors.text, 
    fontSize: 24, 
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: { 
    color: colors.muted, 
    fontSize: 14, 
    lineHeight: 20, 
    textAlign: 'center', 
    marginTop: 6, 
  },
  actions: { 
    gap: 12,
    width: '100%',
    marginBottom: 10,
  },
  secondaryButton: { 
    minHeight: 48, 
    borderRadius: 9, 
    backgroundColor: '#F8F9FA',
    borderWidth: 1, 
    borderColor: '#EAECF0', 
    alignItems: 'center', 
    justifyContent: 'center', 
  },
  secondaryButtonText: { 
    color: '#475467', 
    fontSize: 14, 
    fontWeight: '600', 
  },
  captionContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  caption: { 
    color: colors.muted, 
    textAlign: 'center', 
    fontSize: 13, 
  },
  link: { 
    color: colors.primary, 
    fontWeight: '700', 
  },
});