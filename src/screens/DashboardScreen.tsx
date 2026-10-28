import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { colors, globalStyles } from '@/styles/globalStyles';
import { courierServices } from '@/services/couriers';
import { profileStorage, type Profile, type SavedPackage } from '@/lib/storage';

const isDelivered = (status = '') => /entregad|recibid|complet|finaliz/i.test(status);

const getStatusTone = (status = '') => isDelivered(status)
  ? { background: '#E8F9F1', text: '#0E9F6E' }
  : { background: '#FFF4D6', text: '#A65E00' };

export function DashboardScreen() {
  const router = useRouter();
  const { profileId, refreshPackageId } = useLocalSearchParams<{ profileId?: string; refreshPackageId?: string }>();
  const { activeProfileId } = useActiveProfile();
  const selectedProfileId = profileId ?? activeProfileId ?? undefined;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAutoRefreshPackageId = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  const fetchProfile = useCallback(
    () => selectedProfileId ? profileStorage.get(selectedProfileId) : Promise.resolve(null),
    [selectedProfileId],
  );

  const refreshPackages = useCallback(async (loadedProfile: Profile, packages: SavedPackage[]) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    setError(null);
    let updatedProfile = loadedProfile;
    const failures: string[] = [];

    for (const item of packages) {
      const lookup = courierServices[item.courier].lookup;
      if (!lookup) {
        failures.push(`${item.alias}: consulta directa no disponible para este courier.`);
        continue;
      }
      try {
        const result = await lookup(item.trackingNumber);
        await profileStorage.saveResult(updatedProfile.id, item.id, result);
        updatedProfile = {
          ...updatedProfile,
          packages: updatedProfile.packages.map((candidate) => candidate.id === item.id ? { ...candidate, result } : candidate),
        };
        setProfile(updatedProfile);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'no se pudo consultar.';
        failures.push(`${item.alias}: ${message}`);
      }
    }

    refreshingRef.current = false;
    setRefreshing(false);
    setError(failures.length ? failures.join('\n') : null);
  }, []);

  useFocusEffect(useCallback(() => {
    let isFocused = true;
    setError(null);
    fetchProfile()
      .then((loadedProfile) => {
        if (!isFocused) return;
        setProfile(loadedProfile);
        if (refreshPackageId && lastAutoRefreshPackageId.current !== refreshPackageId) {
          lastAutoRefreshPackageId.current = refreshPackageId;
          const item = loadedProfile?.packages.find((candidate) => candidate.id === refreshPackageId);
          if (item && courierServices[item.courier].lookup && loadedProfile) {
            void refreshPackages(loadedProfile, [item]);
          } else if (item) {
            setError('No hay courier disponible para actualizar esta encomienda.');
          }
        }
      })
      .catch((cause: unknown) => {
        if (isFocused) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el perfil.');
      });

    return () => {
      isFocused = false;
    };
  }, [fetchProfile, refreshPackageId, refreshPackages]));

  const deletePackage = async (packageId: string) => {
    if (!profile) return;
    try {
      await profileStorage.deletePackage(profile.id, packageId);
      setProfile({ ...profile, packages: profile.packages.filter((item) => item.id !== packageId) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la encomienda.');
    }
  };

  const confirmDelete = (item: SavedPackage) => Alert.alert('Eliminar encomienda', `¿Quieres eliminar “${item.alias}”?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: () => deletePackage(item.id) },
  ]);

  const refreshAll = async () => {
    if (!selectedProfileId || refreshingRef.current) return;
    setError(null);
    try {
      const latestProfile = await fetchProfile();
      setProfile(latestProfile);
      const supported = latestProfile?.packages.filter((item) => Boolean(courierServices[item.courier].lookup)) ?? [];
      if (!latestProfile?.packages.length) return;
      if (!supported.length) {
        setError('No hay couriers disponibles para actualizar todavía.');
        return;
      }
      await refreshPackages(latestProfile, supported);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron actualizar las encomiendas.');
    }
  };

  if (!profile) {
    return <View style={[globalStyles.screen, globalStyles.content]}><Text style={globalStyles.error}>{error ?? 'Perfil no encontrado.'}</Text></View>;
  }

  const activePackages = profile.packages.filter((item) => !isDelivered(item.result?.status));
  const deliveredPackages = profile.packages.filter((item) => isDelivered(item.result?.status));

  const renderPackage = (item: SavedPackage) => {
    const status = item.result?.status ?? 'Sin consultar';
    const tone = getStatusTone(status);
    return (
      <View key={item.id} style={styles.packageCard}>
        <Pressable onPress={() => router.push({ pathname: '/package-detail', params: { profileId: profile.id, packageId: item.id } })}>
          <View style={styles.packageHeader}>
            <View style={styles.packageIcon}><Text style={styles.packageIconText}>⬡</Text></View>
            <View style={styles.packageCopy}>
              <Text numberOfLines={1} style={styles.packageName}>{item.alias}</Text>
              <Text style={styles.packageCode}>{item.trackingNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: tone.background }]}><Text style={[styles.statusText, { color: tone.text }]}>{status}</Text></View>
          </View>
          <View style={styles.packageDivider} />
          <View style={styles.packageFooter}>
            <Text style={styles.courierLine}>▣  {courierServices[item.courier].name}</Text>
            <Text style={styles.updatedText}>{item.result?.lastUpdated ?? ''}</Text>
          </View>
        </Pressable>
        <View style={styles.packageActions}>
          <Pressable onPress={() => router.push({ pathname: '/(tabs)/packages/new', params: { profileId: profile.id, packageId: item.id } })}>
            <Text style={styles.actionText}>Editar</Text>
          </Pressable>
          <Pressable onPress={() => confirmDelete(item)}><Text style={styles.actionText}>Eliminar</Text></Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={globalStyles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View><Text style={styles.title}>Mis Encomiendas</Text><Text style={styles.greeting}>{profile.name}</Text></View>
          <Pressable accessibilityLabel="Actualizar estados" onPress={refreshAll} disabled={refreshing} style={[styles.bellButton, refreshing && globalStyles.buttonDisabled]}><Text style={styles.bellSymbol}>↻</Text></Pressable>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}><Text style={[styles.statNumber, { color: '#F59E0B' }]}>{activePackages.length}</Text><Text style={styles.statLabel}>En camino</Text></View>
          <View style={styles.statCard}><Text style={[styles.statNumber, { color: '#10B981' }]}>{deliveredPackages.length}</Text><Text style={styles.statLabel}>Entregados</Text></View>
          <View style={styles.statCard}><Text style={[styles.statNumber, { color: colors.primary }]}>{profile.packages.length}</Text><Text style={styles.statLabel}>Total registros</Text></View>
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Paquetes Activos</Text>{refreshing && <Text style={styles.refreshLabel}>Actualizando…</Text>}</View>
        {activePackages.length ? activePackages.map(renderPackage) : <Text style={styles.emptyText}>No tienes paquetes activos.</Text>}
        {deliveredPackages.length > 0 && <Text style={[styles.sectionTitle, styles.deliveredHeading]}>Entregados Recientemente</Text>}
        {deliveredPackages.map(renderPackage)}
        {error && <Text style={globalStyles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 20, gap: 11 },
  titleRow: { minHeight: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  greeting: { color: colors.muted, fontSize: 11, marginTop: 2 },
  bellButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  bellSymbol: { color: colors.text, fontSize: 22 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, minHeight: 55, justifyContent: 'center', backgroundColor: '#FFFFFF', borderRadius: 9, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.border },
  statNumber: { fontSize: 17, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 1 },
  sectionTitle: { color: '#344054', fontSize: 12, fontWeight: '800' },
  refreshLabel: { color: colors.primary, fontSize: 10 },
  packageCard: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingTop: 9, paddingBottom: 7 },
  packageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  packageIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F7' },
  packageIconText: { color: '#475467', fontSize: 16 },
  packageCopy: { flex: 1 },
  packageName: { color: colors.text, fontSize: 12, fontWeight: '700' },
  packageCode: { color: colors.muted, fontSize: 10, marginTop: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4, maxWidth: 105 },
  statusText: { fontSize: 9, fontWeight: '700' },
  packageDivider: { height: 1, backgroundColor: '#EEF0F2', marginVertical: 7 },
  packageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courierLine: { color: '#667085', fontSize: 10 },
  updatedText: { color: '#98A2B3', fontSize: 9 },
  packageActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, paddingTop: 6 },
  actionText: { color: colors.primary, fontSize: 10, fontWeight: '600' },
  emptyText: { color: colors.muted, fontSize: 12, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 9 },
  deliveredHeading: { marginTop: 2 },
});