import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { globalStyles } from '@/styles/globalStyles';
import { profileStorage, type Profile } from '@/lib/storage';

export function ProfilesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();
  const { setActiveProfileId } = useActiveProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [legacyProfiles, setLegacyProfiles] = useState<Awaited<ReturnType<typeof profileStorage.readLegacyProfiles>>>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/auth');
      return;
    }
    Promise.all([profileStorage.list(), profileStorage.readLegacyProfiles()])
      .then(([remoteProfiles, localProfiles]) => {
        setProfiles(remoteProfiles);
        setLegacyProfiles(localProfiles);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los perfiles.'));
  }, [loading, router, session]);

  const createProfile = async () => {
    const cleanName = name.trim();
    if (!cleanName) { setError('Escribe un nombre para el perfil.'); return; }
    try {
      const profile = await profileStorage.createProfile(cleanName);
      setProfiles((current) => [...current, profile]);
      setName('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear el perfil.');
    }
  };

  const enterProfile = (profile: Profile) => {
    setActiveProfileId(profile.id);
    router.push({ pathname: '/(tabs)/home', params: { profileId: profile.id } });
  };

  const importLegacyProfiles = async () => {
    if (!session?.user.id) return;
    setImporting(true);
    setError(null);
    try {
      await profileStorage.importLegacyProfiles(session.user.id, legacyProfiles);
      setProfiles(await profileStorage.list());
      setLegacyProfiles([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron importar los perfiles de este dispositivo.');
    } finally {
      setImporting(false);
    }
  };

  if (loading) return <View style={[globalStyles.screen, globalStyles.content]}><ActivityIndicator /></View>;

  return (
    <ScrollView style={globalStyles.screen} contentContainerStyle={[globalStyles.content, { paddingBottom: 20 + insets.bottom }]}>
      <Text style={globalStyles.title}>Perfiles</Text>
      <Text style={globalStyles.subtitle}>Tus perfiles y encomiendas se sincronizan con tu cuenta.</Text>
      {legacyProfiles.length > 0 && (
        <View style={globalStyles.surface}>
          <Text style={globalStyles.label}>Perfiles guardados en este dispositivo</Text>
          <Text style={globalStyles.subtitle}>Puedes importarlos a tu cuenta para tenerlos también en otros dispositivos.</Text>
          <Pressable style={[globalStyles.button, importing && globalStyles.buttonDisabled]} onPress={importLegacyProfiles} disabled={importing}>
            <Text style={globalStyles.buttonText}>{importing ? 'Importando...' : 'Importar perfiles locales'}</Text>
          </Pressable>
        </View>
      )}
      {profiles.map((profile) => (
        <View key={profile.id} style={globalStyles.surface}>
          <Text style={globalStyles.label}>{profile.name}</Text>
          <Text style={globalStyles.subtitle}>{profile.packages.length} pedido(s)</Text>
          <Pressable style={globalStyles.button} onPress={() => enterProfile(profile)}><Text style={globalStyles.buttonText}>Entrar</Text></Pressable>
        </View>
      ))}
      <View style={globalStyles.surface}>
        <Text style={globalStyles.label}>Crear perfil</Text>
        <TextInput style={globalStyles.input} value={name} onChangeText={setName} placeholder="Nombre del perfil" autoCapitalize="words" />
        <Pressable style={globalStyles.buttonSecondary} onPress={createProfile}><Text style={globalStyles.buttonSecondaryText}>Crear perfil</Text></Pressable>
      </View>
      {error && <Text style={globalStyles.error}>{error}</Text>}
    </ScrollView>
  );
}