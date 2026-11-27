import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { colors, globalStyles } from '@/styles/globalStyles';
import { profileStorage, type Profile } from '@/lib/storage';

export function UserProfileScreen() {
  const router = useRouter();
  const { profileId: routeProfileId } = useLocalSearchParams<{ profileId?: string }>();
  const { activeProfileId, setActiveProfileId } = useActiveProfile();
  const { session, signOut } = useAuth();
  const profileId = routeProfileId ?? activeProfileId ?? undefined;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    profileStorage.get(profileId)
      .then(setProfile)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudo cargar el perfil.'));
  }, [profileId]);

  const confirmSignOut = () => {
    Alert.alert('Cerrar sesión', 'Tus perfiles y encomiendas seguirán guardados en tu cuenta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            setActiveProfileId(null);
            router.replace('/');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo cerrar sesión.');
          }
        },
      },
    ]);
  };

  const initialLetter = (profile?.name || session?.user.email || 'U').charAt(0).toUpperCase();

  return (
    <View style={globalStyles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Identidad del Perfil */}
        <View style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{initialLetter}</Text>
          </View>
          <Text style={styles.name}>{profile?.name ?? 'Perfil local'}</Text>
          <Text style={styles.email}>{session?.user.email ?? 'Cuenta conectada'}</Text>
        </View>

        {/* Ajustes Generales */}
        <Text style={styles.sectionTitle}>AJUSTES GENERALES</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="notifications-outline" size={17} color="#475467" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Notificaciones push</Text>
            <Text style={styles.settingSubtitle}>Alertas de cambio de estado en vivo</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ true: colors.primary, false: '#E2E8F0' }}
          />
        </View>

        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Seguridad y privacidad', 'Tus perfiles y encomiendas están protegidos por políticas RLS de Supabase y encriptación SSL.')}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="shield-checkmark-outline" size={17} color="#475467" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Seguridad y privacidad</Text>
            <Text style={styles.settingSubtitle}>Datos sincronizados con tu cuenta</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#98A2B3" />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('Idioma', 'La aplicación está configurada en Español (América Latina).')}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="globe-outline" size={17} color="#475467" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Idioma de la aplicación</Text>
            <Text style={styles.settingSubtitle}>Español (América Latina)</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#98A2B3" />
        </Pressable>

        <Pressable
          style={styles.settingRow}
          onPress={() => Alert.alert('RastreoFácil', 'Versión 1.0.0 (Build 2026)\nRastreador unificado de encomiendas para Chile.')}
        >
          <View style={styles.settingIcon}>
            <Ionicons name="information-circle-outline" size={17} color="#475467" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Acerca de la app</Text>
            <Text style={styles.settingSubtitle}>RastreoFácil v1.0.0</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#98A2B3" />
        </Pressable>

        {/* Cuenta y Sesión */}
        <Text style={[styles.sectionTitle, styles.accountTitle]}>CUENTA</Text>

        {profileId && (
          <Pressable
            style={styles.settingRow}
            onPress={() => router.replace('/profiles')}
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.settingCopy}>
              <Text style={styles.settingTitle}>Cambiar de perfil</Text>
              <Text style={styles.settingSubtitle}>Gestiona o selecciona otro perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#98A2B3" />
          </Pressable>
        )}

        <Pressable style={styles.deleteRow} onPress={confirmSignOut}>
          <View style={styles.deleteIcon}>
            <Ionicons name="log-out-outline" size={17} color="#DC2626" />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.deleteTitle}>Cerrar sesión</Text>
            <Text style={styles.settingSubtitle}>Tus datos seguirán disponibles en esta cuenta</Text>
          </View>
        </Pressable>

        {error && <Text style={globalStyles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEDEF',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 30,
  },
  identityCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    borderWidth: 2,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarLetter: {
    color: '#1D4ED8',
    fontSize: 24,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  email: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#667085',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  settingRow: {
    minHeight: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F2F4F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  settingSubtitle: {
    color: colors.muted,
    fontSize: 11,
  },
  accountTitle: {
    marginTop: 8,
  },
  deleteRow: {
    minHeight: 54,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: '#FEE4E2',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#FEF3F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
