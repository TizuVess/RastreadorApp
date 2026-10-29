import { useAuth } from '@/contexts/AuthContext';
import { colors, globalStyles } from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, configurationError } = useAuth();

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }
    if (isSignUp && password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (isSignUp) {
        const hasSession = await signUp(normalizedEmail, password);
        if (hasSession) router.replace('/profiles');
        else {
          setMessage('Cuenta creada. Revisa tu correo para confirmar la cuenta y luego inicia sesión.');
          setIsSignUp(false);
        }
      } else {
        await signIn(normalizedEmail, password);
        router.replace('/profiles');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo completar la autenticación.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView 
      style={globalStyles.screen} 
      contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: 30 + insets.bottom }]} 
      keyboardShouldPersistTaps="handled"
    >
      {/* Header unificado con flecha de retroceso */}
      <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      {/* Título y subtítulo con mejor jerarquía */}
      <View style={styles.headerSection}>
        <Text style={globalStyles.title}>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
        <Text style={globalStyles.subtitle}>Tus perfiles y encomiendas estarán disponibles en tus dispositivos.</Text>
      </View>

      {/* Formulario integrado directamente en el flujo (sin caja surface) */}
      <View style={styles.formSection}>
        <View style={styles.field}>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput 
            style={globalStyles.input} 
            value={email} 
            onChangeText={setEmail} 
            placeholder="correo@ejemplo.com" 
            placeholderTextColor="#98A2B3"
            autoCapitalize="none" 
            keyboardType="email-address" 
            autoComplete="email" 
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput 
            style={globalStyles.input} 
            value={password} 
            onChangeText={setPassword} 
            placeholder={isSignUp ? 'Al menos 8 caracteres' : 'Contraseña'} 
            placeholderTextColor="#98A2B3"
            autoCapitalize="none" 
            secureTextEntry 
            autoComplete={isSignUp ? 'new-password' : 'password'} 
          />
        </View>

        {configurationError && <Text style={globalStyles.error}>{configurationError}</Text>}
        {error && <Text style={globalStyles.error}>{error}</Text>}
        {message && <Text style={styles.successMessage}>{message}</Text>}

        <Pressable 
          style={[globalStyles.button, busy && globalStyles.buttonDisabled]} 
          onPress={submit} 
          disabled={busy || Boolean(configurationError)}
        >
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.buttonText}>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</Text>}
        </Pressable>
      </View>

      {/* Enlace inferior de cambio de modo */}
      <Pressable 
        style={styles.switchButton}
        onPress={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}
      >
        <Text style={styles.switchText}>
          {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
          <Text style={styles.switchTextBold}>{isSignUp ? 'Inicia sesión' : 'Regístrate'}</Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 12,
  },
  backText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  headerSection: {
    marginBottom: 24,
    gap: 6,
  },
  formSection: {
    gap: 16,
    flex: 1,
  },
  field: {
    gap: 6,
  },
  label: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '600',
  },
  successMessage: {
    color: '#0E9F6E',
    fontSize: 13,
    lineHeight: 18,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  switchText: {
    color: '#667085',
    fontSize: 13,
  },
  switchTextBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});