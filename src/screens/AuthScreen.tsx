import { useAuth } from '@/contexts/AuthContext';
import { colors, globalStyles } from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AuthMode = 'signin' | 'signup' | 'forgot';

export function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const [authMode, setAuthMode] = useState<AuthMode>(mode === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, resetPassword, configurationError } = useAuth();

  const isSignUp = authMode === 'signup';
  const isForgot = authMode === 'forgot';

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Ingresa tu correo electrónico.');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(normalizedEmail)) {
      setError('Ingresa un correo electrónico con formato válido.');
      return;
    }

    if (isForgot) {
      setBusy(true);
      setError(null);
      setMessage(null);
      try {
        await resetPassword(normalizedEmail);
        setMessage('Te hemos enviado un enlace de recuperación a tu correo electrónico.');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'No se pudo enviar el correo de recuperación.');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!password) {
      setError('Ingresa tu contraseña.');
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
          setMessage('Cuenta creada con éxito. Revisa tu correo para confirmarla y luego inicia sesión.');
          setAuthMode('signin');
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
      {/* Header unificado con botón de retroceso */}
      <Pressable style={styles.backButton} onPress={() => router.replace('/')}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      {/* Título y subtítulo con jerarquía limpia */}
      <View style={styles.headerSection}>
        <Text style={globalStyles.title}>
          {isForgot
            ? 'Recuperar contraseña'
            : isSignUp
            ? 'Crear cuenta'
            : 'Iniciar sesión'}
        </Text>
        <Text style={globalStyles.subtitle}>
          {isForgot
            ? 'Ingresa tu correo y te enviaremos un enlace para restablecer el acceso a tu cuenta.'
            : 'Tus perfiles y encomiendas estarán sincronizados en todos tus dispositivos.'}
        </Text>
      </View>

      {/* Formulario fluido */}
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

        {!isForgot && (
          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.passwordWrapper}>
              <TextInput 
                style={styles.passwordInput} 
                value={password} 
                onChangeText={setPassword} 
                placeholder={isSignUp ? 'Al menos 8 caracteres' : 'Contraseña'} 
                placeholderTextColor="#98A2B3"
                autoCapitalize="none" 
                secureTextEntry={!showPassword} 
                autoComplete={isSignUp ? 'new-password' : 'password'} 
              />
              <Pressable 
                style={styles.eyeButton} 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={8}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                <Ionicons 
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={19} 
                  color="#667085" 
                />
              </Pressable>
            </View>
          </View>
        )}

        {/* Enlace para recuperar contraseña en modo inicio de sesión */}
        {authMode === 'signin' && (
          <Pressable
            style={styles.forgotPasswordButton}
            onPress={() => { setAuthMode('forgot'); setError(null); setMessage(null); }}
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>
        )}

        {configurationError && <Text style={globalStyles.error}>{configurationError}</Text>}
        {error && <Text style={globalStyles.error}>{error}</Text>}
        {message && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color="#0E9F6E" />
            <Text style={styles.successMessage}>{message}</Text>
          </View>
        )}

        <Pressable 
          style={[globalStyles.button, busy && globalStyles.buttonDisabled]} 
          onPress={submit} 
          disabled={busy || Boolean(configurationError)}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={globalStyles.buttonText}>
              {isForgot
                ? 'Enviar enlace de recuperación'
                : isSignUp
                ? 'Crear cuenta'
                : 'Iniciar sesión'}
            </Text>
          )}
        </Pressable>

        {isForgot && (
          <Pressable
            style={styles.backToLoginButton}
            onPress={() => { setAuthMode('signin'); setError(null); setMessage(null); }}
          >
            <Ionicons name="arrow-back-outline" size={14} color={colors.primary} />
            <Text style={styles.backToLoginText}>Volver a iniciar sesión</Text>
          </Pressable>
        )}
      </View>

      {/* Enlace inferior de cambio de modo (solo visible entre login y registro) */}
      {!isForgot && (
        <Pressable 
          style={styles.switchButton}
          onPress={() => {
            setAuthMode(isSignUp ? 'signin' : 'signup');
            setError(null);
            setMessage(null);
          }}
        >
          <Text style={styles.switchText}>
            {isSignUp ? '¿Ya tienes cuenta? ' : '¿No tienes cuenta? '}
            <Text style={styles.switchTextBold}>{isSignUp ? 'Inicia sesión' : 'Regístrate'}</Text>
          </Text>
        </Pressable>
      )}
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
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingRight: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  eyeButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    marginTop: -6,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EDFAF3',
    borderWidth: 1,
    borderColor: '#B2E7C8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  successMessage: {
    flex: 1,
    color: '#0E7D51',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  backToLoginText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
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
