import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { useAuth } from '@/contexts/AuthContext';
import { profileStorage, type Profile } from '@/lib/storage';
import { globalStyles } from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ProfilesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading, signOut } = useAuth();
  const { activeProfileId, setActiveProfileId } = useActiveProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [name, setName] = useState('');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [legacyProfiles, setLegacyProfiles] = useState<Awaited<ReturnType<typeof profileStorage.readLegacyProfiles>>>([]);
  const [importing, setImporting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  const startEditingProfile = (profile: Profile) => {
    setEditingProfileId(profile.id);
    setEditedName(profile.name);
    setError(null);
  };

  const saveProfileName = async (profileId: string) => {
    const cleanName = editedName.trim();
    if (!cleanName || cleanName.length > 80) {
      setError('El nombre debe tener entre 1 y 80 caracteres.');
      return;
    }
    try {
      await profileStorage.updateProfileName(profileId, cleanName);
      setProfiles((current) => current.map((profile) => profile.id === profileId ? { ...profile, name: cleanName } : profile));
      setEditingProfileId(null);
      setEditedName('');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar el perfil.');
    }
  };

  const deleteProfile = async (profile: Profile) => {
    try {
      await profileStorage.deleteProfile(profile.id);
      setProfiles((current) => current.filter((item) => item.id !== profile.id));
      if (activeProfileId === profile.id) setActiveProfileId(null);
      if (editingProfileId === profile.id) setEditingProfileId(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar el perfil.');
    }
  };

  const confirmDeleteProfile = (profile: Profile) => Alert.alert(
    'Eliminar perfil',
    `¿Quieres eliminar el perfil “${profile.name}”? También se eliminarán sus ${profile.packages.length} encomienda(s). Esta acción no se puede deshacer.`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { void deleteProfile(profile); } },
    ],
  );

  const confirmSignOut = () => Alert.alert(
    'Cerrar sesión',
    'Tus perfiles y encomiendas seguirán guardados en tu cuenta.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          setError(null);
          try {
            await signOut();
            setActiveProfileId(null);
            router.replace('/auth');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'No se pudo cerrar la sesión.');
          } finally {
            setSigningOut(false);
          }
        },
      },
    ],
  );

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
    <ScrollView 
      style={globalStyles.screen} 
      contentContainerStyle={[globalStyles.content, { paddingBottom: 30 + insets.bottom, paddingTop: insets.top + 8 }]}
    >
      {/* Botón superior izquierdo: Cerrar sesión con flecha */}
      <Pressable style={localStyles.signOutHeaderButton} onPress={confirmSignOut} disabled={signingOut}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={localStyles.signOutHeaderText}>{signingOut ? 'Cerrando...' : 'Cerrar sesión'}</Text>
      </Pressable>

      <Text style={[globalStyles.title, { marginTop: 8 }]}>Perfiles</Text>
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
          {editingProfileId === profile.id ? (
            <>
              <TextInput
                style={globalStyles.input}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Nombre del perfil"
                autoCapitalize="words"
                maxLength={80}
              />
              <View style={localStyles.rowButtons}>
                <Pressable style={[globalStyles.button, localStyles.flexButton]} onPress={() => saveProfileName(profile.id)}>
                  <Text style={globalStyles.buttonText}>Guardar</Text>
                </Pressable>
                <Pressable style={[globalStyles.buttonSecondary, localStyles.flexButton]} onPress={() => setEditingProfileId(null)}>
                  <Text style={globalStyles.buttonSecondaryText}>Cancelar</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={localStyles.profileHeaderRow}>
                <View>
                  <Text style={globalStyles.label}>{profile.name}</Text>
                  <Text style={globalStyles.subtitle}>{profile.packages.length} pedido(s)</Text>
                </View>
                <View style={localStyles.profileActionsRow}>
                  <Pressable style={localStyles.iconButton} onPress={() => startEditingProfile(profile)}>
                    <Ionicons name="pencil-outline" size={17} color="#555" />
                  </Pressable>
                  <Pressable style={localStyles.iconButton} onPress={() => confirmDeleteProfile(profile)}>
                    <Ionicons name="trash-outline" size={17} color="#D92D20" />
                  </Pressable>
                </View>
              </View>
              <Pressable style={[globalStyles.button, { marginTop: 12 }]} onPress={() => enterProfile(profile)}>
                <Text style={globalStyles.buttonText}>Entrar</Text>
              </Pressable>
            </>
          )}
        </View>
      ))}

      <View style={globalStyles.surface}>
        <Text style={globalStyles.label}>Crear perfil</Text>
        <TextInput style={globalStyles.input} value={name} onChangeText={setName} placeholder="Nombre del perfil" autoCapitalize="words" />
        <Pressable style={[globalStyles.buttonSecondary, { marginTop: 8 }]} onPress={createProfile}>
          <Text style={globalStyles.buttonSecondaryText}>Crear perfil</Text>
        </Pressable>
      </View>

      {error && <Text style={globalStyles.error}>{error}</Text>}
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  signOutHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 2,
  },
  signOutHeaderText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  flexButton: {
    flex: 1,
  },
});