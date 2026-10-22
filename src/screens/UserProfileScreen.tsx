import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
      { text: 'Cerrar sesión', style: 'destructive', onPress: async () => {
        try {
          await signOut();
          setActiveProfileId(null);
          router.replace('/');
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'No se pudo cerrar sesión.');
        }
      } },
    ]);
  };

  return (
    <View style={globalStyles.screen}>
      <View style={styles.header}><Text style={styles.headerTitle}>Mi Perfil</Text></View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <View style={styles.avatar}><Text style={styles.avatarSymbol}>○</Text></View>
          <Text style={styles.name}>{profile?.name ?? 'Perfil local'}</Text>
          <Text style={styles.email}>{session?.user.email ?? 'Cuenta conectada'}</Text>
        </View>
        <Text style={styles.sectionTitle}>AJUSTES GENERALES</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}><Text style={styles.iconText}>♧</Text></View>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>Notificaciones push</Text><Text style={styles.settingSubtitle}>Alertas de cambio de estado en vivo</Text></View>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: colors.primary }} />
        </View>
        <Pressable style={styles.settingRow} onPress={() => Alert.alert('Seguridad y privacidad', 'Tus perfiles y encomiendas están asociados a tu cuenta y protegidos por políticas RLS de Supabase.')}>
          <View style={styles.settingIcon}><Text style={styles.iconText}>◇</Text></View>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>Seguridad y privacidad</Text><Text style={styles.settingSubtitle}>Datos sincronizados con tu cuenta</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable style={styles.settingRow} onPress={() => Alert.alert('Idioma', 'La aplicación está configurada en Español (América Latina).')}>
          <View style={styles.settingIcon}><Text style={styles.iconText}>◎</Text></View>
          <View style={styles.settingCopy}><Text style={styles.settingTitle}>Idioma de la aplicación</Text><Text style={styles.settingSubtitle}>Español (América Latina)</Text></View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Text style={[styles.sectionTitle, styles.accountTitle]}>CUENTA</Text>
        <Pressable style={styles.deleteRow} onPress={confirmSignOut}>
          <View style={styles.deleteIcon}><Text style={styles.deleteIconText}>⌫</Text></View>
          <View style={styles.settingCopy}><Text style={styles.deleteTitle}>Cerrar sesión</Text><Text style={styles.settingSubtitle}>Tus datos seguirán disponibles en esta cuenta</Text></View>
        </Pressable>
        {profileId && <Pressable onPress={() => router.replace('/profiles')}><Text style={styles.switchProfile}>Cambiar de perfil</Text></Pressable>}
        {error && <Text style={globalStyles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { height: 64, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ECEDEF' },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  content: { padding: 17, gap: 9 },
  identity: { alignItems: 'center', paddingTop: 7, paddingBottom: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EEF5FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarSymbol: { color: colors.primary, fontSize: 33, lineHeight: 38 },
  name: { color: colors.text, fontSize: 16, fontWeight: '800' },
  email: { color: colors.muted, fontSize: 11, marginTop: 3, textAlign: 'center' },
  sectionTitle: { color: '#667085', fontSize: 11, fontWeight: '700', marginTop: 3, marginBottom: 1 },
  settingRow: { minHeight: 58, backgroundColor: '#FFFFFF', borderRadius: 10, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F2F4F7', alignItems: 'center', justifyContent: 'center' },
  iconText: { color: '#475467', fontSize: 17, fontWeight: '700' },
  settingCopy: { flex: 1, gap: 2 },
  settingTitle: { color: colors.text, fontSize: 12, fontWeight: '700' },
  settingSubtitle: { color: colors.muted, fontSize: 10 },
  chevron: { color: '#98A2B3', fontSize: 23 },
  accountTitle: { marginTop: 4 },
  deleteRow: { minHeight: 58, backgroundColor: '#FFFFFF', borderRadius: 10, borderColor: colors.border, borderWidth: 1, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },
  deleteIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFF1F0', justifyContent: 'center', alignItems: 'center' },
  deleteIconText: { color: '#E5484D', fontSize: 18, fontWeight: '700' },
  deleteTitle: { color: '#E5484D', fontSize: 12, fontWeight: '700' },
  switchProfile: { color: colors.primary, fontSize: 13, fontWeight: '700', textAlign: 'center', padding: 12 },
});