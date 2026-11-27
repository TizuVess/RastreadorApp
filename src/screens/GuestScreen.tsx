import { courierServices, getCourierService } from '@/services/couriers';
import { colors, globalStyles } from '@/styles/globalStyles';
import type { CourierId, TrackingResult } from '@/types/tracking';
import { formatTrackingShareMessage, getOfficialTrackingUrl } from '@/utils/courierUrls';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function GuestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [courierId, setCourierId] = useState<CourierId>('blue-express');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
    if (!result?.trackingNumber) return;
    try {
      await Clipboard.setStringAsync(result.trackingNumber);
      showToast('✓ Código copiado al portapapeles');
    } catch {
      showToast('No se pudo copiar el código');
    }
  };

  const openOfficialWebsite = async () => {
    if (!result?.trackingNumber) return;
    const url = getOfficialTrackingUrl(courierId, result.trackingNumber);
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
    if (!result) return;
    const message = formatTrackingShareMessage({
      trackingNumber: result.trackingNumber,
      courierName: service.name,
      courierId,
      statusText,
      detail: result.detail,
      origin: result.origin,
      destination: result.destination,
      lastUpdated: result.lastUpdated,
    });
    void Share.share({ message });
  };
  const service = getCourierService(courierId);

  const startTracking = async () => {
    const cleanTrackingNumber = trackingNumber.trim();
    if (!cleanTrackingNumber) {
      setError('Ingresa un número de seguimiento.');
      return;
    }
    if (!service.lookup) {
      setError('Este courier todavía está en integración.');
      return;
    }

    setResult(null);
    setError(null);
    setLoading(true);
    try {
      setResult(await service.lookup(cleanTrackingNumber));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo consultar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  const statusText = result?.status ?? 'Sin consultar aún';
  const statusTone = (() => {
    const normalized = statusText.toLowerCase();
    if (/entregad|recibid|complet|finaliz/.test(normalized)) return { background: '#E8F9F1', border: '#B2E7C8', text: '#0E7D51' };
    if (/retard|retras|cancel|proble|deterior|reten|fall|alert/.test(normalized)) return { background: '#FDECEC', border: '#F3B7B0', text: '#B42318' };
    if (/tr[aá]nsit|despach|proces|env[ií]ad|disponible|recepcion/.test(normalized)) return { background: '#EAF2FF', border: '#BED4FF', text: '#0E5BCF' };
    return { background: '#F3F6FB', border: '#D9E2EF', text: '#475569' };
  })();

  return (
    <View style={globalStyles.screen}>
      <ScrollView 
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 12, paddingBottom: 30 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
      {/* Header unificado */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={18} color="#666" />
        <Text style={styles.backText}>Volver</Text>
      </Pressable>

      <View style={styles.headerSection}>
        <Text style={globalStyles.title}>Consulta como invitado</Text>
        <Text style={globalStyles.subtitle}>El resultado no se guardará en el dispositivo.</Text>
      </View>

      {/* Formulario fluido sin caja flotante */}
      <View style={styles.formSection}>
        {/* Selector de Courier compacto y horizontal para evitar listas eternas */}
        <View style={styles.field}>
          <Text style={styles.label}>Selecciona el Courier</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.couriersRow}>
            {Object.values(courierServices).map((option) => {
              const selected = courierId === option.id;
              return (
                <Pressable 
                  key={option.id} 
                  style={[styles.courierChip, selected && styles.courierChipSelected]} 
                  onPress={() => { setCourierId(option.id); setResult(null); setError(null); }}
                >
                  <Text style={[styles.courierChipText, selected && styles.courierChipTextSelected]}>
                    {option.name}{option.lookup ? '' : ' · Próximamente'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Número de seguimiento */}
        <View style={styles.field}>
          <Text style={styles.label}>Número de seguimiento</Text>
          <TextInput 
            style={globalStyles.input} 
            value={trackingNumber} 
            onChangeText={setTrackingNumber} 
            placeholder={service.placeholder ?? 'Ej: 3716170135'} 
            placeholderTextColor="#98A2B3"
            autoCapitalize="characters" 
          />
          {service.hint && <Text style={styles.hint}>{service.hint}</Text>}
        </View>

        <Pressable 
          style={[globalStyles.button, loading && globalStyles.buttonDisabled]} 
          onPress={startTracking} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={globalStyles.buttonText}>Rastrear pedido</Text>}
        </Pressable>
      </View>

      {/* Resultados de la consulta */}
      {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />}
      {error && <Text style={globalStyles.error}>{error}</Text>}

      {result && (
        <View style={styles.resultContainer}>
          {/* 1. Tarjeta Principal de Resumen (Determinante) */}
          <View style={globalStyles.headerCard}>
            <View style={styles.resultHeaderTop}>
              <View style={[globalStyles.statusPill, { backgroundColor: statusTone.background, borderColor: statusTone.border }]}>
                <Text style={[globalStyles.statusText, { color: statusTone.text }]}>{statusText}</Text>
              </View>
              <Text style={styles.courierBadge}>{service.name}</Text>
            </View>

            <View style={styles.codeRow}>
              <Text style={styles.trackingNumberLabel}>Seguimiento:</Text>
              <Pressable
                onPress={copyTrackingCode}
                style={styles.trackingCodeBadge}
                accessibilityLabel="Copiar número de seguimiento"
                hitSlop={6}
              >
                <Text style={styles.trackingNumberValue}>{result.trackingNumber}</Text>
                <Ionicons name="copy-outline" size={13} color={colors.primary} />
              </Pressable>
            </View>

            <View style={globalStyles.detailBox}>
              <Text style={globalStyles.detailText}>
                {result.detail || 'Sin mensaje de estado reportado por el courier.'}
              </Text>
            </View>

            {/* Ruta Origen / Destino */}
            {(result.origin || result.destination) && (
              <View style={styles.routeContainer}>
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>ORIGEN</Text>
                  <Text style={styles.routeVal}>{result.origin ?? 'Por confirmar'}</Text>
                </View>
                <View style={styles.routeDivider} />
                <View style={styles.routeCol}>
                  <Text style={styles.routeLabel}>DESTINO</Text>
                  <Text style={styles.routeVal}>{result.destination ?? 'Por confirmar'}</Text>
                </View>
              </View>
            )}
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
          {result.events && result.events.length > 0 && (
            <View style={styles.timelineSection}>
              <Text style={styles.sectionSubtitle}>Hoja de ruta del pedido</Text>
              <View style={styles.timelineCard}>
                {result.events.map((ev, index) => {
                  const isLast = index === result.events!.length - 1;
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
                })}
              </View>
            </View>
          )}

          {/* 3. Desplegable abajo de la hoja de ruta con los detalles adicionales */}
          <View style={styles.accordionContainer}>
            <Pressable
              style={styles.accordionHeader}
              onPress={() => setIsDetailsOpen(!isDetailsOpen)}
            >
              <View style={styles.accordionHeaderLeft}>
                <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
                <Text style={styles.accordionTitle}>Detalles adicionales del envío</Text>
              </View>
              <Ionicons name={isDetailsOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#667085" />
            </Pressable>

            {isDetailsOpen && (
              <View style={styles.accordionBody}>
                {Boolean(result.lastUpdated) && (
                  <View style={styles.updatedContainer}>
                    <Ionicons name="time-outline" size={13} color={colors.muted} />
                    <Text style={styles.updatedText}>Última actualización: {result.lastUpdated}</Text>
                  </View>
                )}

                {Boolean(result.info && result.info.length > 0) ? (
                  <View style={globalStyles.infoGrid}>
                    {result.info!.map((item, idx) => (
                      <View key={`${item.label}-${idx}`} style={globalStyles.infoCard}>
                        <Text style={globalStyles.infoLabel}>{item.label}</Text>
                        <Text style={globalStyles.infoValue}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noInfoText}>No hay información secundaria adicional para este courier.</Text>
                )}

                {/* Botón opcional para ver datos técnicos dentro del desplegable */}
                <Pressable
                  style={styles.rawToggleBtn}
                  onPress={() => setShowRawJson(!showRawJson)}
                >
                  <Ionicons name={showRawJson ? 'code-slash' : 'code-outline'} size={14} color="#667085" />
                  <Text style={styles.rawToggleText}>
                    {showRawJson ? 'Ocultar datos técnicos' : 'Ver datos técnicos (JSON)'}
                  </Text>
                </Pressable>

                {showRawJson && (
                  <View style={globalStyles.jsonContainer}>
                    <Text style={globalStyles.jsonTitle}>Respuesta del Courier</Text>
                    <ScrollView horizontal style={globalStyles.jsonScroll}>
                      <Text selectable style={globalStyles.jsonText}>{JSON.stringify(result.raw, null, 2)}</Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}
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
  container: {
    paddingHorizontal: 20,
    flexGrow: 1,
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
    marginBottom: 20,
    gap: 6,
  },
  formSection: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#344054',
    fontSize: 12,
    fontWeight: '600',
  },
  hint: {
    color: colors.muted,
    fontSize: 11,
  },
  couriersRow: {
    gap: 8,
    paddingVertical: 2,
  },
  courierChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  courierChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EFF5FF',
  },
  courierChipText: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '600',
  },
  courierChipTextSelected: {
    color: colors.primary,
  },
  resultContainer: {
    marginTop: 24,
    gap: 16,
  },
  resultHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courierBadge: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingNumberLabel: {
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
  trackingNumberValue: {
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
  routeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  routeCol: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 10,
    color: colors.muted,
    fontWeight: '700',
  },
  routeVal: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  routeDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#EAECF0',
    marginHorizontal: 8,
  },
  infoSection: {
    gap: 8,
  },
  sectionSubtitle: {
    color: '#344054',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  timelineSection: {
    gap: 8,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 0,
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
    marginTop: 4,
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
  updatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  updatedText: {
    color: colors.muted,
    fontSize: 11,
  },
  noInfoText: {
    color: colors.muted,
    fontSize: 12,
    fontStyle: 'italic',
  },
});