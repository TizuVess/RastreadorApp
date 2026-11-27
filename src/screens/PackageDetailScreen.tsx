import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, globalStyles } from '@/styles/globalStyles';
import { courierServices } from '@/services/couriers';
import { profileStorage, type SavedPackage } from '@/lib/storage';
import type { TrackingResult } from '@/types/tracking';
import { formatTrackingShareMessage, getOfficialTrackingUrl } from '@/utils/courierUrls';

export function PackageDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId, packageId } = useLocalSearchParams<{ profileId?: string; packageId?: string }>();
  const [item, setItem] = useState<SavedPackage | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAnim] = useState(() => new Animated.Value(0));

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  }, [toastAnim]);

  const copyTrackingCode = async () => {
    if (!item?.trackingNumber) return;
    try {
      await Clipboard.setStringAsync(item.trackingNumber);
      showToast('✓ Código copiado al portapapeles');
    } catch {
      showToast('No se pudo copiar el código');
    }
  };

  const openOfficialWebsite = async () => {
    if (!item?.trackingNumber) return;
    const url = getOfficialTrackingUrl(item.courier, item.trackingNumber);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('No se pudo abrir el navegador', url);
      }
    } catch {
      Alert.alert('Error al abrir sitio web oficial', url);
    }
  };

  const handleShare = () => {
    if (!item) return;
    const message = formatTrackingShareMessage({
      alias: item.alias,
      trackingNumber: item.trackingNumber,
      courierName: service.name,
      courierId: item.courier,
      statusText,
      detail: result?.detail,
      origin: result?.origin,
      destination: result?.destination,
      lastUpdated: result?.lastUpdated,
    });
    void Share.share({ message });
  };

  useEffect(() => {
    if (!profileId) return;
    let isActive = true;
    const loadPackage = async () => {
      try {
        const selectedProfile = await profileStorage.get(profileId);
        const selectedPackage = selectedProfile?.packages.find((candidate) => candidate.id === packageId) ?? null;
        if (!isActive) return;
        setItem(selectedPackage);
        setResult(selectedPackage?.result ?? null);
        if (!selectedPackage || !selectedProfile) return;

        const lookup = courierServices[selectedPackage.courier].lookup;
        if (!lookup) return;
        const latestResult = await lookup(selectedPackage.trackingNumber);
        await profileStorage.saveResult(selectedProfile.id, selectedPackage.id, latestResult);
        if (isActive) {
          setResult(latestResult);
          setItem({ ...selectedPackage, result: latestResult });
        }
      } catch (cause) {
        if (isActive) setError(cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    void loadPackage();
    return () => {
      isActive = false;
    };
  }, [packageId, profileId]);

  const displayedError = error ?? (!profileId ? 'No se seleccionó un perfil.' : null);

  if (!item) {
    return (
      <View style={[globalStyles.screen, globalStyles.content]}>
        {loading && profileId ? <ActivityIndicator size="large" color={colors.primary} /> : <Text style={globalStyles.error}>{displayedError ?? 'Pedido no encontrado.'}</Text>}
      </View>
    );
  }

  const service = courierServices[item.courier];
  const statusText = result?.status ?? 'Sin consultar aún';

  const statusTone = (() => {
    const normalized = statusText.toLowerCase();
    if (/entregad|recibid|complet|finaliz/.test(normalized)) return { background: '#E8F9F1', border: '#B2E7C8', text: '#0E7D51' };
    if (/retard|retras|cancel|proble|deterior|reten|fall|alert/.test(normalized)) return { background: '#FDECEC', border: '#F3B7B0', text: '#B42318' };
    if (/tr[aá]nsit|despach|proces|env[ií]ad|disponible|recepcion/.test(normalized)) return { background: '#EAF2FF', border: '#BED4FF', text: '#0E5BCF' };
    return { background: '#F3F6FB', border: '#D9E2EF', text: '#475569' };
  })();

  const events = result?.events && result.events.length > 0 ? result.events : null;

  return (
    <View style={globalStyles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" onPress={() => router.back()} style={styles.headerButton}>
          <Text style={styles.backSymbol}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Seguimiento de Envío</Text>
        <Pressable
          accessibilityLabel="Compartir seguimiento"
          onPress={handleShare}
          style={styles.headerButton}
        >
          <Ionicons name="share-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 30 + insets.bottom }]}>
        {/* 1. Tarjeta de Resumen Principal (Determinante) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={[globalStyles.statusPill, { backgroundColor: statusTone.background, borderColor: statusTone.border }]}>
              <Text style={[globalStyles.statusText, { color: statusTone.text }]}>{statusText}</Text>
            </View>
            <Text style={styles.courierName}>{service.name}</Text>
          </View>

          {item.alias !== item.trackingNumber && (
            <Text style={styles.packageAlias}>{item.alias}</Text>
          )}

          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>Nº Seguimiento:</Text>
            <Pressable
              onPress={copyTrackingCode}
              style={styles.trackingCodeBadge}
              accessibilityLabel="Copiar número de seguimiento"
              hitSlop={6}
            >
              <Text style={styles.trackingCode}>{item.trackingNumber}</Text>
              <Ionicons name="copy-outline" size={13} color={colors.primary} />
            </Pressable>
          </View>

          {/* Mensaje descriptivo del estado actual */}
          {result?.detail && (
            <View style={styles.detailBox}>
              <Text style={styles.detailText}>{result.detail}</Text>
            </View>
          )}

          <View style={styles.separator} />

          {/* Origen y Destino esencial */}
          <View style={styles.routeRow}>
            <View style={styles.routeColumn}>
              <Text style={styles.summaryLabel}>ORIGEN</Text>
              <Text style={styles.routeValue}>{result?.origin ?? 'Por confirmar'}</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeColumn}>
              <Text style={styles.summaryLabel}>DESTINO</Text>
              <Text style={styles.routeValue}>{result?.destination ?? 'Por confirmar'}</Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas: Web Oficial y Compartir */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={styles.officialSiteButton}
            onPress={openOfficialWebsite}
            accessibilityLabel={`Ver en sitio web de ${service.name}`}
          >
            <Ionicons name="open-outline" size={15} color={colors.primary} />
            <Text numberOfLines={1} style={styles.officialSiteButtonText}>
              Ver en sitio de {service.name}
            </Text>
          </Pressable>

          <Pressable
            style={styles.shareCardButton}
            onPress={handleShare}
            accessibilityLabel="Compartir seguimiento"
          >
            <Ionicons name="share-social-outline" size={15} color="#344054" />
            <Text style={styles.shareCardButtonText}>Compartir</Text>
          </Pressable>
        </View>

        {/* 2. Hoja de ruta del pedido (La "vida" del pedido) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hoja de ruta del pedido</Text>
          <View style={styles.timelineCard}>
            {events ? (
              events.map((ev, index) => {
                const isLast = index === events.length - 1;
                return (
                  <View key={`${ev.title}-${index}`} style={styles.timelineRow}>
                    <View style={styles.timelineTrack}>
                      <View style={[styles.timelineDot, ev.isActive && styles.timelineDotActive]} />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineStatus, ev.isActive && styles.timelineStatusActive]}>
                        {ev.title}
                      </Text>
                      {ev.description && (
                        <Text style={styles.timelineDetail}>{ev.description}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.timelineRow}>
                <View style={styles.timelineTrack}>
                  <View style={[styles.timelineDot, styles.timelineDotActive]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineStatus, styles.timelineStatusActive]}>{statusText}</Text>
                  <Text style={styles.timelineDetail}>
                    {result?.detail || 'Consulta el estado más reciente proporcionado por el courier.'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 3. Desplegable abajo de la hoja de ruta con los detalles adicionales */}
        <View style={styles.accordionContainer}>
          <Pressable
            style={styles.accordionHeader}
            onPress={() => setIsDetailsOpen(!isDetailsOpen)}
          >
            <View style={styles.accordionHeaderLeft}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.accordionTitle}>Detalles adicionales del envío</Text>
            </View>
            <Ionicons name={isDetailsOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#667085" />
          </Pressable>

          {isDetailsOpen && (
            <View style={styles.accordionBody}>
              {Boolean(result?.lastUpdated) && (
                <View style={styles.updatedContainer}>
                  <Ionicons name="time-outline" size={13} color={colors.muted} />
                  <Text style={styles.updatedText}>Última actualización: {result?.lastUpdated}</Text>
                </View>
              )}

              {Boolean(result?.info && result.info.length > 0) ? (
                <View style={globalStyles.infoGrid}>
                  {result?.info?.map((infoItem, idx) => (
                    <View key={`${infoItem.label}-${idx}`} style={globalStyles.infoCard}>
                      <Text style={globalStyles.infoLabel}>{infoItem.label}</Text>
                      <Text style={globalStyles.infoValue}>{infoItem.value}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noInfoText}>No hay información secundaria adicional para este courier.</Text>
              )}

              {/* Botón opcional para ver datos técnicos dentro del desplegable */}
              {Boolean(result?.raw) && (
                <Pressable
                  style={styles.rawToggleBtn}
                  onPress={() => setShowRawJson(!showRawJson)}
                >
                  <Ionicons name={showRawJson ? 'code-slash' : 'code-outline'} size={14} color="#667085" />
                  <Text style={styles.rawToggleText}>
                    {showRawJson ? 'Ocultar datos técnicos' : 'Ver datos técnicos (JSON)'}
                  </Text>
                </Pressable>
              )}

              {showRawJson && Boolean(result?.raw) && (
                <View style={globalStyles.jsonContainer}>
                  <Text style={globalStyles.jsonTitle}>Respuesta del Courier</Text>
                  <ScrollView horizontal style={globalStyles.jsonScroll}>
                    <Text selectable style={globalStyles.jsonText}>
                      {JSON.stringify(result?.raw, null, 2)}
                    </Text>
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>

        {error && <Text style={globalStyles.error}>{error}</Text>}
      </ScrollView>

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
  header: {
    height: 58,
    paddingHorizontal: 13,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEDEF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSymbol: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 36,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 10,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courierName: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  packageAlias: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  trackingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  trackingCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  trackingCode: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  officialSiteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  officialSiteButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  shareCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D0D5DD',
  },
  shareCardButtonText: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '700',
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
  detailBox: {
    backgroundColor: '#F8F9FB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF0F2',
    marginTop: 2,
  },
  detailText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    backgroundColor: '#ECEDEF',
    marginVertical: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeColumn: {
    flex: 1,
    gap: 2,
  },
  routeDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAECF0',
    marginHorizontal: 12,
  },
  summaryLabel: {
    color: '#667085',
    fontSize: 10,
    fontWeight: '600',
  },
  routeValue: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '700',
  },
  updatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  updatedText: {
    color: colors.muted,
    fontSize: 11,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '800',
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  timelineRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  timelineTrack: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D0D5DD',
    marginTop: 4,
  },
  timelineDotActive: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#EFF5FF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EAECF0',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 8,
    paddingBottom: 16,
    gap: 3,
  },
  timelineStatus: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '600',
  },
  timelineStatusActive: {
    color: colors.text,
    fontWeight: '700',
  },
  timelineDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  rawToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  rawToggleText: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  accordionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accordionTitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
  },
  accordionBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
    paddingTop: 12,
  },
  noInfoText: {
    color: colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});