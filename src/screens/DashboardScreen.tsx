import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { profileStorage, type Profile, type SavedPackage } from '@/lib/storage';
import { courierServices } from '@/services/couriers';
import { colors, globalStyles } from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const isDelivered = (status = '') => /entregad|recibid|complet|finaliz/i.test(status);

const getStatusTone = (status = '') => isDelivered(status)
  ? { background: '#E8F9F1', text: '#0E9F6E', border: '#B2E7C8' }
  : { background: '#FFF4D6', text: '#A65E00', border: '#FCE0A6' };

type FilterType = 'all' | 'active' | 'delivered';

function DashboardSkeleton() {
  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={[globalStyles.screen, styles.container]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Skeleton Card */}
        <View style={styles.headerHeroCard}>
          <View style={styles.headerTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Animated.View style={[skeletonStyles.box, { width: 40, height: 40, borderRadius: 20, opacity: pulseAnim }]} />
              <View style={{ gap: 5 }}>
                <Animated.View style={[skeletonStyles.box, { width: 80, height: 11, opacity: pulseAnim }]} />
                <Animated.View style={[skeletonStyles.box, { width: 120, height: 16, opacity: pulseAnim }]} />
              </View>
            </View>
            <Animated.View style={[skeletonStyles.box, { width: 36, height: 36, borderRadius: 10, opacity: pulseAnim }]} />
          </View>

          <View style={styles.headerDivider} />

          {/* Metrics Skeleton Row */}
          <View style={styles.metricsRow}>
            {[1, 2, 3].map((key) => (
              <View key={key} style={styles.metricItem}>
                <Animated.View style={[skeletonStyles.box, { width: 28, height: 18, opacity: pulseAnim }]} />
                <Animated.View style={[skeletonStyles.box, { width: 50, height: 10, opacity: pulseAnim, marginTop: 4 }]} />
              </View>
            ))}
          </View>
        </View>

        {/* Search Skeleton */}
        <Animated.View style={[skeletonStyles.box, { width: '100%', height: 44, borderRadius: 12, opacity: pulseAnim }]} />

        {/* Section Title Skeleton */}
        <View style={{ marginTop: 6, marginBottom: 2 }}>
          <Animated.View style={[skeletonStyles.box, { width: 120, height: 14, opacity: pulseAnim }]} />
        </View>

        {/* Package Cards Skeleton */}
        {[1, 2].map((key) => (
          <Animated.View key={key} style={[styles.packageCard, { opacity: pulseAnim, paddingVertical: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[skeletonStyles.box, { width: 28, height: 28, borderRadius: 7 }]} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={[skeletonStyles.box, { width: '55%', height: 13 }]} />
                <View style={[skeletonStyles.box, { width: '35%', height: 10 }]} />
              </View>
              <View style={[skeletonStyles.box, { width: 68, height: 20, borderRadius: 6 }]} />
            </View>
            <View style={styles.packageDivider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={[skeletonStyles.box, { width: 75, height: 10 }]} />
              <View style={[skeletonStyles.box, { width: 50, height: 10 }]} />
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  box: {
    backgroundColor: '#E4E7EC',
    borderRadius: 6,
  },
});

export function DashboardScreen() {
  const router = useRouter();
  const { profileId, refreshPackageId } = useLocalSearchParams<{ profileId?: string; refreshPackageId?: string }>();
  const { activeProfileId } = useActiveProfile();
  const selectedProfileId = profileId ?? activeProfileId ?? undefined;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAnim] = useState(() => new Animated.Value(0));
  const lastAutoRefreshPackageId = useRef<string | null>(null);
  const refreshingRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  }, [toastAnim]);

  const copyTrackingNumber = async (trackingNum: string) => {
    try {
      await Clipboard.setStringAsync(trackingNum);
      showToast('✓ Código copiado al portapapeles');
    } catch {
      showToast('No se pudo copiar el código');
    }
  };

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
    if (!profile) setLoading(true);

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
      })
      .finally(() => {
        if (isFocused) setLoading(false);
      });

    return () => {
      isFocused = false;
    };
  }, [fetchProfile, profile, refreshPackageId, refreshPackages]));

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

  if (loading && !profile) {
    return <DashboardSkeleton />;
  }

  if (!profile) {
    return (
      <View style={[globalStyles.screen, globalStyles.content]}>
        <Text style={globalStyles.error}>{error ?? 'Perfil no encontrado.'}</Text>
      </View>
    );
  }

  const activePackages = profile.packages.filter((item) => !isDelivered(item.result?.status));
  const deliveredPackages = profile.packages.filter((item) => isDelivered(item.result?.status));

  // Filtrado reactivo en tiempo real por término de búsqueda
  const query = searchQuery.trim().toLowerCase();
  const matchesSearch = (item: SavedPackage) => {
    if (!query) return true;
    const aliasMatch = item.alias.toLowerCase().includes(query);
    const trackingMatch = item.trackingNumber.toLowerCase().includes(query);
    const courierMatch = courierServices[item.courier]?.name.toLowerCase().includes(query);
    const statusMatch = (item.result?.status ?? '').toLowerCase().includes(query);
    return aliasMatch || trackingMatch || courierMatch || statusMatch;
  };

  const filteredActive = activePackages.filter(matchesSearch);
  const filteredDelivered = deliveredPackages.filter(matchesSearch);

  const displayedPackages = (() => {
    if (filterType === 'active') return filteredActive;
    if (filterType === 'delivered') return filteredDelivered;
    return [...filteredActive, ...filteredDelivered];
  })();

  const renderPackage = (item: SavedPackage) => {
    const status = item.result?.status ?? 'Sin consultar';
    const tone = getStatusTone(status);
    const courier = courierServices[item.courier];

    return (
      <View key={item.id} style={styles.packageCard}>
        <Pressable
          onPress={() => router.push({ pathname: '/package-detail', params: { profileId: profile.id, packageId: item.id } })}
          style={({ pressed }) => [pressed && styles.packageCardPressed]}
        >
          <View style={styles.packageHeader}>
            <View style={styles.packageIcon}>
              <Ionicons name="cube-outline" size={17} color={colors.primary} />
            </View>
            <View style={styles.packageCopy}>
              <Text numberOfLines={1} style={styles.packageName}>{item.alias}</Text>
              <Text style={styles.packageCode}>{item.trackingNumber}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: tone.background, borderColor: tone.border }]}>
              <Text style={[styles.statusText, { color: tone.text }]}>{status}</Text>
            </View>
          </View>

          <View style={styles.packageDivider} />

          <View style={styles.packageFooter}>
            <View style={styles.courierTag}>
              <Ionicons name="navigate-outline" size={12} color="#475467" />
              <Text style={styles.courierLine}>{courier.name}</Text>
            </View>
            {Boolean(item.result?.lastUpdated) && (
              <Text style={styles.updatedText}>{item.result?.lastUpdated}</Text>
            )}
          </View>
        </Pressable>

        <View style={styles.packageActions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => copyTrackingNumber(item.trackingNumber)}
            accessibilityLabel="Copiar número de seguimiento"
          >
            <Ionicons name="copy-outline" size={13} color={colors.primary} />
            <Text style={styles.actionText}>Copiar</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.push({ pathname: '/packages/new', params: { profileId: profile.id, packageId: item.id } })}
          >
            <Ionicons name="create-outline" size={13} color={colors.primary} />
            <Text style={styles.actionText}>Editar</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => confirmDelete(item)}
          >
            <Ionicons name="trash-outline" size={13} color="#D92D20" />
            <Text style={[styles.actionText, styles.actionTextDanger]}>Eliminar</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const isSearchingOrFiltering = Boolean(query) || filterType !== 'all';

  return (
    <View style={[globalStyles.screen, styles.container]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Cabecera Hero cohesiva con jerarquía clara */}
        <View style={styles.headerHeroCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.profileBadge}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {(profile.name || 'P').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.headerSub}>Perfil activo</Text>
                <Text style={styles.headerName}>{profile.name}</Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Actualizar estados"
              onPress={refreshAll}
              disabled={refreshing}
              style={[styles.headerRefreshBtn, refreshing && globalStyles.buttonDisabled]}
            >
              <Ionicons
                name="refresh"
                size={18}
                color={refreshing ? colors.muted : colors.primary}
              />
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          {/* Tira de métricas esbelta e interactiva */}
          <View style={styles.metricsRow}>
            <Pressable
              style={[styles.metricItem, filterType === 'active' && styles.metricItemActive]}
              onPress={() => setFilterType(filterType === 'active' ? 'all' : 'active')}
            >
              <View style={styles.metricValRow}>
                <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.metricNumber, { color: '#D97706' }]}>{activePackages.length}</Text>
              </View>
              <Text style={styles.metricLabel}>En camino</Text>
            </Pressable>

            <View style={styles.metricDivider} />

            <Pressable
              style={[styles.metricItem, filterType === 'delivered' && styles.metricItemActive]}
              onPress={() => setFilterType(filterType === 'delivered' ? 'all' : 'delivered')}
            >
              <View style={styles.metricValRow}>
                <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.metricNumber, { color: '#059669' }]}>{deliveredPackages.length}</Text>
              </View>
              <Text style={styles.metricLabel}>Entregados</Text>
            </Pressable>

            <View style={styles.metricDivider} />

            <Pressable
              style={[styles.metricItem, filterType === 'all' && styles.metricItemActive]}
              onPress={() => setFilterType('all')}
            >
              <View style={styles.metricValRow}>
                <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.metricNumber, { color: '#2563EB' }]}>{profile.packages.length}</Text>
              </View>
              <Text style={styles.metricLabel}>Total</Text>
            </Pressable>
          </View>
        </View>

        {/* Barra de Búsqueda interactiva */}
        {profile.packages.length > 0 && (
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={18} color="#98A2B3" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por alias, código o courier..."
              placeholderTextColor="#98A2B3"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {Boolean(searchQuery) && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color="#98A2B3" />
              </Pressable>
            )}
          </View>
        )}

        {/* Fila de Título y Tabs de Filtro */}
        {profile.packages.length > 0 && (
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>
                {filterType === 'all'
                  ? (isSearchingOrFiltering ? `Resultados (${displayedPackages.length})` : 'Mis Encomiendas')
                  : filterType === 'active'
                  ? `En Camino (${filteredActive.length})`
                  : `Entregados (${filteredDelivered.length})`}
              </Text>
              {refreshing && <Text style={styles.refreshLabel}>Actualizando…</Text>}
            </View>

            {/* Selector de vista compacto */}
            <View style={styles.filterTabsRow}>
              <Pressable
                style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
                  Todos
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterTab, filterType === 'active' && styles.filterTabActive]}
                onPress={() => setFilterType('active')}
              >
                <Text style={[styles.filterTabText, filterType === 'active' && styles.filterTabTextActive]}>
                  Activos
                </Text>
              </Pressable>
              <Pressable
                style={[styles.filterTab, filterType === 'delivered' && styles.filterTabActive]}
                onPress={() => setFilterType('delivered')}
              >
                <Text style={[styles.filterTabText, filterType === 'delivered' && styles.filterTabTextActive]}>
                  Listos
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Lista de encomiendas o estado vacío */}
        {profile.packages.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cube-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aún no tienes encomiendas</Text>
            <Text style={styles.emptySubtitle}>
              Presiona el botón + para registrar tu primer envío y comenzar el seguimiento en vivo.
            </Text>
          </View>
        ) : displayedPackages.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#F2F4F7' }]}>
              <Ionicons name="search-outline" size={28} color="#667085" />
            </View>
            <Text style={styles.emptyTitle}>Sin resultados</Text>
            <Text style={styles.emptySubtitle}>
              No encontramos encomiendas que coincidan con &quot;{searchQuery}&quot;.
            </Text>
            <Pressable
              style={styles.clearFiltersButton}
              onPress={() => { setSearchQuery(''); setFilterType('all'); }}
            >
              <Text style={styles.clearFiltersText}>Limpiar búsqueda y filtros</Text>
            </Pressable>
          </View>
        ) : (
          displayedPackages.map(renderPackage)
        )}

        {error && <Text style={globalStyles.error}>{error}</Text>}
      </ScrollView>

      {/* Botón Flotante (FAB) para nueva encomienda */}
      <Pressable
        style={styles.fab}
        onPress={() => router.push({ pathname: '/packages/new', params: { profileId: profile.id } })}
        accessibilityLabel="Crear nueva encomienda"
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Toast flotante de confirmación */}
      {Boolean(toastMessage) && (
        <Animated.View style={[styles.floatingToast, { opacity: toastAnim }]}>
          <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          <Text style={styles.floatingToastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 85,
    gap: 12,
  },
  headerHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#1D4ED8',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerName: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  metricItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  metricValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metricNumber: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  refreshLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  filterTab: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 9,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 2,
  },
  packageCardPressed: {
    opacity: 0.9,
    backgroundColor: '#F8FAFC',
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  packageIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  packageCopy: {
    flex: 1,
  },
  packageName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  packageCode: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 125,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  packageDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
  packageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  courierLine: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  updatedText: {
    color: '#94A3B8',
    fontSize: 10,
  },
  packageActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  actionTextDanger: {
    color: '#DC2626',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 28,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  clearFiltersButton: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  clearFiltersText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 999,
  },
  floatingToast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 9999,
  },
  floatingToastText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});