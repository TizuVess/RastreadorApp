import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { globalStyles } from '@/styles/globalStyles';

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
    <ScrollView style={globalStyles.screen} contentContainerStyle={[globalStyles.content, { paddingBottom: 20 + insets.bottom }]} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.replace('/')}><Text style={globalStyles.buttonSecondaryText}>Volver</Text></Pressable>
      <Text style={globalStyles.title}>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</Text>
      <Text style={globalStyles.subtitle}>Tus perfiles y encomiendas estarán disponibles en tus dispositivos.</Text>
      <View style={globalStyles.surface}>
        <Text style={globalStyles.label}>Correo electrónico</Text>
        <TextInput style={globalStyles.input} value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <Text style={globalStyles.label}>Contraseña</Text>
        <TextInput style={globalStyles.input} value={password} onChangeText={setPassword} placeholder={isSignUp ? 'Al menos 8 caracteres' : 'Contraseña'} autoCapitalize="none" secureTextEntry autoComplete={isSignUp ? 'new-password' : 'password'} />
        {configurationError && <Text style={globalStyles.error}>{configurationError}</Text>}
        {error && <Text style={globalStyles.error}>{error}</Text>}
        {message && <Text style={globalStyles.subtitle}>{message}</Text>}
        <Pressable style={[globalStyles.button, busy && globalStyles.buttonDisabled]} onPress={submit} disabled={busy || Boolean(configurationError)}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.buttonText}>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</Text>}
        </Pressable>
      </View>
      <Pressable onPress={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null); }}>
        <Text style={globalStyles.buttonSecondaryText}>{isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}</Text>
      </Pressable>
    </ScrollView>
  );
}
